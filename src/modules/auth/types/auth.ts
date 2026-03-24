import type { User } from "@supabase/supabase-js";

import type { Role } from "@/lib/auth/roles";

export type AuthProfile = {
  firstName: string | null;
  lastName: string | null;
  role: Role;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  profile: AuthProfile;
  user: User;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInState = {
  error?: string;
};
