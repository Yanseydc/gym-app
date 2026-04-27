import type { Role } from "@/lib/auth/roles";
import { clientAppHomeRoute, isPortalRoute } from "@/config/routes";

export const appModules = [
  "dashboard",
  "clients",
  "coaching",
  "memberships",
  "payments",
  "checkins",
  "classes",
] as const;

export type AppModule = (typeof appModules)[number];

export const rolePermissions: Record<Role, AppModule[]> = {
  super_admin: ["dashboard", "clients", "coaching", "memberships", "payments", "checkins", "classes"],
  admin: ["dashboard", "clients", "coaching", "memberships", "payments", "checkins", "classes"],
  staff: ["dashboard", "clients", "coaching", "memberships", "payments", "checkins"],
  coach: ["clients", "coaching"],
  client: [],
};

export const moduleRoutes: Record<AppModule, string[]> = {
  dashboard: ["/dashboard"],
  clients: ["/dashboard/clients", "/dashboard/members"],
  coaching: ["/dashboard/coaching"],
  memberships: ["/dashboard/memberships"],
  payments: ["/dashboard/payments"],
  checkins: ["/dashboard/checkins"],
  classes: ["/dashboard/classes"],
};

export function getAllowedModules(role: Role): AppModule[] {
  return rolePermissions[role] ?? [];
}

export function hasModuleAccess(role: Role, module: AppModule): boolean {
  return getAllowedModules(role).includes(module);
}

export function getAuthorizedHomePath(role: Role): string {
  if (role === "client") {
    return clientAppHomeRoute;
  }

  const [firstModule] = getAllowedModules(role);

  if (!firstModule) {
    return "/";
  }

  return moduleRoutes[firstModule][0];
}

export function getModuleByPath(pathname: string): AppModule | null {
  const matchedModule = appModules.find((module) =>
    moduleRoutes[module].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ),
  );

  return matchedModule ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "client") {
    return isPortalRoute(pathname);
  }

  const module = getModuleByPath(pathname);

  if (!module) {
    return false;
  }

  return hasModuleAccess(role, module);
}
