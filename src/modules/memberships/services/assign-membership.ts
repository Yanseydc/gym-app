"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  assignMembershipToClientRecord,
  assignMembershipWithPaymentRecord,
} from "@/modules/memberships/services/membership-service";
import type {
  ClientMembershipFormValues,
  ClientMembershipMutationState,
} from "@/modules/memberships/types";
import { clientMembershipFormSchema } from "@/modules/memberships/validators/client-membership";
import { paymentMethodSchema } from "@/modules/payments/validators/payment";

const KNOWN_RPC_ERROR_MESSAGES: Record<string, string> = {
  "This client already has a membership occupying that period.":
    "Este cliente ya tiene una membresía que ocupa ese período. Elige otra fecha de inicio o revisa la membresía actual.",
  "Payment amount exceeds the plan price.":
    "El monto del pago supera el precio del plan. Verifica el monto ingresado.",
  "Selected membership plan is not available.":
    "El plan de membresía seleccionado no está disponible.",
  "Client not found or not accessible.":
    "El cliente no fue encontrado o no está disponible.",
  "Client and membership plan belong to different gyms.":
    "El cliente y el plan de membresía pertenecen a gimnasios distintos.",
};

function mapAssignMembershipWithPaymentError(message: string): string {
  if (message in KNOWN_RPC_ERROR_MESSAGES) {
    return KNOWN_RPC_ERROR_MESSAGES[message];
  }

  if (message.includes("idempotency_key reused with different membership parameters")) {
    return "Esta solicitud ya fue procesada con datos de membresía distintos. Recarga la página e inténtalo de nuevo.";
  }

  if (message.includes("idempotency_key reused with different payment parameters")) {
    return "Esta solicitud ya fue procesada con datos de pago distintos. Recarga la página e inténtalo de nuevo.";
  }

  return message;
}

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    membershipPlanId: formData.get("membershipPlanId"),
    startDate: formData.get("startDate"),
    notes: formData.get("notes"),
    chargeNow: formData.get("chargeNow"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount"),
    idempotencyKey: formData.get("idempotencyKey"),
  };
}

function toClientMembershipFormValues(
  values: ReturnType<typeof clientMembershipFormSchema.parse>,
): ClientMembershipFormValues {
  return {
    membershipPlanId: values.membershipPlanId,
    startDate: values.startDate,
    notes: values.notes ?? "",
    chargeNow: values.chargeNow === "on" || values.chargeNow === "true",
    paymentMethod: values.paymentMethod ?? "",
    amount: values.amount ?? "",
    idempotencyKey: values.idempotencyKey ?? "",
  };
}

export async function assignMembershipToClient(
  clientId: string,
  _prevState: ClientMembershipMutationState,
  formData: FormData,
): Promise<ClientMembershipMutationState> {
  const parsed = clientMembershipFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const values = toClientMembershipFormValues(parsed.data);
  const supabase = await createSupabaseClient();

  if (!values.chargeNow) {
    const { error } = await assignMembershipToClientRecord(supabase, clientId, values);

    if (error) {
      return {
        error: typeof error === "string" ? error : error.message,
      };
    }

    revalidatePath(`/dashboard/clients/${clientId}`);
    revalidatePath("/dashboard/memberships");

    return {
      success:
        "Membresía asignada correctamente. Está pendiente de pago y el cliente no podrá hacer check-in hasta registrar al menos el pago requerido.",
    };
  }

  const fieldErrors: Record<string, string> = {};

  const paymentMethodResult = paymentMethodSchema.safeParse(values.paymentMethod);
  if (!paymentMethodResult.success) {
    fieldErrors.paymentMethod = "Selecciona un método de pago válido.";
  }

  const amountNumber = Number(values.amount);
  if (!values.amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
    fieldErrors.amount = "Ingresa un monto mayor a 0.";
  }

  const idempotencyKeyResult = z.string().uuid().safeParse(values.idempotencyKey);
  if (!idempotencyKeyResult.success) {
    fieldErrors.idempotencyKey = "Solicitud inválida. Recarga la página e inténtalo de nuevo.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const { data, error } = await assignMembershipWithPaymentRecord(supabase, clientId, {
    membershipPlanId: values.membershipPlanId,
    startDate: values.startDate,
    notes: values.notes,
    paymentMethod: values.paymentMethod,
    amount: amountNumber,
    idempotencyKey: values.idempotencyKey,
  });

  if (error) {
    return {
      error: mapAssignMembershipWithPaymentError(error),
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/memberships");

  const isFullyPaid = data?.status === "active";

  return {
    success: isFullyPaid
      ? "Membresía asignada y pago registrado correctamente. La membresía está activa."
      : "Membresía asignada y pago registrado correctamente. Queda un saldo pendiente antes de que el cliente pueda hacer check-in.",
  };
}
