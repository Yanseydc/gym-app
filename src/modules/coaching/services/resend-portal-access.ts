"use server";

import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ResendPortalAccessMutationState } from "@/modules/coaching/types";
import type { AppSupabaseClient } from "@/types/supabase";

export async function resendClientPortalAccess(
  clientId: string,
  _prevState: ResendPortalAccessMutationState,
): Promise<ResendPortalAccessMutationState> {
  const supabase = (await createSupabaseClient()) as AppSupabaseClient;
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      error: scopeError ?? "Unable to resolve gym scope.",
    };
  }

  if (scope.role !== "admin" && scope.role !== "staff") {
    return {
      error: "You do not have permission to resend portal access.",
    };
  }

  let clientQuery = supabase.from("clients").select("id").eq("id", clientId);
  clientQuery = applyGymScope(clientQuery, scope);
  const { data: client, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return {
      error: clientError.message,
    };
  }

  if (!client) {
    return {
      error: "Selected client is not available.",
    };
  }

  const { data: link, error: linkError } = await supabase
    .from("client_user_links")
    .select("profile_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (linkError) {
    return {
      error: linkError.message,
    };
  }

  if (!link) {
    return {
      error: "This client does not have portal access linked.",
    };
  }

  const { data: profileRows, error: profileError } = await supabase.rpc(
    "lookup_portal_profile_by_id",
    {
      target_profile_id: String(link.profile_id),
    },
  );

  if (profileError) {
    return {
      error: profileError.message,
    };
  }

  const profile = profileRows?.[0];
  const email = profile?.email.trim();

  if (!email || profile?.role !== "client") {
    return {
      error: "Portal client email is not available.",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return {
      error: "Application URL is not configured.",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/update-password`,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Correo enviado",
  };
}
