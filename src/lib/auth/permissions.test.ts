// Run with: npx tsx --test src/lib/auth/permissions.test.ts
// Pure module - no env vars needed.
//
// Hotfix regression coverage: getModuleByPath used to pick the FIRST
// matching module in appModules' declaration order (via Array.find),
// which misclassified any nested path under a shorter module route --
// "/dashboard/clients" matched "dashboard" (route "/dashboard") before
// ever reaching "clients" (route "/dashboard/clients"), since "dashboard"
// is declared first and its route is a valid string-prefix of the path.
// That made canAccessPath("coach", "/dashboard/clients") false (coach has
// no "dashboard" module), which made the middleware redirect coach to its
// own authorized home path ("/dashboard/clients") forever.
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Role } from "@/lib/auth/roles";
import { roles } from "@/lib/auth/roles";
import {
  appModules,
  canAccessPath,
  getAllowedModules,
  getAuthorizedHomePath,
  getModuleByPath,
  hasModuleAccess,
  moduleRoutes,
  rolePermissions,
  type AppModule,
} from "@/lib/auth/permissions";

// --- every base route in moduleRoutes resolves to its own module ---
test("every base route in moduleRoutes resolves to its declared module", () => {
  for (const appModule of appModules) {
    for (const route of moduleRoutes[appModule]) {
      assert.equal(getModuleByPath(route), appModule, `${route} should resolve to ${appModule}`);
    }
  }
});

// --- at least one nested subroute per module ---
test("at least one nested subroute per module resolves to its module", () => {
  const nestedSamples: Record<AppModule, string> = {
    dashboard: "/dashboard/settings", // unmapped nested path -- falls back to the root "dashboard" module
    clients: "/dashboard/clients/00000000-0000-0000-0000-000000000000/edit",
    coaching: "/dashboard/coaching/routines/00000000-0000-0000-0000-000000000000/edit",
    memberships: "/dashboard/memberships/00000000-0000-0000-0000-000000000000/edit",
    payments: "/dashboard/payments/00000000-0000-0000-0000-000000000000/edit",
    checkins: "/dashboard/checkins/today",
    classes: "/dashboard/classes/00000000-0000-0000-0000-000000000000",
  };

  for (const appModule of appModules) {
    assert.equal(getModuleByPath(nestedSamples[appModule]), appModule);
  }

  // The second "clients" base route (moduleRoutes.clients also lists
  // "/dashboard/members") gets its own nested-subroute check too.
  assert.equal(getModuleByPath("/dashboard/members/00000000-0000-0000-0000-000000000000"), "clients");
});

// --- a similar-but-invalid path must never match a shorter module by accident ---
test("a similar but invalid path does not match clients (segment boundaries are preserved)", () => {
  assert.notEqual(getModuleByPath("/dashboard/clients-extra"), "clients");
  // It legitimately falls under the root "dashboard" module (no other
  // module claims it) -- the requirement is only that it must not be
  // misread as "clients", not that it resolves to null.
  assert.equal(getModuleByPath("/dashboard/clients-extra"), "dashboard");
});

test("unknown, unrelated paths keep returning null (unchanged safe behavior)", () => {
  assert.equal(getModuleByPath("/completely-unknown"), null);
  assert.equal(getModuleByPath("/"), null);
  assert.equal(getModuleByPath("/app"), null);
});

// --- the exact regression: nested dashboard paths must not be swallowed
// by the "dashboard" module just because it is declared first ---
test("regresion: /dashboard/clients resolves to clients, not dashboard, despite dashboard being declared first in appModules", () => {
  assert.equal(appModules[0], "dashboard", "this test only means something if dashboard really is first");
  assert.equal(getModuleByPath("/dashboard/clients"), "clients");
  assert.equal(getModuleByPath("/dashboard/coaching"), "coaching");
});

// --- order-independence: getModuleByPath has no order-dependent
// parameter to inject a reordered module list into without changing its
// public signature, so this is proven the strongest way available without
// deforming the API: the real appModules array is NOT reordered/mutated
// (see the two `assert.notEqual`/array-identity checks below), yet the
// most specific route still wins over the first-declared one. ---
test("result does not depend on appModules declaration order, and appModules/moduleRoutes are never mutated", () => {
  const appModulesBefore = [...appModules];
  const moduleRoutesBefore = JSON.parse(JSON.stringify(moduleRoutes)) as typeof moduleRoutes;

  getModuleByPath("/dashboard/clients/anything");
  getModuleByPath("/dashboard/coaching/anything");
  getModuleByPath("/dashboard");

  assert.deepEqual([...appModules], appModulesBefore, "appModules must not be mutated");
  assert.deepEqual(moduleRoutes, moduleRoutesBefore, "moduleRoutes must not be mutated");
  // dashboard is declared first yet loses to the more specific "clients"
  // match -- this is the actual, exercised proof of order-independence.
  assert.equal(getModuleByPath("/dashboard/clients"), "clients");
});

// --- getAuthorizedHomePath(role) must always be self-accessible ---
test("getAuthorizedHomePath(role) always produces a path that canAccessPath(role, path) allows, for every role", () => {
  for (const role of roles) {
    const home = getAuthorizedHomePath(role);
    assert.equal(
      canAccessPath(role, home),
      true,
      `role ${role}'s authorized home path (${home}) must be accessible to it`,
    );
  }
});

// --- coach: explicit allow-list ---
test("coach can access /dashboard/clients, a client subroute, /dashboard/coaching, and a routine subroute", () => {
  assert.equal(canAccessPath("coach", "/dashboard/clients"), true);
  assert.equal(canAccessPath("coach", "/dashboard/clients/00000000-0000-0000-0000-000000000000/edit"), true);
  assert.equal(canAccessPath("coach", "/dashboard/coaching"), true);
  assert.equal(
    canAccessPath("coach", "/dashboard/coaching/routines/00000000-0000-0000-0000-000000000000/edit"),
    true,
  );
});

// --- coach: explicit deny-list, and no new permission was invented to fix this ---
test("coach cannot access the general dashboard, memberships, payments, checkins, or classes", () => {
  assert.equal(canAccessPath("coach", "/dashboard"), false);
  assert.equal(canAccessPath("coach", "/dashboard/memberships"), false);
  assert.equal(canAccessPath("coach", "/dashboard/payments"), false);
  assert.equal(canAccessPath("coach", "/dashboard/checkins"), false);
  assert.equal(canAccessPath("coach", "/dashboard/classes"), false);
  assert.deepEqual(
    rolePermissions.coach,
    ["clients", "coaching"],
    "the hotfix must not grant coach any additional module",
  );
});

// --- admin / staff: no regressions, full parity with their declared modules ---
test("admin and staff have no regressions: access matches their declared rolePermissions exactly", () => {
  const rolesToCheck: Role[] = ["admin", "staff"];
  for (const role of rolesToCheck) {
    for (const appModule of appModules) {
      const [sampleRoute] = moduleRoutes[appModule];
      const expected = hasModuleAccess(role, appModule);
      assert.equal(
        canAccessPath(role, sampleRoute),
        expected,
        `${role} accessing ${sampleRoute} (module ${appModule}) should be ${expected}`,
      );
    }
  }
});

// --- client: only its own portal routes ---
test("client retains only its own /app routes and nothing under /dashboard", () => {
  assert.equal(canAccessPath("client", "/app"), true);
  assert.equal(canAccessPath("client", "/app/routine"), true);
  assert.equal(canAccessPath("client", "/dashboard"), false);
  assert.equal(canAccessPath("client", "/dashboard/clients"), false);
  assert.deepEqual(getAllowedModules("client"), []);
});

// --- super_admin: retains full access to every module ---
test("super_admin retains access to every module", () => {
  for (const appModule of appModules) {
    assert.equal(hasModuleAccess("super_admin", appModule), true, `super_admin should have ${appModule}`);
    const [sampleRoute] = moduleRoutes[appModule];
    assert.equal(canAccessPath("super_admin", sampleRoute), true);
  }
});
