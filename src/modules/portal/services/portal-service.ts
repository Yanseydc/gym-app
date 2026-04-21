import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type { LinkedPortalClient } from "@/modules/portal/types";

export async function getLinkedClientByProfileId(
  supabase: AppSupabaseClient,
  profileId: string,
): Promise<{ data: LinkedPortalClient | null; error: string | null }> {
  const { data: linkData, error: linkError } = await supabase
    .from("client_user_links")
    .select("client_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (linkError) {
    return {
      data: null,
      error: linkError.message,
    };
  }

  if (!linkData) {
    return {
      data: null,
      error: null,
    };
  }

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("id", String(linkData.client_id))
    .maybeSingle();

  if (clientError) {
    return {
      data: null,
      error: clientError.message,
    };
  }

  if (!clientData) {
    return {
      data: null,
      error: null,
    };
  }

  return {
    data: {
      clientId: String(clientData.id),
      firstName: String(clientData.first_name),
      lastName: String(clientData.last_name),
    },
    error: null,
  };
}

export const getLinkedClientForCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: null,
    };
  }

  return getLinkedClientByProfileId(supabase, user.id);
});
