import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/roles";
import type { Database } from "@/types/database";
import type { AppSupabaseClient } from "@/types/supabase";
import type { AuthProfile, AuthUser, SignInInput } from "@/modules/auth/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileSnapshot = Pick<ProfileRow, "first_name" | "last_name" | "role">;

export async function signInWithEmailPassword(
  supabase: AppSupabaseClient,
  input: SignInInput,
) {
  return supabase.auth.signInWithPassword(input);
}

export async function getAuthenticatedUser(supabase: AppSupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfileByUserId(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AuthProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as ProfileSnapshot | null;

  if (!profile) {
    return null;
  }

  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
  };
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user?.email) {
    return null;
  }

  const profile = await getProfileByUserId(supabase, user.id);
  const role: Role = profile?.role ?? "client";

  return {
    id: user.id,
    email: user.email,
    role,
    profile: {
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      role,
    },
    user,
  };
});
