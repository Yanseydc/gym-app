// Entrega A0 #5 (mandatory tests): Spanish and English coverage. The
// functional flows (cancel/confirm/replace/double-click) are exercised in
// routine-activation.spec.ts / routine-archive-duplicate.spec.ts; this file
// focuses specifically on whether the correct dictionary string renders in
// each locale -- catching a raw i18n key leak or a wrong-locale string,
// which is the actual risk this Entrega's copy changes could introduce.

import { expect, test } from "@playwright/test";

import {
  createGymFixture,
  createRoutine,
  deleteGymFixture,
  deleteRoutine,
  loginAsCoach,
  setAdminLocale,
  type RoutineFixture,
} from "./fixtures";
import { text, type Locale } from "./i18n";

for (const locale of ["en", "es"] as Locale[]) {
  test.describe(`Routine actions render correctly in locale "${locale}"`, () => {
    let fixture: RoutineFixture;

    test.beforeEach(async () => {
      fixture = await createGymFixture(`i18n-${locale}`);
    });

    test.afterEach(async () => {
      await deleteGymFixture(fixture);
    });

    test("activation confirm dialog and success toast use the dictionary, not a raw key", async ({ page }) => {
      const routineId = await createRoutine(fixture, { title: `${locale} Routine` });
      await setAdminLocale(page, locale);
      await loginAsCoach(page, fixture);
      await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

      const activateLabel = text(locale, "coaching.routines.activate");
      await page.getByRole("button", { name: activateLabel }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(text(locale, "coaching.routines.activateConfirmTitle"));
      await expect(dialog).toContainText(text(locale, "coaching.routines.activateConfirmReplaces"));
      await expect(dialog).toContainText(text(locale, "coaching.routines.activateConfirmVisible"));

      await dialog.getByRole("button", { name: text(locale, "coaching.routines.activateConfirmAction") }).click();
      await expect(page.locator(".ui-toast-title")).toHaveText(text(locale, "coaching.routines.activateSuccessToast"));

      // Never a raw, unresolved i18n key like "coaching.routines.activate".
      await expect(page.locator(".ui-toast-title")).not.toContainText("coaching.routines.");
    });

    test("archive error toast is safe and localized (no raw backend message)", async ({ page }) => {
      const routineId = await createRoutine(fixture, { title: `${locale} Archive`, status: "active" });
      await setAdminLocale(page, locale);
      await loginAsCoach(page, fixture);
      await page.goto(`/dashboard/coaching/routines/${routineId}`);

      await page.getByRole("button", { name: text(locale, "coaching.routines.archive") }).click();
      await deleteRoutine(routineId);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: text(locale, "coaching.routines.archiveConfirmAction") })
        .click();

      await expect(page.locator(".ui-toast-title")).toHaveText(text(locale, "coaching.routines.archiveErrorToastTitle"));
      await expect(page.locator(".ui-toast-description")).toHaveText(text(locale, "coaching.routines.archiveError.notFound"));
      await expect(page.locator(".ui-toast-description")).not.toContainText("postgres", { ignoreCase: true });
      await expect(page.locator(".ui-toast-description")).not.toContainText("sql", { ignoreCase: true });
    });

    test("duplicate success/pending labels use the dictionary", async ({ page }) => {
      const routineId = await createRoutine(fixture, { title: `${locale} Duplicate` });
      await setAdminLocale(page, locale);
      await loginAsCoach(page, fixture);
      await page.goto(`/dashboard/coaching/routines/${routineId}`);

      await page.getByRole("button", { name: text(locale, "coaching.routines.duplicate") }).click();
      await expect(page.locator(".ui-toast-title")).toHaveText(text(locale, "coaching.routines.duplicateSuccessToast"));
    });
  });
}
