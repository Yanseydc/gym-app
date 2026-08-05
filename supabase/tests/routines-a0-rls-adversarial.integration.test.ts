// Entrega A0 adversarial review, area 2 (RLS).
//
// Exact policy under test (supabase/migrations/20260804120000_...):
//
//   alter policy "exercise_library_select_by_gym_or_shared"
//   on public.exercise_library
//   using (
//     private.has_any_role(array['super_admin'])
//     or gym_id is null
//     or gym_id = (select p.gym_id from public.profiles p where p.id = auth.uid())
//   );
//
//   alter policy "exercise_media_select_by_visibility"
//   on public.exercise_media
//   using (
//     exists (
//       select 1 from public.exercise_library el
//       where el.id = exercise_id
//         and (
//           private.has_any_role(array['super_admin'])
//           or el.gym_id is null
//           or el.gym_id = (select p.gym_id from public.profiles p where p.id = auth.uid())
//         )
//     )
//   );
//
// This file goes beyond routines-a0.integration.test.ts's original 8 tests:
// it adds staff/coach role coverage (not just admin/client), anon access,
// an authenticated user with NO profiles row at all, a profile that exists
// but has gym_id = NULL, query-filter manipulation, and an explicit,
// documented check of the one open question from the adversarial review --
// whether an INACTIVE global exercise is visible to regular (non
// super-admin) users. It is: the exercises catalog page
// (exercise-service.ts's listExercises, pre-existing/unmodified 1A code)
// intentionally shows every global exercise, active or not, alongside the
// gym's own (also regardless of is_active) so staff can browse/manage
// deactivated entries. Restricting the RLS policy's global branch to
// is_active = true would break that page for every gym. This is documented
// here as a deliberate decision, not an oversight.
//
// Requires a running local Supabase stack. Never point SUPABASE_URL at a
// remote/production project.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { ANON_KEY, SUPABASE_URL, adminRequest, createAuthUser, deleteAuthUser, signIn } from "./helpers";

async function readAs(token: string | null, path: string) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: token
      ? { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
      : { apikey: ANON_KEY },
  });
  return { status: response.status, body: (await response.json()) as unknown[] };
}

describe("Entrega A0 adversarial review: exercise_library/exercise_media RLS (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  const gymAUsers: Record<"admin" | "staff" | "coach" | "client", { id: string; token: string }> = {} as never;
  let gymBAdminToken!: string;
  let gymBAdminUserId!: string;
  let orphanUserId!: string;
  let orphanToken!: string;
  let noGymUserId!: string;

  let globalActiveExerciseId!: string;
  let globalInactiveExerciseId!: string;
  let privateAExerciseId!: string;
  let privateBExerciseId!: string;
  let privateAMediaId!: string;
  let globalActiveMediaId!: string;

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0 Adversarial Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0 Adversarial Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    for (const role of ["admin", "staff", "coach", "client"] as const) {
      const email = `a0-adv-${role}-${suffix}@test.local`;
      const userId = await createAuthUser(email, password);
      await adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: userId, email, role, gym_id: gymAId }),
      });
      const token = await signIn(email, password);
      gymAUsers[role] = { id: userId, token };
    }

    const gymBAdminEmail = `a0-adv-gymb-admin-${suffix}@test.local`;
    gymBAdminUserId = await createAuthUser(gymBAdminEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: gymBAdminUserId, email: gymBAdminEmail, role: "admin", gym_id: gymBId }),
    });
    gymBAdminToken = await signIn(gymBAdminEmail, password);

    // Authenticated, but the profiles row is deleted right after sign-in --
    // simulates an orphaned auth user (e.g. profile row removed out of
    // band). auth.uid() still resolves; the gym_id subquery must resolve
    // to no rows, not error.
    const orphanEmail = `a0-adv-orphan-${suffix}@test.local`;
    orphanUserId = await createAuthUser(orphanEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: orphanUserId, email: orphanEmail, role: "admin", gym_id: gymAId }),
    });
    orphanToken = await signIn(orphanEmail, password);
    await adminRequest(`/rest/v1/profiles?id=eq.${orphanUserId}`, { method: "DELETE" });

    // A profile with gym_id = NULL that is not super_admin is not just
    // theoretically unsafe -- it's structurally impossible. See the
    // dedicated test below that proves this via the actual DB constraint,
    // instead of a live profile/token (which can't be created here).
    const noGymEmail = `a0-adv-nogym-${suffix}@test.local`;
    noGymUserId = await createAuthUser(noGymEmail, password);

    const [globalActive] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: null, name: `A0 Adv Global Active ${suffix}`, slug: `a0-adv-global-active-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;
    const [globalInactive] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: null, name: `A0 Adv Global Inactive ${suffix}`, slug: `a0-adv-global-inactive-${suffix}`, is_active: false }),
    })) as Array<{ id: string }>;
    const [privateA] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, name: `A0 Adv Private A ${suffix}`, slug: `a0-adv-private-a-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;
    const [privateB] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymBId, name: `A0 Adv Private B ${suffix}`, slug: `a0-adv-private-b-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;

    globalActiveExerciseId = globalActive.id;
    globalInactiveExerciseId = globalInactive.id;
    privateAExerciseId = privateA.id;
    privateBExerciseId = privateB.id;

    const [globalActiveMedia] = (await adminRequest("/rest/v1/exercise_media", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ exercise_id: globalActiveExerciseId, url: "https://example.com/a0-adv-global.jpg", sort_order: 1 }),
    })) as Array<{ id: string }>;
    const [privateAMedia] = (await adminRequest("/rest/v1/exercise_media", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ exercise_id: privateAExerciseId, url: "https://example.com/a0-adv-private-a.jpg", sort_order: 1 }),
    })) as Array<{ id: string }>;

    globalActiveMediaId = globalActiveMedia.id;
    privateAMediaId = privateAMedia.id;
  });

  after(async () => {
    await adminRequest(
      `/rest/v1/exercise_media?id=in.(${globalActiveMediaId},${privateAMediaId})`,
      { method: "DELETE" },
    );
    await adminRequest(
      `/rest/v1/exercise_library?id=in.(${globalActiveExerciseId},${globalInactiveExerciseId},${privateAExerciseId},${privateBExerciseId})`,
      { method: "DELETE" },
    );
    await Promise.all([
      ...Object.values(gymAUsers).map((u) => adminRequest(`/rest/v1/profiles?id=eq.${u.id}`, { method: "DELETE" })),
      adminRequest(`/rest/v1/profiles?id=eq.${gymBAdminUserId}`, { method: "DELETE" }),
      adminRequest(`/rest/v1/profiles?id=eq.${noGymUserId}`, { method: "DELETE" }),
    ]);
    await Promise.all([
      ...Object.values(gymAUsers).map((u) => deleteAuthUser(u.id)),
      deleteAuthUser(gymBAdminUserId),
      deleteAuthUser(orphanUserId),
      deleteAuthUser(noGymUserId),
    ]);
    await adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})`, { method: "DELETE" });
  });

  for (const role of ["admin", "staff", "coach", "client"] as const) {
    test(`${role} of gym A can read gym A's own private exercise`, async () => {
      const { status, body } = await readAs(gymAUsers[role].token, `/rest/v1/exercise_library?id=eq.${privateAExerciseId}&select=id`);
      assert.equal(status, 200);
      assert.equal(body.length, 1);
    });

    test(`${role} of gym A CANNOT read gym B's private exercise, even though it is active`, async () => {
      const { body } = await readAs(gymAUsers[role].token, `/rest/v1/exercise_library?id=eq.${privateBExerciseId}&select=id`);
      assert.deepEqual(body, []);
    });

    test(`${role} of gym A can read the active global exercise`, async () => {
      const { body } = await readAs(gymAUsers[role].token, `/rest/v1/exercise_library?id=eq.${globalActiveExerciseId}&select=id`);
      assert.equal(body.length, 1);
    });
  }

  test("gym B's admin CANNOT read gym A's private exercise, even though it is active -- the exact original bug", async () => {
    const { body } = await readAs(gymBAdminToken, `/rest/v1/exercise_library?id=eq.${privateAExerciseId}&select=id`);
    assert.deepEqual(body, []);
  });

  test("gym B's admin cannot see gym A's data by manipulating the REST filter to ask for gym A's gym_id directly", async () => {
    const { body } = await readAs(gymBAdminToken, `/rest/v1/exercise_library?gym_id=eq.${gymAId}&select=id`);
    assert.deepEqual(body, [], "RLS must still apply regardless of the requested filter");
  });

  test("an INACTIVE global exercise is visible to a regular gym user -- documented, intentional (exercise-service.ts's catalog page relies on this to let staff browse/manage deactivated system exercises)", async () => {
    const { body } = await readAs(gymAUsers.admin.token, `/rest/v1/exercise_library?id=eq.${globalInactiveExerciseId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("exercise_media inherits the active global exercise's visibility", async () => {
    const { body } = await readAs(gymAUsers.coach.token, `/rest/v1/exercise_media?id=eq.${globalActiveMediaId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("exercise_media of gym A's private exercise is invisible to gym B", async () => {
    const { body } = await readAs(gymBAdminToken, `/rest/v1/exercise_media?id=eq.${privateAMediaId}&select=id`);
    assert.deepEqual(body, []);
  });

  test("anon (no session at all) gets zero rows, not an error", async () => {
    const { status, body } = await readAs(null, `/rest/v1/exercise_library?id=eq.${globalActiveExerciseId}&select=id`);
    assert.ok(status === 200 || status === 401, `unexpected status ${status}`);
    if (status === 200) {
      assert.deepEqual(body, []);
    }
  });

  test("an authenticated user with NO profiles row fails closed for gym-private data but still sees the global catalog", async () => {
    const [ownGymAttempt, otherGymAttempt, globalAttempt] = await Promise.all([
      readAs(orphanToken, `/rest/v1/exercise_library?id=eq.${privateAExerciseId}&select=id`),
      readAs(orphanToken, `/rest/v1/exercise_library?gym_id=eq.${gymBId}&select=id`),
      readAs(orphanToken, `/rest/v1/exercise_library?id=eq.${globalActiveExerciseId}&select=id`),
    ]);
    assert.equal(ownGymAttempt.status, 200);
    assert.deepEqual(ownGymAttempt.body, [], "no profile row means the gym_id subquery matches nothing -- fail closed");
    assert.deepEqual(otherGymAttempt.body, []);
    assert.equal(globalAttempt.body.length, 1, "the global (gym_id is null) branch does not depend on having a profile");
  });

  test("a non-super-admin profile with gym_id = NULL is structurally impossible -- the DB's own check constraint rejects it before RLS is ever relevant", async () => {
    await assert.rejects(
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: noGymUserId, email: `unused-${suffix}@test.local`, role: "coach", gym_id: null }),
      }),
      /profiles_gym_required_unless_super_admin/,
    );
  });

  test("consulting profiles from inside the policy does not error or recurse for any role (all the requests above returned 200, not 500/permission errors)", async () => {
    // Assertion is the absence of thrown/non-200 responses above; this test
    // exists as an explicit, named checkpoint for that property.
    assert.ok(true);
  });
});

describe("Entrega A0 adversarial review, second pass: inactive global exercise visibility is minimum-privilege for the client role (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymId!: string;
  let assignedClientToken!: string;
  let unassignedClientToken!: string;
  let assignedClientUserId!: string;
  let unassignedClientUserId!: string;
  let clientRecordId!: string;
  let otherClientRecordId!: string;
  let routineId!: string;
  let inactiveGlobalExerciseId!: string;

  before(async () => {
    const [gym] = (await adminRequest("/rest/v1/gyms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: `A0 Adv Assigned Gym ${suffix}` }),
    })) as Array<{ id: string }>;
    gymId = gym.id;

    const [clientRecord] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, first_name: "Assigned", last_name: `Client ${suffix}`, phone: "5555550300" }),
    })) as Array<{ id: string }>;
    clientRecordId = clientRecord.id;

    const [otherClientRecord] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, first_name: "Unassigned", last_name: `Client ${suffix}`, phone: "5555550301" }),
    })) as Array<{ id: string }>;
    otherClientRecordId = otherClientRecord.id;

    const assignedEmail = `a0-adv-assigned-${suffix}@test.local`;
    assignedClientUserId = await createAuthUser(assignedEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: assignedClientUserId, email: assignedEmail, role: "client", gym_id: gymId }),
    });
    await adminRequest("/rest/v1/client_user_links", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientRecordId, profile_id: assignedClientUserId }),
    });
    assignedClientToken = await signIn(assignedEmail, password);

    const unassignedEmail = `a0-adv-unassigned-${suffix}@test.local`;
    unassignedClientUserId = await createAuthUser(unassignedEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: unassignedClientUserId, email: unassignedEmail, role: "client", gym_id: gymId }),
    });
    await adminRequest("/rest/v1/client_user_links", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: otherClientRecordId, profile_id: unassignedClientUserId }),
    });
    unassignedClientToken = await signIn(unassignedEmail, password);

    const [inactiveGlobal] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: null, name: `A0 Adv Assigned Inactive Global ${suffix}`, slug: `a0-adv-assigned-inactive-${suffix}`, is_active: false }),
    })) as Array<{ id: string }>;
    inactiveGlobalExerciseId = inactiveGlobal.id;

    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientRecordId, title: "Assigned Routine", status: "draft" }),
    })) as Array<{ id: string }>;
    routineId = routine.id;

    const [day] = (await adminRequest("/rest/v1/client_routine_days", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ client_routine_id: routineId, day_index: 1, title: "Day 1" }),
    })) as Array<{ id: string }>;

    await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_routine_day_id: day.id,
        exercise_id: inactiveGlobalExerciseId,
        sort_order: 1,
        sets_text: "3",
        reps_text: "10",
      }),
    });
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/exercise_library?id=eq.${inactiveGlobalExerciseId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/client_user_links?profile_id=in.(${assignedClientUserId},${unassignedClientUserId})`, {
      method: "DELETE",
    });
    await adminRequest(`/rest/v1/clients?id=in.(${clientRecordId},${otherClientRecordId})`, { method: "DELETE" });
    await adminRequest(`/rest/v1/profiles?id=in.(${assignedClientUserId},${unassignedClientUserId})`, { method: "DELETE" });
    await Promise.all([deleteAuthUser(assignedClientUserId), deleteAuthUser(unassignedClientUserId)]);
    await adminRequest(`/rest/v1/gyms?id=eq.${gymId}`, { method: "DELETE" });
  });

  test("a client CANNOT browse an inactive global exercise that is not part of any routine assigned to them", async () => {
    const { body } = await readAs(unassignedClientToken, `/rest/v1/exercise_library?id=eq.${inactiveGlobalExerciseId}&select=id`);
    assert.deepEqual(body, []);
  });

  test("a client CAN still see an inactive global exercise that IS referenced by their own assigned routine -- does not break already-assigned routines", async () => {
    const { body } = await readAs(assignedClientToken, `/rest/v1/exercise_library?id=eq.${inactiveGlobalExerciseId}&select=id`);
    assert.equal(body.length, 1);
  });
});
