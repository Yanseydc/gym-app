"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  createMembershipPlanRecord,
} from "@/modules/memberships/services/membership-service";
import type {
  MembershipPlanFormValues,
  MembershipPlanMutationState,
} from "@/modules/memberships/types";
import { membershipPlanFormSchema } from "@/modules/memberships/validators/membership-plan";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    name: formData.get("name"),
    durationInDays: formData.get("durationInDays"),
    price: formData.get("price"),
    description: formData.get("description"),
    isActive: formData.get("isActive") ?? "false",
  };
}

function toMembershipPlanFormValues(
  values: ReturnType<typeof membershipPlanFormSchema.parse>,
): MembershipPlanFormValues {
  return {
    name: values.name,
    durationInDays: values.durationInDays,
    price: values.price,
    description: values.description ?? "",
    isActive: values.isActive,
  };
}

export async function createMembershipPlan(
  _prevState: MembershipPlanMutationState,
  formData: FormData,
): Promise<MembershipPlanMutationState> {
  const parsed = membershipPlanFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await createMembershipPlanRecord(
    supabase,
    toMembershipPlanFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to create membership plan.",
    };
  }

  revalidatePath("/dashboard/memberships");
  redirect(`/dashboard/memberships/${data.id}`);
}
