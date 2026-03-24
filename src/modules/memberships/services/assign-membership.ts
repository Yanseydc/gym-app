"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  assignMembershipToClientRecord,
} from "@/modules/memberships/services/membership-service";
import type {
  ClientMembershipFormValues,
  ClientMembershipMutationState,
} from "@/modules/memberships/types";
import { clientMembershipFormSchema } from "@/modules/memberships/validators/client-membership";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    membershipPlanId: formData.get("membershipPlanId"),
    startDate: formData.get("startDate"),
    notes: formData.get("notes"),
  };
}

function toClientMembershipFormValues(
  values: ReturnType<typeof clientMembershipFormSchema.parse>,
): ClientMembershipFormValues {
  return {
    membershipPlanId: values.membershipPlanId,
    startDate: values.startDate,
    notes: values.notes ?? "",
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

  const supabase = await createSupabaseClient();
  const { error } = await assignMembershipToClientRecord(
    supabase,
    clientId,
    toClientMembershipFormValues(parsed.data),
  );

  if (error) {
    return {
      error: typeof error === "string" ? error : error.message,
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/memberships");

  return {};
}
