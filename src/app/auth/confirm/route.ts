import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clientEnv } from "@/lib/env-client";
import { passwordRecoverySessionCookie } from "@/modules/auth/constants/recovery";
import type { Database } from "@/types/database";

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/auth/update-password";
  }

  return value;
}

function getUpdatePasswordUrl(request: NextRequest, error?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/update-password";
  url.search = "";

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(getUpdatePasswordUrl(request, "invalid_recovery"));
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = nextPath;
  redirectUrl.search = "";
  const response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error || !data.user) {
    return NextResponse.redirect(getUpdatePasswordUrl(request, "invalid_recovery"));
  }

  response.cookies.set(passwordRecoverySessionCookie, data.user.id, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/auth/update-password",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
