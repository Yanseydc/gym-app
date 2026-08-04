// Integration test for the public.activate_client_routine RPC
// (supabase/migrations/20260803120000_fix_activate_client_routine_ambiguous_column.sql).
//
// This is NOT part of `npm test` (find src -name '*.test.ts') on purpose:
// every existing test in src/ is pure or only needs NEXT_PUBLIC_SUPABASE_*
// to exist with a valid *format*, never a live database. This test drives
// real PostgREST + GoTrue endpoints against a running local Supabase stack
// (auth users, real JWTs, real RLS), so it lives outside that glob and is
// run explicitly:
//
//   supabase start
//   supabase db reset --local
//   SUPABASE_ANON_KEY=<local anon key from `supabase status`> \
//   SUPABASE_SERVICE_ROLE_KEY=<local service_role key from `supabase status`> \
//     npx tsx --test supabase/tests/activate-client-routine.integration.test.ts
//
// The two keys above are the standard local Supabase demo keys (same on
// every `supabase init` project, printed by `supabase status`) -- never
// production credentials. Do not point SUPABASE_URL at a remote project
// when running this file: it creates and deletes real auth users, gyms,
// clients and routines against whatever project it targets.
//
// Shared fixture/request helpers live in ./helpers.ts, reused by
// client-routine-sessions.integration.test.ts.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import {
  SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminRequest,
  callRpc,
  createAuthUser,
  deleteAuthUser,
  signIn,
} from "./helpers";

type ActivateRoutineRow = { id: string; archived_previous: boolean };

describe("activate_client_routine RPC (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  let clientAId!: string;
  let clientA2Id!: string;
  let adminAUserId!: string;
  let staffBUserId!: string;
  let adminAToken!: string;
  let staffBToken!: string;
  let routine1Id!: string;
  let routine2Id!: string;

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `Test Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `Test Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];

    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    const [clientA, clientA2] = (await Promise.all([
      adminRequest("/rest/v1/clients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          gym_id: gymAId,
          first_name: "Test",
          last_name: `Client ${suffix}`,
          phone: "5555550000",
        }),
      }),
      adminRequest("/rest/v1/clients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          gym_id: gymAId,
          first_name: "Other",
          last_name: `Client ${suffix}`,
          phone: "5555550001",
        }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];

    clientAId = clientA[0].id;
    clientA2Id = clientA2[0].id;

    adminAUserId = await createAuthUser(`admin-a-${suffix}@test.local`, password);
    staffBUserId = await createAuthUser(`staff-b-${suffix}@test.local`, password);

    await Promise.all([
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: adminAUserId,
          email: `admin-a-${suffix}@test.local`,
          role: "admin",
          gym_id: gymAId,
        }),
      }),
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: staffBUserId,
          email: `staff-b-${suffix}@test.local`,
          role: "staff",
          gym_id: gymBId,
        }),
      }),
    ]);

    [adminAToken, staffBToken] = await Promise.all([
      signIn(`admin-a-${suffix}@test.local`, password),
      signIn(`staff-b-${suffix}@test.local`, password),
    ]);

    const [routine1, routine2] = (await Promise.all([
      adminRequest("/rest/v1/client_routines", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title: "Routine 1", status: "draft" }),
      }),
      adminRequest("/rest/v1/client_routines", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title: "Routine 2", status: "draft" }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];

    routine1Id = routine1[0].id;
    routine2Id = routine2[0].id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?client_id=eq.${clientAId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=in.(${clientAId},${clientA2Id})`, { method: "DELETE" });
    await Promise.all([deleteAuthUser(adminAUserId), deleteAuthUser(staffBUserId)]);
    await adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})`, { method: "DELETE" });

    // Prove the suite leaves nothing behind -- not just "delete calls were
    // issued", but that the rows/users are actually gone. Scoped to this
    // run's own ids, so this never trips on unrelated data and is safe to
    // run twice against the same stack (each run mints fresh ids).
    const [leftoverGyms, leftoverClients, leftoverRoutines] = (await Promise.all([
      adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})&select=id`),
      adminRequest(`/rest/v1/clients?id=in.(${clientAId},${clientA2Id})&select=id`),
      adminRequest(`/rest/v1/client_routines?id=in.(${routine1Id},${routine2Id})&select=id`),
    ])) as [unknown[], unknown[], unknown[]];

    assert.deepEqual(leftoverGyms, [], "test gyms must not remain after cleanup");
    assert.deepEqual(leftoverClients, [], "test clients must not remain after cleanup");
    assert.deepEqual(leftoverRoutines, [], "test routines must not remain after cleanup");

    // profiles.id references auth.users(id) on delete cascade, so deleting
    // the Auth user above should have cascade-deleted its profile -- verify
    // that actually happened instead of assuming the FK behavior.
    const leftoverProfiles = (await adminRequest(
      `/rest/v1/profiles?id=in.(${adminAUserId},${staffBUserId})&select=id`,
    )) as unknown[];
    assert.deepEqual(leftoverProfiles, [], "test profiles must not remain after cleanup");

    // And confirm the Auth users themselves are gone: GoTrue's admin
    // "get user" endpoint 404s once deleted.
    for (const userId of [adminAUserId, staffBUserId]) {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      assert.equal(response.status, 404, `auth user ${userId} must not remain after cleanup`);
    }
  });

  test("gym-scoped admin activates a draft routine for their own client", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: routine1Id,
      target_client_id: clientAId,
      target_title: "Routine 1 Active",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 200);
    const [row] = body as ActivateRoutineRow[];
    assert.equal(row.id, routine1Id);
    assert.equal(row.archived_previous, false);
  });

  test("staff from a different gym cannot activate a routine for this client", async () => {
    const { status, body } = await callRpc("activate_client_routine", staffBToken, {
      target_routine_id: routine2Id,
      target_client_id: clientAId,
      target_title: "Hijack attempt",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /Not authorized to activate routines/);
  });

  test("activating a second routine archives the previously active one", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: routine2Id,
      target_client_id: clientAId,
      target_title: "Routine 2 Active",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 200);
    const [row] = body as ActivateRoutineRow[];
    assert.equal(row.id, routine2Id);
    assert.equal(row.archived_previous, true);

    const [previous] = (await adminRequest(
      `/rest/v1/client_routines?id=eq.${routine1Id}&select=status`,
    )) as Array<{ status: string }>;
    assert.equal(previous.status, "archived");
  });

  test("re-activating an already-active routine succeeds and reports no newly-archived routine", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: routine2Id,
      target_client_id: clientAId,
      target_title: "Routine 2 Active Again",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 200);
    const [row] = body as ActivateRoutineRow[];
    assert.equal(row.id, routine2Id);
    assert.equal(row.archived_previous, false);
  });

  test("a non-existent client raises 'Client not found.'", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: routine2Id,
      target_client_id: "00000000-0000-0000-0000-000000000099",
      target_title: "X",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 400);
    assert.equal((body as { message: string }).message, "Client not found.");
  });

  test("a non-existent routine id returns an empty result, not an error", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: "00000000-0000-0000-0000-000000000099",
      target_client_id: clientAId,
      target_title: "X",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  test("a routine that does not belong to the target client returns an empty result and is not mutated", async () => {
    const { status, body } = await callRpc("activate_client_routine", adminAToken, {
      target_routine_id: routine1Id,
      target_client_id: clientA2Id,
      target_title: "Mismatch",
      target_notes: null,
      target_starts_on: null,
      target_ends_on: null,
    });

    assert.equal(status, 200);
    assert.deepEqual(body, []);

    const [untouched] = (await adminRequest(
      `/rest/v1/client_routines?id=eq.${routine1Id}&select=status,title`,
    )) as Array<{ status: string; title: string }>;
    assert.equal(untouched.status, "archived");
    assert.equal(untouched.title, "Routine 1 Active");
  });
});
