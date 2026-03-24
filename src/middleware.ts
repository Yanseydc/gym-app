import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { dashboardRoles } from "@/lib/auth/roles";
import { authRoutes } from "@/config/routes";
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
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!isAuthRoute && !isDashboardRoute) {
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

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user || !isDashboardRoute) {
    return response;
  }

  const profile = await getProfileByUserId(supabase, user.id);

  if (profile?.role && !dashboardRoles.includes(profile.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
