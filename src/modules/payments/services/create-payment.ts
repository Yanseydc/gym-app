"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createPaymentRecord } from "@/modules/payments/services/payment-service";
import type { PaymentFormValues, PaymentMutationState } from "@/modules/payments/types";
import { paymentFormSchema } from "@/modules/payments/validators/payment";

function getFieldValues(
  presetClientId: string | null,
  formData: FormData,
): Record<string, FormDataEntryValue | null> {
  return {
    clientId: presetClientId ?? formData.get("clientId"),
    clientMembershipId: formData.get("clientMembershipId"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    paymentDate: formData.get("paymentDate"),
    concept: formData.get("concept"),
    notes: formData.get("notes"),
  };
}

function toPaymentFormValues(
  values: ReturnType<typeof paymentFormSchema.parse>,
): PaymentFormValues {
  return {
    clientId: values.clientId,
    clientMembershipId: values.clientMembershipId ?? "",
    amount: values.amount,
    paymentMethod: values.paymentMethod,
    paymentDate: values.paymentDate,
    concept: values.concept,
    notes: values.notes ?? "",
  };
}

export async function createPayment(
  presetClientId: string | null,
  _prevState: PaymentMutationState,
  formData: FormData,
): Promise<PaymentMutationState> {
  const parsed = paymentFormSchema.safeParse(getFieldValues(presetClientId, formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await createPaymentRecord(supabase, toPaymentFormValues(parsed.data));

  if (error) {
    return {
      error: typeof error === "string" ? error : error.message,
    };
  }

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);

  if (presetClientId) {
    redirect(`/dashboard/clients/${presetClientId}`);
  }

  redirect("/dashboard/payments");
}
