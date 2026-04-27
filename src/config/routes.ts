import type { Role } from "@/lib/auth/roles";

export const authRoutes = ["/login"];

export const protectedRoutes = ["/dashboard", "/app"];

export const internalAppHomeRoute = "/dashboard";
export const clientAppHomeRoute = "/app";
export const defaultAuthenticatedRoute = internalAppHomeRoute;

export function getDefaultAuthenticatedRoute(role: Role): string {
  return role === "client" ? clientAppHomeRoute : internalAppHomeRoute;
}

export function isPortalRoute(pathname: string): boolean {
  return pathname === clientAppHomeRoute || pathname.startsWith(`${clientAppHomeRoute}/`);
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname === internalAppHomeRoute || pathname.startsWith(`${internalAppHomeRoute}/`);
}
