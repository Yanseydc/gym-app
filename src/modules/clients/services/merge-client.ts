"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { mergeClientRecords } from "@/modules/clients/services/client-service";
import type { ClientMergeMutationState } from "@/modules/clients/types";

export async function mergeClient(
  mainClientId: string,
  _prevState: ClientMergeMutationState,
  formData: FormData,
): Promise<ClientMergeMutationState> {
  const duplicateClientId = String(formData.get("duplicateClientId") ?? "");

  if (!duplicateClientId) {
    return {
      error: "Selecciona el cliente duplicado que quieres fusionar.",
    };
  }

  if (duplicateClientId === mainClientId) {
    return {
      error: "Selecciona dos clientes diferentes.",
    };
  }

  const supabase = await createSupabaseClient();
  const { error } = await mergeClientRecords(supabase, mainClientId, duplicateClientId);

  if (error) {
    return {
      error,
    };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${mainClientId}`);

  return {
    success: "Clientes fusionados correctamente",
  };
}
