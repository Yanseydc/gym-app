import type { Role } from "@/lib/auth/roles";
import type { AppSupabaseClient } from "@/types/supabase";

export type GymScope = {
  id: string;
  role: Role;
  gymId: string | null;
  isSuperAdmin: boolean;
};

type ScopedQuery<T> = {
  eq: (column: string, value: string) => T;
};

export async function getCurrentGymScope(
  supabase: AppSupabaseClient,
): Promise<{ data: GymScope | null; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { data: null, error: userError.message };
  }

  if (!user) {
    return { data: null, error: "Authentication required." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, gym_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  if (!profile) {
    return { data: null, error: "Profile not found." };
  }

  const role = profile.role as Role;
  const gymId = profile.gym_id ? String(profile.gym_id) : null;

  return {
    data: {
      id: String(profile.id),
      role,
      gymId,
      isSuperAdmin: role === "super_admin",
    },
    error: null,
  };
}

export async function requireGymScope(
  supabase: AppSupabaseClient,
): Promise<{ data: GymScope | null; error: string | null }> {
  const result = await getCurrentGymScope(supabase);

  if (result.error || !result.data) {
    return result;
  }

  if (!result.data.isSuperAdmin && !result.data.gymId) {
    return {
      data: null,
      error: "Your profile is not assigned to a gym.",
    };
  }

  return result;
}

export function applyGymScope<T extends ScopedQuery<T>>(query: T, scope: GymScope) {
  return scope.isSuperAdmin ? query : query.eq("gym_id", scope.gymId ?? "");
}

export function withGymId<T extends Record<string, unknown>>(payload: T, scope: GymScope) {
  return scope.isSuperAdmin ? payload : { ...payload, gym_id: scope.gymId };
}
