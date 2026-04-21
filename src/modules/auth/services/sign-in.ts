"use server";

import { redirect } from "next/navigation";

import { getDefaultAuthenticatedRoute } from "@/config/routes";
import { createClient } from "@/lib/supabase/server";
import type { SignInState } from "@/modules/auth/types";
import { getProfileByUserId } from "@/modules/auth/services/auth-service";
import { signInSchema } from "@/modules/auth/validators/sign-in";
import { signInWithEmailPassword } from "@/modules/auth/services/auth-service";

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Credenciales inválidas.",
    };
  }

  const supabase = await createClient();
  const { error } = await signInWithEmailPassword(supabase, parsed.data);

  if (error) {
    return {
      error: error.message,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileByUserId(supabase, user.id) : null;
  const role = profile?.role ?? "member";

  redirect(getDefaultAuthenticatedRoute(role));
}
