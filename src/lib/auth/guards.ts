import { redirect } from "next/navigation";

import type { Role } from "@/lib/auth/roles";
import { canAccessPath, getAuthorizedHomePath, hasModuleAccess } from "@/lib/auth/permissions";

export function ensureModuleAccess(role: Role, module: Parameters<typeof hasModuleAccess>[1]) {
  if (!hasModuleAccess(role, module)) {
    redirect(getAuthorizedHomePath(role));
  }
}

export function ensurePathAccess(role: Role, pathname: string) {
  if (!canAccessPath(role, pathname)) {
    redirect(getAuthorizedHomePath(role));
  }
}
