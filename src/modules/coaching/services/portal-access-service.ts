import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { buildPasswordRecoveryRedirectUrl } from "@/lib/app-url";
import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type { ClientPortalAccess, PortalAccessFormValues, PortalLinkedProfile } from "@/modules/coaching/types";

type ProfileLookupRow = {
  email: string;
  first_name: string | null;
  gym_id?: string | null;
  id: string;
  last_name: string | null;
  role: "super_admin" | "admin" | "staff" | "coach" | "client";
};

type ClientPortalInviteRow = {
  email: string | null;
  first_name: string;
  gym_id: string | null;
  id: string;
  last_name: string;
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
    .select(
      "profile_id, created_at, portal_invite_last_sent_at, portal_invite_send_count_today, portal_invite_send_count_date",
    )
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
      resend: {
        countDate: linkData.portal_invite_send_count_date
          ? String(linkData.portal_invite_send_count_date)
          : null,
        countToday: Number(linkData.portal_invite_send_count_today ?? 0),
        lastSentAt: linkData.portal_invite_last_sent_at
          ? String(linkData.portal_invite_last_sent_at)
          : null,
      },
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

  let clientQuery = supabase.from("clients").select("id, gym_id").eq("id", clientId);
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
      gym_id: scope.isSuperAdmin ? clientData.gym_id : scope.gymId,
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

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const perPage = 1000;
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

function canInvitePortalUser(role: string) {
  return role === "super_admin" || role === "admin" || role === "staff" || role === "coach";
}

function mapInviteError(error: string) {
  if (/client_user_links_client_id_key/.test(error)) {
    return "This client already has portal access linked.";
  }

  if (/client_user_links_profile_id_key/.test(error)) {
    return "This portal user is already linked to another client.";
  }

  return error;
}

export async function inviteClientPortalUser(
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

  if (!canInvitePortalUser(scope.role)) {
    return {
      data: null,
      error: "You do not have permission to invite clients to the portal.",
    };
  }

  let clientQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, email, gym_id")
    .eq("id", clientId);
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

  const client = clientData as ClientPortalInviteRow;
  const targetGymId = scope.isSuperAdmin ? client.gym_id : scope.gymId;

  if (!scope.isSuperAdmin && client.gym_id !== scope.gymId) {
    return {
      data: null,
      error: "Selected client is not available for your gym.",
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

  const email = values.email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name, role, gym_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    return {
      data: null,
      error: existingProfileError.message,
    };
  }

  if (existingProfile && existingProfile.role !== "client") {
    return {
      data: null,
      error: "This email belongs to a non-client user.",
    };
  }

  if (
    existingProfile?.gym_id &&
    targetGymId &&
    existingProfile.gym_id !== targetGymId
  ) {
    return {
      data: null,
      error: "This portal user belongs to another gym.",
    };
  }

  let profileId = existingProfile?.id ? String(existingProfile.id) : null;

  if (!profileId) {
    // Supabase invite/recovery templates should use {{ .ConfirmationURL }} so the
    // redirected URL includes the session hash required by /auth/update-password.
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: buildPasswordRecoveryRedirectUrl(),
      data: {
        first_name: client.first_name,
        last_name: client.last_name,
        role: "client",
        gym_id: targetGymId,
      },
    });

    if (inviteError) {
      try {
        const existingUser = await findAuthUserByEmail(email);
        profileId = existingUser?.id ?? null;
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error.message : inviteError.message,
        };
      }

      if (!profileId) {
        return {
          data: null,
          error: inviteError.message,
        };
      }
    } else {
      profileId = inviteData.user?.id ?? null;
    }
  }

  if (!profileId) {
    return {
      data: null,
      error: "Unable to create or find the portal user.",
    };
  }

  const timestamp = new Date().toISOString();
  const { error: profileUpsertError } = await admin
    .from("profiles")
    .upsert({
      id: profileId,
      email,
      first_name: client.first_name,
      last_name: client.last_name,
      role: "client",
      gym_id: targetGymId,
      created_at: timestamp,
    }, { onConflict: "id" });

  if (profileUpsertError) {
    return {
      data: null,
      error: profileUpsertError.message,
    };
  }

  const { data, error } = await admin
    .from("client_user_links")
    .insert({
      client_id: clientId,
      profile_id: profileId,
      gym_id: targetGymId,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("id")
    .single();

  if (error) {
    return {
      data: null,
      error: mapInviteError(error.message),
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
