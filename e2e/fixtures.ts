// Fixture helpers for the Entrega A0 Playwright suite. Reuses the same
// service-role REST helpers as supabase/tests/*.integration.test.ts --
// real gyms/clients/routines against a running LOCAL Supabase stack only.
// Never point this at a remote/production project.

import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";

import { adminRequest, createAuthUser, deleteAuthUser } from "../supabase/tests/helpers";

export const COACH_PASSWORD = "TestPass123!";

export type RoutineFixture = {
  gymId: string;
  coachUserId: string;
  coachEmail: string;
  clientId: string;
  clientName: string;
};

/** Creates a gym + a coach-role profile (able to log into /dashboard and
 * reach the coaching module) + a client. Each call uses a fresh random
 * suffix so parallel/sequential spec files never collide. */
export async function createGymFixture(label: string): Promise<RoutineFixture> {
  const suffix = randomUUID().slice(0, 8);

  const [gym] = (await adminRequest("/rest/v1/gyms", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: `E2E ${label} Gym ${suffix}` }),
  })) as Array<{ id: string }>;
  const gymId = gym.id;

  const coachEmail = `e2e-${label}-coach-${suffix}@test.local`;
  const coachUserId = await createAuthUser(coachEmail, COACH_PASSWORD);

  await adminRequest("/rest/v1/profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ id: coachUserId, email: coachEmail, role: "admin", gym_id: gymId }),
  });

  const firstName = "E2E";
  const lastName = `Client ${suffix}`;
  const [client] = (await adminRequest("/rest/v1/clients", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ gym_id: gymId, first_name: firstName, last_name: lastName, phone: "5555550100" }),
  })) as Array<{ id: string }>;

  return {
    gymId,
    coachUserId,
    coachEmail,
    clientId: client.id,
    clientName: `${firstName} ${lastName}`,
  };
}

export async function deleteGymFixture(fixture: RoutineFixture) {
  await adminRequest(`/rest/v1/client_routines?client_id=eq.${fixture.clientId}`, { method: "DELETE" });
  await adminRequest(`/rest/v1/clients?id=eq.${fixture.clientId}`, { method: "DELETE" });
  await adminRequest(`/rest/v1/profiles?id=eq.${fixture.coachUserId}`, { method: "DELETE" });
  await deleteAuthUser(fixture.coachUserId);
  // withDayAndExercise (createRoutine) creates gym-owned exercise_library
  // rows that must be gone before the gym itself can be deleted (FK).
  await adminRequest(`/rest/v1/exercise_library?gym_id=eq.${fixture.gymId}`, { method: "DELETE" });
  await adminRequest(`/rest/v1/gyms?id=eq.${fixture.gymId}`, { method: "DELETE" });
}

type CreateRoutineOptions = {
  title: string;
  status?: "draft" | "active" | "archived";
  withDayAndExercise?: boolean;
};

/** Creates a client_routine directly via REST (bypassing the builder UI --
 * the builder itself is pre-existing 1A functionality this Entrega does not
 * change). Optionally seeds one day + one exercise so the routine's detail
 * view has real content. */
export async function createRoutine(fixture: RoutineFixture, options: CreateRoutineOptions): Promise<string> {
  const [routine] = (await adminRequest("/rest/v1/client_routines", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      gym_id: fixture.gymId,
      client_id: fixture.clientId,
      title: options.title,
      status: options.status ?? "draft",
    }),
  })) as Array<{ id: string }>;
  const routineId = routine.id;

  if (options.withDayAndExercise) {
    const suffix = randomUUID().slice(0, 8);
    const [day] = (await adminRequest("/rest/v1/client_routine_days", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ client_routine_id: routineId, day_index: 1, title: "Day 1" }),
    })) as Array<{ id: string }>;

    const [exercise] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        gym_id: fixture.gymId,
        name: `E2E Exercise ${suffix}`,
        slug: `e2e-exercise-${suffix}`,
        is_active: true,
      }),
    })) as Array<{ id: string }>;

    await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_routine_day_id: day.id,
        exercise_id: exercise.id,
        sort_order: 1,
        sets_text: "4",
        reps_text: "8",
        rest_seconds: 90,
      }),
    });
  }

  return routineId;
}

export async function deleteRoutine(routineId: string) {
  await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}`, { method: "DELETE" });
}

export async function getRoutineStatus(routineId: string): Promise<string | null> {
  const rows = (await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}&select=status`)) as Array<{
    status: string;
  }>;
  return rows[0]?.status ?? null;
}

export async function adminRequestCount(path: string): Promise<number> {
  const rows = (await adminRequest(path)) as unknown[];
  return rows.length;
}

/** Logs in through the real UI login form (not a cookie hack) so the
 * browser context ends up with a genuine @supabase/ssr session, then waits
 * for the post-login redirect into /dashboard. */
export async function loginAsCoach(page: Page, fixture: RoutineFixture) {
  await page.goto("/login");
  await page.getByPlaceholder("admin@gymos.app").fill(fixture.coachEmail);
  await page.getByPlaceholder("••••••••").fill(COACH_PASSWORD);
  await page.getByRole("button", { name: /Entrar|Ingresando/ }).click();
  await page.waitForURL(/\/dashboard/);
}

/** Sets the admin_locale cookie directly (the same cookie the app's own
 * ?lang= redirect in middleware.ts sets) so tests can control locale
 * without depending on a UI toggle. Must run before navigating. */
export async function setAdminLocale(page: Page, locale: "en" | "es") {
  await page.context().addCookies([
    {
      name: "admin_locale",
      value: locale,
      url: "http://localhost:3000",
    },
  ]);
}
