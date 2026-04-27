import { cache } from "react";

import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type { ClientPortalAccess, PortalAccessFormValues, PortalLinkedProfile } from "@/modules/coaching/types";

type ProfileLookupRow = {
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  role: "super_admin" | "admin" | "staff" | "coach" | "client";
};

function mapPortalProfile(row: ProfileLookupRow): PortalLinkedProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
  };
}

export async function getPortalAccessByClientId(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientPortalAccess | null; error: string | null }> {
  const { data: linkData, error: linkError } = await supabase
    .from("client_user_links")
    .select("profile_id, created_at")
    .eq("client_id", clientId)
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

  const { data: profileRows, error: profileError } = await supabase.rpc(
    "lookup_portal_profile_by_id",
    {
      target_profile_id: String(linkData.profile_id),
    },
  );

  if (profileError) {
    return {
      data: null,
      error: profileError.message,
    };
  }

  const profile = (profileRows?.[0] as ProfileLookupRow | undefined) ?? null;

  if (!profile) {
    return {
      data: null,
      error: null,
    };
  }

  return {
    data: {
      clientId,
      linkedAt: String(linkData.created_at),
      profile: mapPortalProfile(profile),
    },
    error: null,
  };
}

export async function lookupPortalProfileByEmail(
  supabase: AppSupabaseClient,
  email: string,
): Promise<{ data: PortalLinkedProfile | null; error: string | null }> {
  const { data, error } = await supabase.rpc("lookup_portal_profile_by_email", {
    target_email: email.trim(),
  });

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  const profile = (data?.[0] as ProfileLookupRow | undefined) ?? null;

  return {
    data: profile ? mapPortalProfile(profile) : null,
    error: null,
  };
}

export async function createClientUserLinkRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: PortalAccessFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: null,
      error: scopeError ?? "Unable to resolve gym scope.",
    };
  }

  let clientQuery = supabase.from("clients").select("id").eq("id", clientId);
  clientQuery = applyGymScope(clientQuery, scope);
  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return {
      data: null,
      error: clientError.message,
    };
  }

  if (!clientData) {
    return {
      data: null,
      error: "Selected client is not available.",
    };
  }

  const existingLink = await getPortalAccessByClientId(supabase, clientId);

  if (existingLink.error) {
    return {
      data: null,
      error: existingLink.error,
    };
  }

  if (existingLink.data) {
    return {
      data: null,
      error: "This client already has portal access linked.",
    };
  }

  const { data: profile, error: profileError } = await lookupPortalProfileByEmail(
    supabase,
    values.email,
  );

  if (profileError) {
    return {
      data: null,
      error: profileError,
    };
  }

  if (!profile) {
    return {
      data: null,
      error: "No portal user found with that email. The user must sign in at least once first.",
    };
  }

  if (profile.role !== "client") {
    return {
      data: null,
      error: "Only client profiles can be linked to the client portal.",
    };
  }

  const { data, error } = await supabase
    .from("client_user_links")
    .insert({
      client_id: clientId,
      profile_id: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (/client_user_links_client_id_key/.test(error.message)) {
      return {
        data: null,
        error: "This client already has portal access linked.",
      };
    }

    if (/client_user_links_profile_id_key/.test(error.message)) {
      return {
        data: null,
        error: "This portal user is already linked to another client.",
      };
    }

    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data,
    error: null,
  };
}

export const getPortalAccessForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return getPortalAccessByClientId(supabase, clientId);
});
