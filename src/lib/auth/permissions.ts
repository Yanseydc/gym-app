import type { Role } from "@/lib/auth/roles";

export const appModules = [
  "dashboard",
  "clients",
  "memberships",
  "payments",
  "classes",
] as const;

export type AppModule = (typeof appModules)[number];

export const rolePermissions: Record<Role, AppModule[]> = {
  admin: ["dashboard", "clients", "memberships", "payments", "classes"],
  staff: ["dashboard", "clients", "memberships", "payments"],
  coach: ["dashboard"],
  member: [],
};

export const moduleRoutes: Record<AppModule, string[]> = {
  dashboard: ["/dashboard"],
  clients: ["/dashboard/members"],
  memberships: ["/dashboard/memberships"],
  payments: ["/dashboard/payments"],
  classes: ["/dashboard/classes"],
};

export function getAllowedModules(role: Role): AppModule[] {
  return rolePermissions[role] ?? [];
}

export function hasModuleAccess(role: Role, module: AppModule): boolean {
  return getAllowedModules(role).includes(module);
}

export function getAuthorizedHomePath(role: Role): string {
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
  const module = getModuleByPath(pathname);

  if (!module) {
    return false;
  }

  return hasModuleAccess(role, module);
}
