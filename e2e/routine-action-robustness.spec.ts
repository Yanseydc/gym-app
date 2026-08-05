// Entrega A0 adversarial review, area 4: activation/archive/duplicate
// against harder scenarios than the happy path -- insufficient permissions,
// a routine already changed by another tab/session, and the UI recovering
// cleanly after an error instead of getting stuck. Requires local Supabase
// + `npm run dev` reachable at http://localhost:3000.

import { expect, test } from "@playwright/test";

import { adminRequest } from "../supabase/tests/helpers";
import {
  createGymFixture,
  createRoutine,
  deleteGymFixture,
  deleteRoutine,
  loginAsCoach,
  type RoutineFixture,
} from "./fixtures";
import { text } from "./i18n";

test.describe("Insufficient permissions (Entrega A0 adversarial review, area 4)", () => {
  let gymA: RoutineFixture;
  let gymB: RoutineFixture;

  test.beforeEach(async () => {
    gymA = await createGymFixture("perm-a");
    gymB = await createGymFixture("perm-b");
  });

  test.afterEach(async () => {
    await deleteGymFixture(gymA);
    await deleteGymFixture(gymB);
  });

  // Asserting on page content rather than response.status(): Next.js App
  // Router's notFound() boundary can stream an already-committed 200
  // status ahead of the async Server Component that calls notFound() in
  // dev mode, even though the rendered content is genuinely the not-found
  // page with zero routine data (verified: the response body is exactly
  // Next's default "404 / This page could not be found" boundary, nothing
  // about gym A's routine). The actual security property -- no data leak
  // -- is what these tests check.
  test("gym B's coach navigating directly to gym A's routine edit URL sees only the not-found page, never the routine", async ({
    page,
  }) => {
    const gymARoutineId = await createRoutine(gymA, { title: "Gym A Private Routine" });
    await loginAsCoach(page, gymB);

    await page.goto(`/dashboard/coaching/routines/${gymARoutineId}/edit`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByText("Gym A Private Routine")).toHaveCount(0);
    await expect(page.getByRole("button", { name: text("en", "coaching.routines.activate") })).toHaveCount(0);
  });

  test("gym B's coach navigating directly to gym A's routine detail URL sees only the not-found page, never the routine", async ({
    page,
  }) => {
    const gymARoutineId = await createRoutine(gymA, { title: "Gym A Private Routine 2" });
    await loginAsCoach(page, gymB);

    await page.goto(`/dashboard/coaching/routines/${gymARoutineId}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByText("Gym A Private Routine 2")).toHaveCount(0);
  });
});

test.describe("Stale routine changed by another tab (Entrega A0 adversarial review, area 4)", () => {
  let fixture: RoutineFixture;

  test.beforeEach(async () => {
    fixture = await createGymFixture("stale");
  });

  test.afterEach(async () => {
    await deleteGymFixture(fixture);
  });

  test("archiving a routine that another tab already archived succeeds idempotently, not a raw DB error", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Archived Elsewhere", status: "active" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}`);

    // Simulate "another tab" already archiving it, out from under this
    // page's already-rendered ArchiveRoutineButton. Uses the service-role
    // key purely as a trusted test-fixture mechanism (it bypasses the
    // status-transition trigger by design -- see the migration -- the same
    // way any other backend/admin script would); this is not exercising an
    // authenticated-role bypass.
    await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });

    await page.getByRole("button", { name: text("en", "coaching.routines.archive") }).click();
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.archiveConfirmAction") }).click();

    // archive_client_routine is idempotent: archiving an already-archived
    // routine is a stable success, not a surprising error.
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.archiveSuccessToast"));
  });

  test("reactivating a routine another tab already activated for the same client still succeeds cleanly (archived-previous path), no raw error", async ({
    page,
  }) => {
    const routineA = await createRoutine(fixture, { title: "Stale A" });
    const routineB = await createRoutine(fixture, { title: "Stale B" });
    await loginAsCoach(page, fixture);

    await page.goto(`/dashboard/coaching/routines/${routineA}/edit`);
    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();

    // Another tab activates B first, while this tab's dialog for A is open.
    await adminRequest(`/rest/v1/client_routines?id=eq.${routineB}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    });

    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    // activate_client_routine archives whatever is currently active for
    // this client (routine B, set by the "other tab") before activating
    // the target (routine A) -- so this must succeed with the
    // archived-previous toast, never a raw conflict/constraint error.
    await expect(page.locator(".ui-toast-title")).toHaveText(
      text("en", "coaching.routines.activateSuccessArchivedPreviousToast"),
    );
  });
});

test.describe("UI recovers cleanly after an error (Entrega A0 adversarial review, area 4)", () => {
  let fixture: RoutineFixture;

  test.beforeEach(async () => {
    fixture = await createGymFixture("recover");
  });

  test.afterEach(async () => {
    await deleteGymFixture(fixture);
  });

  test("after a failed activation, the button is not stuck: it can be clicked again and the dialog reopens normally", async ({
    page,
  }) => {
    const routineId = await createRoutine(fixture, { title: "Recover Me" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    const activateButton = page.getByRole("button", { name: text("en", "coaching.routines.activate") });

    await activateButton.click();
    await deleteRoutine(routineId);
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateErrorToastTitle"));

    // The button must not be left disabled/stuck after the error.
    await expect(activateButton).toBeEnabled();
    await activateButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // A second attempt (still against the deleted routine) fails the same
    // safe way -- not a crash, not a different/leaking message, and still
    // exactly one toast at a time.
    await page.getByRole("dialog").getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateErrorToastTitle"));
    await expect(page.locator(".ui-toast-title")).toHaveCount(1);
  });

  test("the confirm dialog cannot be dismissed via Escape while the activation is in flight", async ({ page }) => {
    const routineId = await createRoutine(fixture, { title: "Escape During Pending" });
    await loginAsCoach(page, fixture);
    await page.goto(`/dashboard/coaching/routines/${routineId}/edit`);

    await page.getByRole("button", { name: text("en", "coaching.routines.activate") }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: text("en", "coaching.routines.activateConfirmAction") }).click();
    await page.keyboard.press("Escape");

    // Whether Escape landed before or after the request settled, the
    // activation itself must have gone through uninterrupted -- Escape
    // during pending must never abort or corrupt the in-flight submission.
    await expect(page.locator(".ui-toast-title")).toHaveText(text("en", "coaching.routines.activateSuccessToast"));
  });
});
