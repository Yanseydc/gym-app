import type { Role } from "@/lib/auth/roles";

export const authRoutes = ["/login"];

export const protectedRoutes = ["/dashboard", "/app"];

export const internalAppHomeRoute = "/dashboard";
export const memberAppHomeRoute = "/app";
export const defaultAuthenticatedRoute = internalAppHomeRoute;

export function getDefaultAuthenticatedRoute(role: Role): string {
  return role === "member" ? memberAppHomeRoute : internalAppHomeRoute;
}

export function isPortalRoute(pathname: string): boolean {
  return pathname === memberAppHomeRoute || pathname.startsWith(`${memberAppHomeRoute}/`);
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname === internalAppHomeRoute || pathname.startsWith(`${internalAppHomeRoute}/`);
}
