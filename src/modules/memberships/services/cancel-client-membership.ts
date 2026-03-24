"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { cancelClientMembershipRecord } from "@/modules/memberships/services/membership-service";

export async function cancelClientMembership(clientId: string, membershipId: string) {
  const supabase = await createSupabaseClient();

  await cancelClientMembershipRecord(supabase, membershipId);

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/memberships");
}
