"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { updatePaymentRecord } from "@/modules/payments/services/payment-service";
import type {
  PaymentEditFormValues,
  PaymentEditMutationState,
} from "@/modules/payments/types";
import { paymentEditFormSchema } from "@/modules/payments/validators/payment";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    concept: formData.get("concept"),
    notes: formData.get("notes"),
  };
}

function toPaymentEditFormValues(
  values: ReturnType<typeof paymentEditFormSchema.parse>,
): PaymentEditFormValues {
  return {
    concept: values.concept,
    notes: values.notes ?? "",
  };
}

export async function updatePayment(
  paymentId: string,
  _prevState: PaymentEditMutationState,
  formData: FormData,
): Promise<PaymentEditMutationState> {
  const parsed = paymentEditFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await updatePaymentRecord(
    supabase,
    paymentId,
    toPaymentEditFormValues(parsed.data),
  );

  if (error) {
    return {
      error: typeof error === "string" ? error : error.message,
    };
  }

  revalidatePath("/dashboard/payments");

  if (data?.client_id) {
    revalidatePath(`/dashboard/clients/${data.client_id}`);
  }

  redirect("/dashboard/payments");
}
