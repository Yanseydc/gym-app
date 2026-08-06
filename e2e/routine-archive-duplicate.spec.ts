// Entrega A0 #4 (archive & duplicate): archiving requires an explicit
// confirmation that explains its effect; duplicating may stay a direct
// action but must block double-submission, show a pending state, a success
// toast, clearly reveal the created copy, and a safe error on failure.
// Requires local Supabase + `npm run dev` reachable at http://localhost:3000.

import { expect, test } from "@playwright/test";

import {
  adminRequestCount,
  createGymFixture,
  createRoutine,
  deleteGymFixture,
  deleteRoutine,
  getRoutineStatus,
  loginAsCoach,
  type RoutineFixture,
} from "./fixtures";
import { text } from "./i18n";

test.describe("Routine archiving (Entrega A0 #4)", () => {
  let fixture: RoutineFixture;

  test.beforeEach(async () => {
    fixture = await createGymFixture("archive");
  });

  test.afterEach(async () => {
    await deleteGymFixture(fixture);
  });

  test("archiving is cancellable and leaves the routine untouched", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Archive Me Later", status: "active" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.archive") }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(text("en", "coaching.routines.archiveConfirmDescription"));

    await dialog.getByRole("button", { name: text("en", "common.cancel") }).click();
    await expect(dialog).toBeHidden();

    expect(await getRoutineStatus(routineId)).toBe("active");
  });

  test("confirming archive archives the routine, shows a toast, and hides the archive button", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Archive Me Now", status: "active" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.archive") }).click();
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.archiveConfirmAction") }).click();

    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.archiveSuccessToast"));
    expect(await getRoutineStatus(routineId)).toBe("archived");
    await expect(page.getByRole("button", { name: text("en", "coaching.routines.archive") })).toBeHidden();
  });

  test("a rapid double-click on confirm only archives once", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Double Click Archive", status: "active" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.archive") }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: text("en", "coaching.routines.archiveConfirmAction") })
      .dblclick();

    await expect(page.locator(".ui-toast-title")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator(".ui-toast-title")).toHaveCount(1);
  });

  test("a failure to archive (routine vanished server-side) shows a safe, localized error", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Doomed Archive", status: "active" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.archive") }).click();
    await deleteRoutine(routineId);
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.archiveConfirmAction") }).click();

    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.archiveErrorToastTitle"));
    await expect(page.locator(".ui-toast-description")).toHaveText(text("en", "coaching.routines.archiveError.notFound"));
  });
});

test.describe("Routine duplication (Entrega A0 #4)", () => {
  let fixture: RoutineFixture;

  test.beforeEach(async () => {
    fixture = await createGymFixture("duplicate");
  });

  test.afterEach(async () => {
    await deleteGymFixture(fixture);
  });

  test("duplicating creates a copy, shows a toast, and navigates to the new copy", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Original Routine", withDayAndExercise: true });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.duplicate") }).click();
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.duplicateSuccessToast"));

    await page.waitForURL(/\/dashboard\/coaching\/routines\/[^/]+\/edit/);
    const newRoutineId = new URL(page.url()).pathname.split("/")[4];
    expect(newRoutineId).not.toBe(routineId);

    const count = await adminRequestCount(`/rest/v1/client_routines?client_id=eq.${fixture.clientId}&select=id`);
    expect(count).toBe(2);
  });

  test("a rapid double-click only creates one copy", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Double Click Duplicate" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await page.getByRole("button", { name: text("en", "coaching.routines.duplicate") }).dblclick();
    await page.waitForURL(/\/dashboard\/coaching\/routines\/[^/]+\/edit/);

    const count = await adminRequestCount(`/rest/v1/client_routines?client_id=eq.${fixture.clientId}&select=id`);
    expect(count).toBe(2);
  });

  test("a failure to duplicate (source routine vanished server-side) shows a safe, localized error and does not navigate", async ({
    page,
  }) => {
    const routineId = await createRoutine(fixture, { title: "Doomed Duplicate" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    await deleteRoutine(routineId);
    await page.getByRole("button", { name: text("en", "coaching.routines.duplicate") }).click();

    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.duplicateErrorToastTitle"));
    await expect(page.locator(".ui-toast-description")).toHaveText(text("en", "coaching.routines.duplicateError.generic"));
    expect(page.url()).toContain(`/dashboard/coaching/routines/${routineId}`);
  });
});
