"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { inviteClientPortalUser } from "@/modules/coaching/services/portal-access-service";
import type { PortalAccessFormValues, PortalAccessMutationState } from "@/modules/coaching/types";
import { portalAccessFormSchema } from "@/modules/coaching/validators/portal-access";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    email: formData.get("email"),
  };
}

function toPortalAccessFormValues(
  values: ReturnType<typeof portalAccessFormSchema.parse>,
): PortalAccessFormValues {
  return {
    email: values.email,
  };
}

export async function createPortalAccess(
  clientId: string,
  _prevState: PortalAccessMutationState,
  formData: FormData,
): Promise<PortalAccessMutationState> {
  const parsed = portalAccessFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await inviteClientPortalUser(
    supabase,
    clientId,
    toPortalAccessFormValues(parsed.data),
  );

  if (error) {
    return {
      error,
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}`);
}
