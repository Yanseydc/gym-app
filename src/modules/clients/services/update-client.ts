"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ClientFormValues, ClientMutationState } from "@/modules/clients/types";
import { updateClientRecord } from "@/modules/clients/services/client-service";
import { clientFormSchema } from "@/modules/clients/validators/client";

function getFieldValues(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  };
}

function toClientFormValues(
  values: ReturnType<typeof clientFormSchema.parse>,
): ClientFormValues {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    email: values.email ?? "",
    status: values.status,
    notes: values.notes ?? "",
  };
}

export async function updateClient(
  clientId: string,
  _prevState: ClientMutationState,
  formData: FormData,
): Promise<ClientMutationState> {
  const parsed = clientFormSchema.safeParse(getFieldValues(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await updateClientRecord(
    supabase,
    clientId,
    toClientFormValues(parsed.data),
  );

  if (error || !data) {
    return {
      error: error?.message ?? "Unable to update client.",
    };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${data.id}`);
}
