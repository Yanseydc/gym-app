"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createCheckInRecord } from "@/modules/checkins/services/checkin-service";
import type { CheckInFormValues, CheckInMutationState } from "@/modules/checkins/types";
import { checkInFormSchema } from "@/modules/checkins/validators/checkin";

function toCheckInFormValues(
  values: ReturnType<typeof checkInFormSchema.parse>,
): CheckInFormValues {
  return {
    notes: values.notes ?? "",
  };
}

export async function createCheckIn(
  clientId: string,
  _prevState: CheckInMutationState,
  formData: FormData,
): Promise<CheckInMutationState> {
  const parsed = checkInFormSchema.safeParse({
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await createCheckInRecord(supabase, clientId, toCheckInFormValues(parsed.data));

  if (error) {
    return {
      error: typeof error === "string" ? error : error.message,
    };
  }

  revalidatePath("/dashboard/checkins");
  revalidatePath(`/dashboard/clients/${clientId}`);

  return {};
}
