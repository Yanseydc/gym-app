"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { buildPasswordRecoveryRedirectUrl } from "@/lib/app-url";
import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { UpdatePortalAccessEmailMutationState } from "@/modules/coaching/types";
import type { AppSupabaseClient } from "@/types/supabase";

const emailSchema = z.string().trim().toLowerCase().email();

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const perPage = 1000;
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email);

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

export async function updateClientPortalAccessEmail(
  clientId: string,
  _prevState: UpdatePortalAccessEmailMutationState,
): Promise<UpdatePortalAccessEmailMutationState> {
  const supabase = (await createSupabaseClient()) as AppSupabaseClient;
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      error: scopeError ?? "Unable to resolve gym scope.",
    };
  }

  if (scope.role !== "admin" && scope.role !== "staff") {
    return {
      error: "No tienes permiso para actualizar el acceso del portal.",
    };
  }

  let clientQuery = supabase
    .from("clients")
    .select("id, email")
    .eq("id", clientId);
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

  const parsedEmail = emailSchema.safeParse(client.email ?? "");

  if (!parsedEmail.success) {
    return {
      error: "El correo del cliente no es válido.",
    };
  }

  const newEmail = parsedEmail.data;
  const { data: link, error: linkError } = await supabase
    .from("client_user_links")
    .select("id, profile_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (linkError) {
    return {
      error: linkError.message,
    };
  }

  if (!link) {
    return {
      error: "Este cliente no tiene acceso al portal vinculado.",
    };
  }

  const profileId = String(link.profile_id);
  const admin = createAdminClient();
  const { data: linkedProfile, error: linkedProfileError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", profileId)
    .maybeSingle();

  if (linkedProfileError) {
    return {
      error: linkedProfileError.message,
    };
  }

  if (!linkedProfile || linkedProfile.role !== "client") {
    return {
      error: "El acceso vinculado no pertenece a un usuario cliente.",
    };
  }

  const currentPortalEmail = String(linkedProfile.email ?? "").trim().toLowerCase();

  if (currentPortalEmail === newEmail) {
    return {
      success: "El acceso del portal ya usa el correo del cliente.",
    };
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", newEmail)
    .maybeSingle();

  if (existingProfileError) {
    return {
      error: existingProfileError.message,
    };
  }

  if (existingProfile && String(existingProfile.id) !== profileId) {
    return {
      error: "Ya existe un perfil usando ese correo.",
    };
  }

  let existingAuthUser: User | null = null;

  try {
    existingAuthUser = await findAuthUserByEmail(newEmail);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo validar el correo en Auth.",
    };
  }

  if (existingAuthUser && existingAuthUser.id !== profileId) {
    return {
      error: "Ya existe un usuario de acceso usando ese correo.",
    };
  }

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(profileId, {
    email: newEmail,
    email_confirm: true,
  });

  if (authUpdateError) {
    return {
      error: authUpdateError.message,
    };
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", profileId);

  if (profileUpdateError) {
    return {
      error: profileUpdateError.message,
    };
  }

  const timestamp = new Date().toISOString();
  const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(newEmail, {
    redirectTo: buildPasswordRecoveryRedirectUrl(),
  });

  if (recoveryError) {
    return {
      error: recoveryError.message,
    };
  }

  const { error: linkUpdateError } = await supabase
    .from("client_user_links")
    .update({
      portal_invite_last_sent_at: timestamp,
      portal_invite_send_count_date: timestamp.slice(0, 10),
      portal_invite_send_count_today: 1,
      updated_at: timestamp,
    })
    .eq("id", String(link.id));

  if (linkUpdateError) {
    return {
      error: linkUpdateError.message,
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);

  return {
    success: `Acceso del portal actualizado. Enviamos un correo de recuperación a ${newEmail}.`,
  };
}
