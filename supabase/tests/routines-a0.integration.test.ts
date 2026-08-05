// Integration tests for Entrega A0:
//   - exercise_library / exercise_media gym isolation fix
//     (supabase/migrations/20260804120000_fix_exercise_library_gym_isolation.sql)
//   - the rest_seconds column's DB-level contract (single integer-seconds
//     column, shared identically by whatever inserts into it)
//
// Requires a running local Supabase stack -- see the header comment in
// activate-client-routine.integration.test.ts for full run instructions.
// Never point SUPABASE_URL at a remote/production project: this creates and
// deletes real auth users, gyms, clients, exercises and media.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { ANON_KEY, SUPABASE_URL, adminRequest, createAuthUser, deleteAuthUser, signIn } from "./helpers";

describe("Entrega A0: exercise_library / exercise_media gym isolation (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  let adminAUserId!: string;
  let adminBUserId!: string;
  let adminAToken!: string;
  let adminBToken!: string;
  let globalExerciseId!: string;
  let privateExerciseAId!: string;
  let globalMediaId!: string;
  let privateMediaAId!: string;

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0 RLS Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0 RLS Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];

    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    adminAUserId = await createAuthUser(`a0-admin-a-${suffix}@test.local`, password);
    adminBUserId = await createAuthUser(`a0-admin-b-${suffix}@test.local`, password);

    await Promise.all([
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: adminAUserId, email: `a0-admin-a-${suffix}@test.local`, role: "admin", gym_id: gymAId }),
      }),
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: adminBUserId, email: `a0-admin-b-${suffix}@test.local`, role: "admin", gym_id: gymBId }),
      }),
    ]);

    [adminAToken, adminBToken] = await Promise.all([
      signIn(`a0-admin-a-${suffix}@test.local`, password),
      signIn(`a0-admin-b-${suffix}@test.local`, password),
    ]);

    const [globalExercise] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: null, name: `A0 Global ${suffix}`, slug: `a0-global-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;
    const [privateExerciseA] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, name: `A0 Private A ${suffix}`, slug: `a0-private-a-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;

    globalExerciseId = globalExercise.id;
    privateExerciseAId = privateExerciseA.id;

    const [globalMedia] = (await adminRequest("/rest/v1/exercise_media", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ exercise_id: globalExerciseId, url: "https://example.com/a0-global.jpg", sort_order: 1 }),
    })) as Array<{ id: string }>;
    const [privateMediaA] = (await adminRequest("/rest/v1/exercise_media", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ exercise_id: privateExerciseAId, url: "https://example.com/a0-private-a.jpg", sort_order: 1 }),
    })) as Array<{ id: string }>;

    globalMediaId = globalMedia.id;
    privateMediaAId = privateMediaA.id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/exercise_media?id=in.(${globalMediaId},${privateMediaAId})`, { method: "DELETE" });
    await adminRequest(`/rest/v1/exercise_library?id=in.(${globalExerciseId},${privateExerciseAId})`, { method: "DELETE" });
    await Promise.all([deleteAuthUser(adminAUserId), deleteAuthUser(adminBUserId)]);
    await adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})`, { method: "DELETE" });

    const [leftoverGyms, leftoverExercises] = (await Promise.all([
      adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})&select=id`),
      adminRequest(`/rest/v1/exercise_library?id=in.(${globalExerciseId},${privateExerciseAId})&select=id`),
    ])) as [unknown[], unknown[]];
    assert.deepEqual(leftoverGyms, [], "test gyms must not remain after cleanup");
    assert.deepEqual(leftoverExercises, [], "test exercises must not remain after cleanup");
  });

  async function readAs(token: string, path: string) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return { status: response.status, body: (await response.json()) as unknown[] };
  }

  test("a global (gym_id null) exercise is visible to gym A", async () => {
    const { body } = await readAs(adminAToken, `/rest/v1/exercise_library?id=eq.${globalExerciseId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("a global (gym_id null) exercise is visible to gym B", async () => {
    const { body } = await readAs(adminBToken, `/rest/v1/exercise_library?id=eq.${globalExerciseId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("global exercise media is visible to both gyms", async () => {
    const [fromA, fromB] = await Promise.all([
      readAs(adminAToken, `/rest/v1/exercise_media?id=eq.${globalMediaId}&select=id`),
      readAs(adminBToken, `/rest/v1/exercise_media?id=eq.${globalMediaId}&select=id`),
    ]);
    assert.equal(fromA.body.length, 1);
    assert.equal(fromB.body.length, 1);
  });

  test("gym A can read its own private exercise", async () => {
    const { body } = await readAs(adminAToken, `/rest/v1/exercise_library?id=eq.${privateExerciseAId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("gym B CANNOT read gym A's private exercise -- the exact bug this migration fixes", async () => {
    const { body } = await readAs(adminBToken, `/rest/v1/exercise_library?id=eq.${privateExerciseAId}&select=id`);
    assert.equal(body.length, 0);
  });

  test("gym A can read its own private exercise's media", async () => {
    const { body } = await readAs(adminAToken, `/rest/v1/exercise_media?id=eq.${privateMediaAId}&select=id`);
    assert.equal(body.length, 1);
  });

  test("gym B CANNOT read gym A's private exercise media", async () => {
    const { body } = await readAs(adminBToken, `/rest/v1/exercise_media?id=eq.${privateMediaAId}&select=id`);
    assert.equal(body.length, 0);
  });

  test("a 'client' role profile (not admin/staff/coach) can still read their own gym's exercises -- the portal case the old is_active clause existed for", async () => {
    const clientEmail = `a0-client-${suffix}@test.local`;
    const clientUserId = await createAuthUser(clientEmail, password);

    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: clientUserId, email: clientEmail, role: "client", gym_id: gymAId }),
    });

    const clientToken = await signIn(clientEmail, password);
    const ownGym = await readAs(clientToken, `/rest/v1/exercise_library?id=eq.${privateExerciseAId}&select=id`);
    const otherGym = await readAs(clientToken, `/rest/v1/exercise_library?id=eq.${globalExerciseId}&select=id`);

    assert.equal(ownGym.body.length, 1, "client can read their own gym's private exercise");
    assert.equal(otherGym.body.length, 1, "client can read a global exercise too");

    await adminRequest(`/rest/v1/profiles?id=eq.${clientUserId}`, { method: "DELETE" });
    await deleteAuthUser(clientUserId);
  });
});

describe("Entrega A0: rest_seconds is a single integer-seconds column regardless of insertion path (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);

  let gymId!: string;
  let clientId!: string;
  let routineId!: string;
  let dayId!: string;
  let exerciseId!: string;

  before(async () => {
    const [gym] = (await adminRequest("/rest/v1/gyms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: `A0 Rest Seconds Gym ${suffix}` }),
    })) as Array<{ id: string }>;
    gymId = gym.id;

    const [client] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, first_name: "A0", last_name: `Rest ${suffix}`, phone: "5555550000" }),
    })) as Array<{ id: string }>;
    clientId = client.id;

    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientId, title: "A0 rest seconds routine", status: "draft" }),
    })) as Array<{ id: string }>;
    routineId = routine.id;

    const [day] = (await adminRequest("/rest/v1/client_routine_days", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ client_routine_id: routineId, day_index: 1, title: "Day 1" }),
    })) as Array<{ id: string }>;
    dayId = day.id;

    const [exercise] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, name: `A0 Rest Exercise ${suffix}`, slug: `a0-rest-ex-${suffix}`, is_active: true }),
    })) as Array<{ id: string }>;
    exerciseId = exercise.id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=eq.${clientId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/exercise_library?id=eq.${exerciseId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/gyms?id=eq.${gymId}`, { method: "DELETE" });
  });

  test("a value the manual builder would send (already an integer string) round-trips exactly", async () => {
    const [row] = (await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_routine_day_id: dayId,
        exercise_id: exerciseId,
        sort_order: 1,
        sets_text: "4",
        reps_text: "8",
        rest_seconds: 90,
      }),
    })) as Array<{ id: string; rest_seconds: number }>;

    assert.equal(row.rest_seconds, 90);
  });

  test("a value the text-import path would send (also an integer, same column) round-trips identically -- same contract, same column, no divergent unit conversion possible", async () => {
    const [row] = (await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_routine_day_id: dayId,
        exercise_id: exerciseId,
        sort_order: 2,
        sets_text: "3",
        reps_text: "10",
        rest_seconds: 90,
      }),
    })) as Array<{ id: string; rest_seconds: number }>;

    assert.equal(row.rest_seconds, 90);
  });

  test("a null rest_seconds (no rest specified) is accepted", async () => {
    const [row] = (await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_routine_day_id: dayId,
        exercise_id: exerciseId,
        sort_order: 3,
        sets_text: "1",
        reps_text: "AMRAP",
        rest_seconds: null,
      }),
    })) as Array<{ id: string; rest_seconds: number | null }>;

    assert.equal(row.rest_seconds, null);
  });

  test("a negative rest_seconds is rejected at the DB level (defense in depth below the app's own validation)", async () => {
    await assert.rejects(
      adminRequest("/rest/v1/client_routine_exercises", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          client_routine_day_id: dayId,
          exercise_id: exerciseId,
          sort_order: 4,
          sets_text: "1",
          reps_text: "1",
          rest_seconds: -1,
        }),
      }),
    );
  });
});
