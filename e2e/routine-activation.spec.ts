// Entrega A0 #3 (explicit activation): activation must never be reachable
// from the generic save, always requires a confirmation naming the client
// and routine, always warns about replacing the current active routine and
// immediate client visibility, must block double-submission, and any
// failure must show a safe, localized message. Requires local Supabase +
// `npm run dev` reachable at http://localhost:3000 (see playwright.config.ts).

import { expect, test } from "@playwright/test";

import {
  createGymFixture,
  createRoutine,
  deleteGymFixture,
  deleteRoutine,
  getRoutineStatus,
  loginAsCoach,
  type RoutineFixture,
} from "./fixtures";
import { text } from "./i18n";

test.describe("Routine activation (Entrega A0 #3)", () => {
  let fixture: RoutineFixture;

  test.beforeEach(async () => {
    fixture = await createGymFixture("activation");
  });

  test.afterEach(async () => {
    await deleteGymFixture(fixture);
  });

  test("activation is cancellable and leaves the routine untouched", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Push/Pull/Legs" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fixture.clientName);
    await expect(dialog).toContainText("Push/Pull/Legs");
    await expect(dialog).toContainText(text("en", "coaching.routines.activateConfirmReplaces"));
    await expect(dialog).toContainText(text("en", "coaching.routines.activateConfirmVisible"));

    await dialog.getByRole("button", { name: text("en", "common.cancel") }).click();
    await expect(dialog).toBeHidden();

    expect(await getRoutineStatus(routineId)).toBe("draft");
  });

  test("confirming activation activates the routine and shows a success toast", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Upper/Lower Split" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();

    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateSuccessToast"));
    expect(await getRoutineStatus(routineId)).toBe("active");

    // The activate button only renders while status !== "active" -- after
    // router.refresh() picks up the new server state it must disappear.
    await expect(page.getByRole("button", { name: text("en", "coaching.routines.activate") })).toBeHidden();
  });

  test("activating a second routine replaces the first (archives it) and the toast reflects that", async ({ page }) => {
    const firstId = await createRoutine(fixture, { title: "Routine A" });
    const secondId = await createRoutine(fixture, { title: "Routine B" });
    await loginAsCoach(page, fixture);

    await page.goto(`/dashboard/coaching/routines/${firstId}/edit`);
    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateSuccessToast"));

    await page.goto(`/dashboard/coaching/routines/${secondId}/edit`);
    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    await expect(page.locator(".ui-toast-title")).toHaveText(
      text("en", "coaching.routines.activateSuccessArchivedPreviousToast"),
    );

    expect(await getRoutineStatus(firstId)).toBe("archived");
    expect(await getRoutineStatus(secondId)).toBe("active");
  });

  test("a rapid double-click on confirm only activates once (no duplicate toast/submission)", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Double Click Routine" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") })
      .dblclick();

    await expect(page.locator(".ui-toast-title")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator(".ui-toast-title")).toHaveCount(1);
    expect(await getRoutineStatus(routineId)).toBe("active");
  });

  test("a failure to activate (routine vanished server-side) shows a safe, localized error -- never a raw backend message", async ({
    page,
  }) => {
    const routineId = await createRoutine(fixture, { title: "Doomed Routine" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    // Delete the routine server-side after the dialog is already rendered
    // (from the page's initial props) but before confirming, so the actual
    // server action hits a genuine "not found" condition.
    await deleteRoutine(routineId);
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();

    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateErrorToastTitle"));
    await expect(page.locator(".ui-toast-description")).toHaveText(text("en", "coaching.routines.activateError.notFound"));
  });
});
