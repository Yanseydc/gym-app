import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  canAccessPath,
  getAuthorizedHomePath,
} from "@/lib/auth/permissions";
import { authRoutes, defaultAuthenticatedRoute, protectedRoutes } from "@/config/routes";
import { clientEnv } from "@/lib/env";
import {
  getAuthenticatedUser,
  getProfileByUserId,
} from "@/modules/auth/services/auth-service";
import { updateSession } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthRoute && !isProtectedRoute) {
    return response;
  }

  const supabase = createServerClient(
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

  const user = await getAuthenticatedUser(supabase);

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = defaultAuthenticatedRoute;
    return NextResponse.redirect(url);
  }

  if (!user || !isProtectedRoute) {
    return response;
  }

  const profile = await getProfileByUserId(supabase, user.id);
  const role = profile?.role ?? "member";

  if (!canAccessPath(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = getAuthorizedHomePath(role);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
