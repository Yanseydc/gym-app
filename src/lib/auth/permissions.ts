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

/** Picks the MOST SPECIFIC matching route across every module, not the
 * first module encountered in `appModules` -- `.find()` on that array used
 * to return "dashboard" (route "/dashboard") for a path like
 * "/dashboard/clients", since "/dashboard/clients" starts with
 * "/dashboard/" and "dashboard" is listed first. That misclassified every
 * nested dashboard path for any role missing "dashboard" itself from its
 * allowed modules (coach: ["clients","coaching"]), which made
 * canAccessPath reject the role's own authorized home path and the
 * middleware redirect to it in an infinite loop. Comparing match length
 * (not array position) makes the result independent of appModules' order
 * and never mutates it or moduleRoutes -- this only reads them. */
export function getModuleByPath(pathname: string): AppModule | null {
  let best: { module: AppModule; route: string } | null = null;

  for (const appModule of appModules) {
    for (const route of moduleRoutes[appModule]) {
      const matches = pathname === route || pathname.startsWith(`${route}/`);
      if (!matches) {
        continue;
      }
      if (!best || route.length > best.route.length) {
        best = { module: appModule, route };
      }
    }
  }

  return best?.module ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "client") {
    return isPortalRoute(pathname);
  }

  const appModule = getModuleByPath(pathname);

  if (!appModule) {
    return false;
  }

  return hasModuleAccess(role, appModule);
}
