"use server";

import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { buildPasswordRecoveryRedirectUrl } from "@/lib/app-url";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ResendPortalAccessMutationState } from "@/modules/coaching/types";
import type { AppSupabaseClient } from "@/types/supabase";

const RESEND_COOLDOWN_MS = 15 * 60 * 1000;
const MAX_RESENDS_PER_DAY = 3;

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

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
    .select(
      "id, profile_id, portal_invite_last_sent_at, portal_invite_send_count_today, portal_invite_send_count_date",
    )
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

  const now = new Date();
  const today = getDateKey(now);
  const lastSentAt = link.portal_invite_last_sent_at
    ? new Date(String(link.portal_invite_last_sent_at))
    : null;

  if (lastSentAt && now.getTime() - lastSentAt.getTime() <= RESEND_COOLDOWN_MS) {
    const nextAllowedAt = new Date(lastSentAt.getTime() + RESEND_COOLDOWN_MS);

    return {
      cooldownRemainingSeconds: Math.max(1, Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 1000)),
      error: "Espera unos minutos antes de reenviar el acceso.",
      nextAllowedAt: nextAllowedAt.toISOString(),
    };
  }

  const countDate = link.portal_invite_send_count_date
    ? String(link.portal_invite_send_count_date)
    : null;
  const currentCount = countDate === today
    ? Number(link.portal_invite_send_count_today ?? 0)
    : 0;

  if (currentCount >= MAX_RESENDS_PER_DAY) {
    return {
      error: "Ya se alcanzó el límite de reenvíos por hoy.",
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

  const timestamp = now.toISOString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildPasswordRecoveryRedirectUrl(),
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  const { error: updateError } = await supabase
    .from("client_user_links")
    .update({
      portal_invite_last_sent_at: timestamp,
      portal_invite_send_count_date: today,
      portal_invite_send_count_today: currentCount + 1,
      updated_at: timestamp,
    })
    .eq("id", String(link.id));

  if (updateError) {
    return {
      error: updateError.message,
    };
  }

  return {
    cooldownRemainingSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    nextAllowedAt: new Date(now.getTime() + RESEND_COOLDOWN_MS).toISOString(),
    success: "Correo enviado",
  };
}
