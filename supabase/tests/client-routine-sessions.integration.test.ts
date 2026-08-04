// Integration test for the persistent workout session backend (Entrega
// 1A): supabase/migrations/20260804090000_persistent_workout_sessions_schema.sql
// and 20260804090100_persistent_workout_sessions_rpcs.sql.
//
// Same run instructions and reasoning as
// activate-client-routine.integration.test.ts (see its header comment):
// drives real PostgREST + GoTrue against a running local Supabase stack,
// lives outside `npm test`'s glob, never point SUPABASE_URL at a remote
// project.
//
//   supabase start && supabase db reset --local
//   SUPABASE_ANON_KEY=<local> SUPABASE_SERVICE_ROLE_KEY=<local> \
//     npx tsx --test supabase/tests/client-routine-sessions.integration.test.ts

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import {
  ANON_KEY,
  SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminRequest,
  callRpc,
  createAuthUser,
  deleteAuthUser,
  signIn,
} from "./helpers";

type StartRow = { session_id: string; resumed: boolean; requested_day_matches: boolean };
type SetRow = {
  set_id: string;
  version: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  notes: string | null;
  conflict: boolean;
};
type ExerciseNoteRow = { session_exercise_id: string; version: number; client_notes: string | null; conflict: boolean };
type FinishRow = {
  session_id: string;
  status: string;
  completed_at: string | null;
  completed_sets_count: number;
  total_sets_count: number;
};
type AbandonRow = {
  session_id: string;
  status: string;
  abandoned_at: string | null;
  completed_sets_count: number;
  total_sets_count: number;
};

function startSession(token: string, dayId: string, idempotencyKey: string) {
  return callRpc("start_routine_session", token, {
    p_client_routine_day_id: dayId,
    p_idempotency_key: idempotencyKey,
  });
}

function updateSet(
  token: string,
  setId: string,
  expectedVersion: number,
  values: { weight: number | null; reps: number | null; completed: boolean; notes: string | null },
) {
  return callRpc("update_routine_session_set", token, {
    p_set_id: setId,
    p_expected_version: expectedVersion,
    p_weight: values.weight,
    p_reps: values.reps,
    p_completed: values.completed,
    p_notes: values.notes,
  });
}

function updateExerciseNote(token: string, sessionExerciseId: string, expectedVersion: number, notes: string | null) {
  return callRpc("update_routine_session_exercise_note", token, {
    p_session_exercise_id: sessionExerciseId,
    p_expected_version: expectedVersion,
    p_client_notes: notes,
  });
}

function finishSession(token: string, sessionId: string, notes: string | null) {
  return callRpc("finish_routine_session", token, { p_session_id: sessionId, p_client_notes: notes });
}

function abandonSession(token: string, sessionId: string) {
  return callRpc("abandon_routine_session", token, { p_session_id: sessionId });
}

describe("persistent workout sessions (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  let clientAId!: string;
  let clientBId!: string;
  let clientAUserId!: string;
  let clientBUserId!: string;
  let staffAUserId!: string;
  let staffBUserId!: string;
  let clientAToken!: string;
  let clientBToken!: string;
  let staffAToken!: string;
  let staffBToken!: string;

  let exerciseAId!: string;
  let routineAId!: string;
  let dayA1Id!: string; // "4x10" -> 4 sets
  let dayA2Id!: string; // "AMRAP" -> 1 set (fallback parsing)
  let routineExerciseA1Id!: string;
  let dayRaceId!: string; // "2x5" -> 2 sets, dedicated fixture for the concurrency races below
  let exerciseRaceId!: string;
  let routineADraftId!: string;
  let dayADraftId!: string;

  let exerciseBId!: string;
  let routineBId!: string;
  let dayB1Id!: string;

  // Populated as the narrative progresses, cleaned up in after().
  const createdSessionIds: string[] = [];

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `Sessions Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `Sessions Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    const [clientA, clientB] = (await Promise.all([
      adminRequest("/rest/v1/clients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, first_name: "Session", last_name: `Client A ${suffix}`, phone: "5556660000" }),
      }),
      adminRequest("/rest/v1/clients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymBId, first_name: "Session", last_name: `Client B ${suffix}`, phone: "5556660001" }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    clientAId = clientA[0].id;
    clientBId = clientB[0].id;

    [clientAUserId, clientBUserId, staffAUserId, staffBUserId] = await Promise.all([
      createAuthUser(`client-a-${suffix}@test.local`, password),
      createAuthUser(`client-b-${suffix}@test.local`, password),
      createAuthUser(`staff-a-${suffix}@test.local`, password),
      createAuthUser(`staff-b-${suffix}@test.local`, password),
    ]);

    await Promise.all([
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: clientAUserId, email: `client-a-${suffix}@test.local`, role: "client", gym_id: gymAId }),
      }),
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: clientBUserId, email: `client-b-${suffix}@test.local`, role: "client", gym_id: gymBId }),
      }),
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: staffAUserId, email: `staff-a-${suffix}@test.local`, role: "staff", gym_id: gymAId }),
      }),
      adminRequest("/rest/v1/profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id: staffBUserId, email: `staff-b-${suffix}@test.local`, role: "staff", gym_id: gymBId }),
      }),
    ]);

    await Promise.all([
      adminRequest("/rest/v1/client_user_links", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_id: clientAId, profile_id: clientAUserId }),
      }),
      adminRequest("/rest/v1/client_user_links", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_id: clientBId, profile_id: clientBUserId }),
      }),
    ]);

    [clientAToken, clientBToken, staffAToken, staffBToken] = await Promise.all([
      signIn(`client-a-${suffix}@test.local`, password),
      signIn(`client-b-${suffix}@test.local`, password),
      signIn(`staff-a-${suffix}@test.local`, password),
      signIn(`staff-b-${suffix}@test.local`, password),
    ]);

    const [exerciseA, exerciseB] = (await Promise.all([
      adminRequest("/rest/v1/exercise_library", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, name: "Bench Press", slug: `bench-press-${suffix}-a` }),
      }),
      adminRequest("/rest/v1/exercise_library", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymBId, name: "Squat", slug: `squat-${suffix}-b` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    exerciseAId = exerciseA[0].id;
    exerciseBId = exerciseB[0].id;

    const [routineA, routineADraft, routineB] = (await Promise.all([
      adminRequest("/rest/v1/client_routines", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title: "Active Routine A", status: "active" }),
      }),
      adminRequest("/rest/v1/client_routines", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title: "Draft Routine A", status: "draft" }),
      }),
      adminRequest("/rest/v1/client_routines", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymBId, client_id: clientBId, title: "Active Routine B", status: "active" }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>, Array<{ id: string }>];
    routineAId = routineA[0].id;
    routineADraftId = routineADraft[0].id;
    routineBId = routineB[0].id;

    const [dayA1, dayA2, dayADraft, dayB1] = (await Promise.all([
      adminRequest("/rest/v1/client_routine_days", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_routine_id: routineAId, day_index: 1, title: "Push Day", notes: "Warm up first" }),
      }),
      adminRequest("/rest/v1/client_routine_days", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_routine_id: routineAId, day_index: 2, title: "Pull Day" }),
      }),
      adminRequest("/rest/v1/client_routine_days", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_routine_id: routineADraftId, day_index: 1, title: "Draft Day" }),
      }),
      adminRequest("/rest/v1/client_routine_days", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_routine_id: routineBId, day_index: 1, title: "Client B Day" }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>, Array<{ id: string }>, Array<{ id: string }>];
    dayA1Id = dayA1[0].id;
    dayA2Id = dayA2[0].id;
    dayADraftId = dayADraft[0].id;
    dayB1Id = dayB1[0].id;

    const [routineExerciseA1] = (await Promise.all([
      adminRequest("/rest/v1/client_routine_exercises", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          client_routine_day_id: dayA1Id,
          exercise_id: exerciseAId,
          sort_order: 1,
          sets_text: "4x10",
          reps_text: "10",
          target_weight_text: "60kg",
          rest_seconds: 90,
        }),
      }),
      adminRequest("/rest/v1/client_routine_exercises", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          client_routine_day_id: dayA2Id,
          exercise_id: exerciseAId,
          sort_order: 1,
          sets_text: "AMRAP",
          reps_text: "as many as possible",
        }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    routineExerciseA1Id = routineExerciseA1[0].id;

    // Dedicated fixture for the concurrency races (Phase 9): the earlier
    // phases deliberately delete dayA1/exerciseAId to test snapshot
    // survival, so a fresh day + exercise is needed here, independent of
    // that narrative.
    const [exerciseRace] = (await adminRequest("/rest/v1/exercise_library", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, name: "Deadlift", slug: `deadlift-${suffix}-race` }),
    })) as Array<{ id: string }>;
    exerciseRaceId = exerciseRace.id;

    const [dayRace] = (await adminRequest("/rest/v1/client_routine_days", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ client_routine_id: routineAId, day_index: 3, title: "Race Day" }),
    })) as Array<{ id: string }>;
    dayRaceId = dayRace.id;

    await adminRequest("/rest/v1/client_routine_exercises", {
      method: "POST",
      body: JSON.stringify({
        client_routine_day_id: dayRaceId,
        exercise_id: exerciseRace.id,
        sort_order: 1,
        sets_text: "2x5",
        reps_text: "5",
      }),
    });
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routine_sessions?client_id=in.(${clientAId},${clientBId})`, { method: "DELETE" });
    await adminRequest(`/rest/v1/client_routines?client_id=in.(${clientAId},${clientBId})`, { method: "DELETE" });
    await adminRequest(`/rest/v1/exercise_library?id=in.(${exerciseAId},${exerciseBId},${exerciseRaceId})`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=in.(${clientAId},${clientBId})`, { method: "DELETE" });
    await Promise.all(
      [clientAUserId, clientBUserId, staffAUserId, staffBUserId].map((id) => deleteAuthUser(id)),
    );
    await adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})`, { method: "DELETE" });

    // Broader than createdSessionIds on purpose: the concurrency races in
    // Phase 9 create dozens more sessions than the ones individually
    // tracked in that array, so this checks every session belonging to
    // either client, not just the explicitly-listed ids.
    const [leftoverSessions, leftoverRoutines, leftoverExercises, leftoverClients, leftoverGyms] = (await Promise.all([
      adminRequest(`/rest/v1/client_routine_sessions?client_id=in.(${clientAId},${clientBId})&select=id`),
      adminRequest(`/rest/v1/client_routines?id=in.(${routineAId},${routineADraftId},${routineBId})&select=id`),
      adminRequest(`/rest/v1/exercise_library?id=in.(${exerciseAId},${exerciseBId},${exerciseRaceId})&select=id`),
      adminRequest(`/rest/v1/clients?id=in.(${clientAId},${clientBId})&select=id`),
      adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})&select=id`),
    ])) as [unknown[], unknown[], unknown[], unknown[], unknown[]];

    assert.deepEqual(leftoverSessions, [], "test sessions must not remain after cleanup");
    assert.deepEqual(leftoverRoutines, [], "test routines must not remain after cleanup");
    assert.deepEqual(leftoverExercises, [], "test exercises must not remain after cleanup");
    assert.deepEqual(leftoverClients, [], "test clients must not remain after cleanup");
    assert.deepEqual(leftoverGyms, [], "test gyms must not remain after cleanup");

    const leftoverProfiles = (await adminRequest(
      `/rest/v1/profiles?id=in.(${clientAUserId},${clientBUserId},${staffAUserId},${staffBUserId})&select=id`,
    )) as unknown[];
    assert.deepEqual(leftoverProfiles, [], "test profiles must not remain after cleanup");

    for (const userId of [clientAUserId, clientBUserId, staffAUserId, staffBUserId]) {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      });
      assert.equal(response.status, 404, `auth user ${userId} must not remain after cleanup`);
    }
  });

  // ---------------------------------------------------------------------
  // Phase 0: manipulated / invalid day ids, before client A has any session
  // ---------------------------------------------------------------------

  test("starting with another client's day is rejected", async () => {
    const { status, body } = await startSession(clientAToken, dayB1Id, randomUUID());
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /routine day not found or not active/);
  });

  test("starting with a day from a draft (not active) routine is rejected", async () => {
    const { status, body } = await startSession(clientAToken, dayADraftId, randomUUID());
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /routine day not found or not active/);
  });

  // ---------------------------------------------------------------------
  // Phase 1: start, snapshot correctness, idempotency semantics
  // ---------------------------------------------------------------------

  let session1Id!: string;
  let session1FirstKey!: string;

  test("starts a fresh session and snapshots the day's exercises and sets", async () => {
    session1FirstKey = randomUUID();
    const { status, body } = await startSession(clientAToken, dayA1Id, session1FirstKey);
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.resumed, false);
    assert.equal(row.requested_day_matches, true);
    session1Id = row.session_id;
    createdSessionIds.push(session1Id);

    const [sessionRow] = (await adminRequest(
      `/rest/v1/client_routine_sessions?id=eq.${session1Id}&select=routine_title,day_index,day_title,day_notes,status,total_sets_count,completed_sets_count`,
    )) as Array<{
      routine_title: string;
      day_index: number;
      day_title: string;
      day_notes: string | null;
      status: string;
      total_sets_count: number | null;
      completed_sets_count: number | null;
    }>;
    assert.equal(sessionRow.routine_title, "Active Routine A");
    assert.equal(sessionRow.day_index, 1);
    assert.equal(sessionRow.day_title, "Push Day");
    assert.equal(sessionRow.day_notes, "Warm up first");
    assert.equal(sessionRow.status, "in_progress");
    assert.equal(sessionRow.total_sets_count, null);
    assert.equal(sessionRow.completed_sets_count, null);

    const sessionExercises = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session1Id}`,
    )) as Array<{
      id: string;
      exercise_name: string;
      prescribed_sets_text: string;
      prescribed_weight_text: string;
      version: number;
    }>;
    assert.equal(sessionExercises.length, 1);
    assert.equal(sessionExercises[0].exercise_name, "Bench Press");
    assert.equal(sessionExercises[0].prescribed_sets_text, "4x10");
    assert.equal(sessionExercises[0].prescribed_weight_text, "60kg");
    assert.equal(sessionExercises[0].version, 1);

    const sets = (await adminRequest(
      `/rest/v1/client_routine_session_sets?client_routine_session_exercise_id=eq.${sessionExercises[0].id}&order=set_index`,
    )) as Array<{ set_index: number; weight: number | null; reps: number | null; completed: boolean; version: number }>;
    assert.equal(sets.length, 4, '"4x10" must snapshot exactly 4 empty sets');
    assert.deepEqual(
      sets.map((s) => s.set_index),
      [1, 2, 3, 4],
    );
    for (const s of sets) {
      assert.equal(s.weight, null);
      assert.equal(s.reps, null);
      assert.equal(s.completed, false);
      assert.equal(s.version, 1);
    }
  });

  test("same key + same day resumes the same session", async () => {
    const { status, body } = await startSession(clientAToken, dayA1Id, session1FirstKey);
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.session_id, session1Id);
    assert.equal(row.resumed, true);
    assert.equal(row.requested_day_matches, true);
  });

  test("different key with an active session resumes it instead of creating another", async () => {
    const { status, body } = await startSession(clientAToken, dayA1Id, randomUUID());
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.session_id, session1Id);
    assert.equal(row.resumed, true);
  });

  test("same key reused against a different day is rejected", async () => {
    const { status, body } = await startSession(clientAToken, dayA2Id, session1FirstKey);
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /idempotency_key already used for a different day/);
  });

  test("different key targeting a different day returns the active session, day mismatch flagged", async () => {
    const { status, body } = await startSession(clientAToken, dayA2Id, randomUUID());
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.session_id, session1Id, "must return the existing active session, never a new one");
    assert.equal(row.resumed, true);
    assert.equal(row.requested_day_matches, false);
  });

  test("no second session was ever created for client A", async () => {
    const sessions = (await adminRequest(
      `/rest/v1/client_routine_sessions?client_id=eq.${clientAId}&status=eq.in_progress&select=id`,
    )) as Array<{ id: string }>;
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, session1Id);
  });

  // ---------------------------------------------------------------------
  // Phase 2: registering sets and exercise notes, optimistic concurrency
  // ---------------------------------------------------------------------

  let sessionExercise1Id!: string;
  let firstSetId!: string;

  test("registers a set's realized values", async () => {
    const [sessionExercise] = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session1Id}&select=id`,
    )) as Array<{ id: string }>;
    sessionExercise1Id = sessionExercise.id;

    const [firstSet] = (await adminRequest(
      `/rest/v1/client_routine_session_sets?client_routine_session_exercise_id=eq.${sessionExercise1Id}&set_index=eq.1`,
    )) as Array<{ id: string; version: number }>;
    firstSetId = firstSet.id;

    const { status, body } = await updateSet(clientAToken, firstSetId, firstSet.version, {
      weight: 60,
      reps: 10,
      completed: true,
      notes: "felt good",
    });
    assert.equal(status, 200);
    const [row] = body as SetRow[];
    assert.equal(row.conflict, false);
    assert.equal(row.version, firstSet.version + 1);
    assert.equal(Number(row.weight), 60);
    assert.equal(row.reps, 10);
    assert.equal(row.completed, true);
    assert.equal(row.notes, "felt good");
  });

  test("a stale expected_version on a set update is a safe, distinguishable conflict", async () => {
    // version is now 2 after the previous test; retry with the stale
    // (already superseded) version 1, simulating two tabs.
    const { status, body } = await updateSet(clientAToken, firstSetId, 1, {
      weight: 999,
      reps: 999,
      completed: false,
      notes: "should never apply",
    });
    assert.equal(status, 200);
    const [row] = body as SetRow[];
    assert.equal(row.conflict, true);
    assert.equal(Number(row.weight), 60, "the real, previously-saved value must be returned untouched");
    assert.equal(row.reps, 10);
    assert.equal(row.notes, "felt good");
  });

  test("registers an exercise-level realized note", async () => {
    const { status, body } = await updateExerciseNote(clientAToken, sessionExercise1Id, 1, "chest felt strong today");
    assert.equal(status, 200);
    const [row] = body as ExerciseNoteRow[];
    assert.equal(row.conflict, false);
    assert.equal(row.version, 2);
    assert.equal(row.client_notes, "chest felt strong today");
  });

  test("a stale expected_version on an exercise note update is a safe, distinguishable conflict", async () => {
    const { status, body } = await updateExerciseNote(clientAToken, sessionExercise1Id, 1, "should never apply");
    assert.equal(status, 200);
    const [row] = body as ExerciseNoteRow[];
    assert.equal(row.conflict, true);
    assert.equal(row.client_notes, "chest felt strong today");
  });

  // ---------------------------------------------------------------------
  // Phase 3: finishing (incomplete allowed), retry idempotency, immutability
  // ---------------------------------------------------------------------

  test("finishing with only 1 of 4 sets completed is allowed and reports the real count", async () => {
    const { status, body } = await finishSession(clientAToken, session1Id, "good first session");
    assert.equal(status, 200);
    const [row] = body as FinishRow[];
    assert.equal(row.status, "completed");
    assert.equal(row.completed_sets_count, 1);
    assert.equal(row.total_sets_count, 4);
    assert.ok(row.completed_at);
  });

  test("retrying finish on an already-completed session returns the identical result and does not write", async () => {
    const first = await finishSession(clientAToken, session1Id, "SHOULD BE IGNORED");
    const [firstRow] = first.body as FinishRow[];

    const [sessionBefore] = (await adminRequest(
      `/rest/v1/client_routine_sessions?id=eq.${session1Id}&select=client_notes,completed_at`,
    )) as Array<{ client_notes: string; completed_at: string }>;

    assert.equal(sessionBefore.client_notes, "good first session", "retry must not overwrite client_notes");
    assert.equal(firstRow.completed_sets_count, 1);
    assert.equal(firstRow.total_sets_count, 4);
    assert.equal(firstRow.completed_at, sessionBefore.completed_at);
  });

  test("a completed session rejects further set updates", async () => {
    const { status, body } = await updateSet(clientAToken, firstSetId, 2, {
      weight: 1,
      reps: 1,
      completed: false,
      notes: "nope",
    });
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /session is not in progress/);
  });

  test("a completed session rejects further exercise note updates", async () => {
    const { status } = await updateExerciseNote(clientAToken, sessionExercise1Id, 2, "nope");
    assert.equal(status, 400);
  });

  test("a completed session is immutable even to a direct service-role write, by trigger", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_sessions?id=eq.${session1Id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ routine_title: "hacked title" }),
    });
    assert.equal(response.status, 400, "the snapshot-protection trigger must reject this regardless of caller privilege");
    const body = (await response.json()) as { message: string };
    assert.match(body.message, /immutable/);
  });

  // ---------------------------------------------------------------------
  // Phase 4: a second session (AMRAP -> 1 set fallback parsing)
  // ---------------------------------------------------------------------

  let session2Id!: string;

  test("client A can start a new session once the previous one is completed, and AMRAP parses to exactly 1 set", async () => {
    const { status, body } = await startSession(clientAToken, dayA2Id, randomUUID());
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.resumed, false);
    session2Id = row.session_id;
    createdSessionIds.push(session2Id);

    const [sessionExercise] = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session2Id}&select=id,prescribed_sets_text`,
    )) as Array<{ id: string; prescribed_sets_text: string }>;
    assert.equal(sessionExercise.prescribed_sets_text, "AMRAP");

    const sets = (await adminRequest(
      `/rest/v1/client_routine_session_sets?client_routine_session_exercise_id=eq.${sessionExercise.id}`,
    )) as unknown[];
    assert.equal(sets.length, 1, 'an unparseable sets_text ("AMRAP") must fall back to exactly 1 set');
  });

  // ---------------------------------------------------------------------
  // Phase 5: abandon, its own idempotency, and cross-terminal-state conflicts
  // ---------------------------------------------------------------------

  test("abandoning an in_progress session changes its state and persists a real (zero) count, without deleting rows", async () => {
    const { status, body } = await abandonSession(clientAToken, session2Id);
    assert.equal(status, 200);
    const [row] = body as AbandonRow[];
    assert.equal(row.status, "abandoned");
    assert.equal(row.completed_sets_count, 0);
    assert.equal(row.total_sets_count, 1);
    assert.ok(row.abandoned_at);

    const sessionExercises = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session2Id}&select=id`,
    )) as unknown[];
    assert.equal(sessionExercises.length, 1, "abandoning must not delete the session's rows");
  });

  test("retrying abandon on an already-abandoned session returns the identical result", async () => {
    const { status, body } = await abandonSession(clientAToken, session2Id);
    assert.equal(status, 200);
    const [row] = body as AbandonRow[];
    assert.equal(row.status, "abandoned");
    assert.equal(row.completed_sets_count, 0);
    assert.equal(row.total_sets_count, 1);
  });

  test("finishing an already-abandoned session is a real, distinct conflict", async () => {
    const { status, body } = await finishSession(clientAToken, session2Id, "too late");
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /discarded and cannot be finished/);
  });

  test("abandoning an already-completed session is a real, distinct conflict", async () => {
    const { status, body } = await abandonSession(clientAToken, session1Id);
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /already finished and cannot be discarded/);
  });

  // ---------------------------------------------------------------------
  // Phase 6: the in_progress slot is free again; concurrent start race
  // ---------------------------------------------------------------------

  let session3Id!: string;

  test("two concurrent start calls with different keys converge to a single new session", async () => {
    const keyX = randomUUID();
    const keyY = randomUUID();

    const [resultX, resultY] = await Promise.all([
      startSession(clientAToken, dayA1Id, keyX),
      startSession(clientAToken, dayA1Id, keyY),
    ]);

    assert.equal(resultX.status, 200);
    assert.equal(resultY.status, 200);
    const rowX = (resultX.body as StartRow[])[0];
    const rowY = (resultY.body as StartRow[])[0];

    assert.equal(rowX.session_id, rowY.session_id, "both concurrent calls must resolve to the same session");
    session3Id = rowX.session_id;
    createdSessionIds.push(session3Id);

    const inProgress = (await adminRequest(
      `/rest/v1/client_routine_sessions?client_id=eq.${clientAId}&status=eq.in_progress&select=id`,
    )) as Array<{ id: string }>;
    assert.equal(inProgress.length, 1, "the race must never produce two in_progress rows");
    assert.equal(inProgress[0].id, session3Id);
  });

  test("a manipulated day id is ignored while a session is already active -- the active session wins", async () => {
    const { status, body } = await startSession(clientAToken, dayB1Id, randomUUID());
    assert.equal(status, 200);
    const [row] = body as StartRow[];
    assert.equal(row.session_id, session3Id);
    assert.equal(row.resumed, true);
    assert.equal(row.requested_day_matches, false);
  });

  // ---------------------------------------------------------------------
  // Phase 7: cross-client / cross-gym RLS and RPC authorization
  // ---------------------------------------------------------------------

  test("client B cannot read client A's sessions via RLS", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_sessions?id=eq.${session1Id}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${clientBToken}`,
      },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body, [], "RLS must hide client A's session from client B entirely");
  });

  test("client B cannot update client A's set via the RPC", async () => {
    const { status, body } = await updateSet(clientBToken, firstSetId, 2, {
      weight: 1,
      reps: 1,
      completed: false,
      notes: "cross-client attempt",
    });
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /not authorized|not in progress|not found/);
  });

  test("client B cannot finish or abandon client A's session via the RPC", async () => {
    const finishResult = await finishSession(clientBToken, session3Id, "cross-client attempt");
    assert.equal(finishResult.status, 400);

    const abandonResult = await abandonSession(clientBToken, session3Id);
    assert.equal(abandonResult.status, 400);
  });

  test("staff of the same gym can read a client's sessions", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_sessions?id=eq.${session1Id}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${staffAToken}`,
      },
    });
    const body = (await response.json()) as unknown[];
    assert.equal(response.status, 200);
    assert.equal(body.length, 1, "staff of the owning gym must be able to read the session");
  });

  test("staff cannot write sessions in 1A -- the RPCs reject them (no linked client)", async () => {
    const { status, body } = await abandonSession(staffAToken, session3Id);
    assert.equal(status, 400);
    assert.match((body as { message: string }).message, /no linked client/);
  });

  test("staff of a different gym cannot read the session at all", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_sessions?id=eq.${session1Id}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${staffBToken}`,
      },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body, [], "cross-gym staff must not see the session");
  });

  // ---------------------------------------------------------------------
  // Phase 8: editing/deleting the source template never touches a snapshot
  // ---------------------------------------------------------------------

  test("editing the original routine exercise afterward does not change the completed session's snapshot", async () => {
    await adminRequest(`/rest/v1/client_routine_exercises?id=eq.${routineExerciseA1Id}`, {
      method: "PATCH",
      body: JSON.stringify({ sets_text: "5x5", target_weight_text: "100kg" }),
    });

    const [sessionExercise] = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session1Id}&select=prescribed_sets_text,prescribed_weight_text`,
    )) as Array<{ prescribed_sets_text: string; prescribed_weight_text: string }>;

    assert.equal(sessionExercise.prescribed_sets_text, "4x10", "the snapshot must be unaffected by editing the template afterward");
    assert.equal(sessionExercise.prescribed_weight_text, "60kg");
  });

  test("deleting the original routine day afterward nulls the reference but keeps the snapshot text intact", async () => {
    await adminRequest(`/rest/v1/client_routine_days?id=eq.${dayA1Id}`, { method: "DELETE" });

    const [sessionRow] = (await adminRequest(
      `/rest/v1/client_routine_sessions?id=eq.${session1Id}&select=client_routine_day_id,day_title,day_index,day_notes`,
    )) as Array<{ client_routine_day_id: string | null; day_title: string; day_index: number; day_notes: string | null }>;

    assert.equal(sessionRow.client_routine_day_id, null, "on delete set null for the traceability reference");
    assert.equal(sessionRow.day_title, "Push Day", "the snapshot text must survive the source day being deleted");
    assert.equal(sessionRow.day_index, 1);
    assert.equal(sessionRow.day_notes, "Warm up first");
  });

  test("deleting the original exercise library entry afterward nulls its reference but keeps the snapshot name intact", async () => {
    // client_routine_exercises.exercise_id is "on delete restrict" (a
    // prescription is not allowed to dangle) -- dayA1's own row was
    // already cascade-deleted with dayA1 above, but dayA2's still
    // references exerciseAId and must be cleared first, same as deleting
    // a real exercise from the library would require in the app itself.
    await adminRequest(`/rest/v1/client_routine_exercises?exercise_id=eq.${exerciseAId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/exercise_library?id=eq.${exerciseAId}`, { method: "DELETE" });

    const [sessionExercise] = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${session1Id}&select=exercise_id,exercise_name`,
    )) as Array<{ exercise_id: string | null; exercise_name: string }>;

    assert.equal(sessionExercise.exercise_id, null, "on delete set null for the traceability reference");
    assert.equal(sessionExercise.exercise_name, "Bench Press", "the snapshot name must survive the source exercise being deleted");

    // The after() hook no longer needs to delete exerciseAId itself, but it
    // still deletes by id set, which is a harmless no-op for an id that's
    // already gone -- session2's exercise still references exerciseAId too
    // (now null), so leave the fixture list as-is.
  });

  test("finish session 3 so the after() cleanup has no lingering in_progress row", async () => {
    const { status } = await finishSession(clientAToken, session3Id, null);
    assert.equal(status, 200);
  });

  // ---------------------------------------------------------------------
  // Phase 9: real concurrent races. Each race fires two genuinely
  // simultaneous HTTP calls (Promise.all, no artificial delay -- each
  // request is its own PostgREST transaction) and inspects the final,
  // committed database state, not just the two HTTP responses -- so a bug
  // that produced a "successful" response without a matching persisted
  // write would still be caught. Run RACE_ITERATIONS times per scenario:
  // the fix in the RPC migration (session-row lock first, then the child
  // row) makes the outcome correct regardless of whether the two calls
  // truly overlap on a given run, but repeating increases the chance of
  // genuine lock contention and catches intermittent regressions.
  // ---------------------------------------------------------------------

  const RACE_ITERATIONS = 15;

  async function startRaceSession() {
    const { body } = await startSession(clientAToken, dayRaceId, randomUUID());
    const sessionId = (body as StartRow[])[0].session_id;

    const [sessionExercise] = (await adminRequest(
      `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${sessionId}&select=id,version`,
    )) as Array<{ id: string; version: number }>;

    const [firstSet] = (await adminRequest(
      `/rest/v1/client_routine_session_sets?client_routine_session_exercise_id=eq.${sessionExercise.id}&set_index=eq.1`,
    )) as Array<{ id: string; version: number }>;

    return { sessionId, sessionExerciseId: sessionExercise.id, sessionExerciseVersion: sessionExercise.version, setId: firstSet.id, setVersion: firstSet.version };
  }

  test("race: updating a set concurrently with finishing never loses data and never leaves inconsistent counters", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId, setId, setVersion } = await startRaceSession();

      const [updateResult, finishResult] = await Promise.all([
        updateSet(clientAToken, setId, setVersion, { weight: 42, reps: 5, completed: true, notes: "race" }),
        finishSession(clientAToken, sessionId, "race finish"),
      ]);

      // finish is the only terminal transition in this race -- it must
      // always eventually succeed exactly once.
      assert.equal(finishResult.status, 200, `iteration ${i}: finish must succeed`);

      const [finalSet] = (await adminRequest(
        `/rest/v1/client_routine_session_sets?id=eq.${setId}&select=weight,reps,completed`,
      )) as Array<{ weight: number | null; reps: number | null; completed: boolean }>;
      const [finalSession] = (await adminRequest(
        `/rest/v1/client_routine_sessions?id=eq.${sessionId}&select=status,completed_sets_count,total_sets_count`,
      )) as Array<{ status: string; completed_sets_count: number; total_sets_count: number }>;

      assert.equal(finalSession.status, "completed", `iteration ${i}`);
      assert.equal(finalSession.total_sets_count, 2, `iteration ${i}`);

      const updateWon = updateResult.status === 200 && (updateResult.body as SetRow[])[0].conflict === false;

      if (updateWon) {
        assert.equal(Number(finalSet.weight), 42, `iteration ${i}: a winning update must be persisted`);
        assert.equal(finalSet.completed, true, `iteration ${i}`);
        assert.equal(finalSession.completed_sets_count, 1, `iteration ${i}: finish's count must include the set that won`);
      } else {
        assert.equal(updateResult.status, 400, `iteration ${i}: a losing update must be a hard rejection, not a false success`);
        assert.equal(finalSet.weight, null, `iteration ${i}: a rejected update must never be applied`);
        assert.equal(finalSet.completed, false, `iteration ${i}`);
        assert.equal(finalSession.completed_sets_count, 0, `iteration ${i}`);
      }
    }
  });

  test("race: updating an exercise note concurrently with finishing never applies after the terminal transition", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId, sessionExerciseId, sessionExerciseVersion } = await startRaceSession();

      const [noteResult, finishResult] = await Promise.all([
        updateExerciseNote(clientAToken, sessionExerciseId, sessionExerciseVersion, "race note"),
        finishSession(clientAToken, sessionId, null),
      ]);

      assert.equal(finishResult.status, 200, `iteration ${i}`);

      const [finalExercise] = (await adminRequest(
        `/rest/v1/client_routine_session_exercises?id=eq.${sessionExerciseId}&select=client_notes`,
      )) as Array<{ client_notes: string | null }>;

      const noteWon = noteResult.status === 200 && (noteResult.body as ExerciseNoteRow[])[0].conflict === false;

      if (noteWon) {
        assert.equal(finalExercise.client_notes, "race note", `iteration ${i}: a winning note update must be persisted`);
      } else {
        assert.equal(noteResult.status, 400, `iteration ${i}: a losing note update must be a hard rejection`);
        assert.equal(finalExercise.client_notes, null, `iteration ${i}: a rejected note update must never be applied`);
      }
    }
  });

  test("race: updating a set concurrently with abandoning never loses data and never leaves inconsistent counters", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId, setId, setVersion } = await startRaceSession();

      const [updateResult, abandonResult] = await Promise.all([
        updateSet(clientAToken, setId, setVersion, { weight: 99, reps: 5, completed: true, notes: "race" }),
        abandonSession(clientAToken, sessionId),
      ]);

      assert.equal(abandonResult.status, 200, `iteration ${i}: abandon must succeed`);

      const [finalSet] = (await adminRequest(
        `/rest/v1/client_routine_session_sets?id=eq.${setId}&select=weight,completed`,
      )) as Array<{ weight: number | null; completed: boolean }>;
      const [finalSession] = (await adminRequest(
        `/rest/v1/client_routine_sessions?id=eq.${sessionId}&select=status,completed_sets_count,total_sets_count`,
      )) as Array<{ status: string; completed_sets_count: number; total_sets_count: number }>;

      assert.equal(finalSession.status, "abandoned", `iteration ${i}`);
      assert.equal(finalSession.total_sets_count, 2, `iteration ${i}`);

      const updateWon = updateResult.status === 200 && (updateResult.body as SetRow[])[0].conflict === false;

      if (updateWon) {
        assert.equal(Number(finalSet.weight), 99, `iteration ${i}`);
        assert.equal(finalSession.completed_sets_count, 1, `iteration ${i}`);
      } else {
        assert.equal(updateResult.status, 400, `iteration ${i}: a losing update must be a hard rejection`);
        assert.equal(finalSet.weight, null, `iteration ${i}`);
        assert.equal(finalSession.completed_sets_count, 0, `iteration ${i}`);
      }
    }
  });

  test("race: finishing concurrently with abandoning resolves to exactly one terminal state, never both, never neither", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId } = await startRaceSession();

      const [finishResult, abandonResult] = await Promise.all([
        finishSession(clientAToken, sessionId, "race finish"),
        abandonSession(clientAToken, sessionId),
      ]);

      const finishWon = finishResult.status === 200;
      const abandonWon = abandonResult.status === 200;

      assert.notEqual(finishWon, abandonWon, `iteration ${i}: exactly one of finish/abandon must win -- never both, never neither`);

      const [finalSession] = (await adminRequest(
        `/rest/v1/client_routine_sessions?id=eq.${sessionId}&select=status`,
      )) as Array<{ status: string }>;

      if (finishWon) {
        assert.equal(finalSession.status, "completed", `iteration ${i}`);
        assert.equal(abandonResult.status, 400, `iteration ${i}: the losing call must be a hard rejection`);
      } else {
        assert.equal(finalSession.status, "abandoned", `iteration ${i}`);
        assert.equal(finishResult.status, 400, `iteration ${i}: the losing call must be a hard rejection`);
      }
    }
  });

  test("race: two concurrent finishes on the same session agree on the identical result", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId } = await startRaceSession();

      const [resultX, resultY] = await Promise.all([
        finishSession(clientAToken, sessionId, "concurrent finish X"),
        finishSession(clientAToken, sessionId, "concurrent finish Y"),
      ]);

      assert.equal(resultX.status, 200, `iteration ${i}`);
      assert.equal(resultY.status, 200, `iteration ${i}`);

      const rowX = (resultX.body as FinishRow[])[0];
      const rowY = (resultY.body as FinishRow[])[0];

      assert.deepEqual(rowX, rowY, `iteration ${i}: two concurrent finishes must agree on the exact same persisted result`);

      const [finalSession] = (await adminRequest(
        `/rest/v1/client_routine_sessions?id=eq.${sessionId}&select=status`,
      )) as Array<{ status: string }>;
      assert.equal(finalSession.status, "completed", `iteration ${i}`);
    }
  });

  test("race: two concurrent abandons on the same session agree on the identical result", async () => {
    for (let i = 0; i < RACE_ITERATIONS; i++) {
      const { sessionId } = await startRaceSession();

      const [resultX, resultY] = await Promise.all([
        abandonSession(clientAToken, sessionId),
        abandonSession(clientAToken, sessionId),
      ]);

      assert.equal(resultX.status, 200, `iteration ${i}`);
      assert.equal(resultY.status, 200, `iteration ${i}`);

      const rowX = (resultX.body as AbandonRow[])[0];
      const rowY = (resultY.body as AbandonRow[])[0];

      assert.deepEqual(rowX, rowY, `iteration ${i}: two concurrent abandons must agree on the exact same persisted result`);

      const [finalSession] = (await adminRequest(
        `/rest/v1/client_routine_sessions?id=eq.${sessionId}&select=status`,
      )) as Array<{ status: string }>;
      assert.equal(finalSession.status, "abandoned", `iteration ${i}`);
    }
  });

  test("a terminal set/exercise cannot be edited even by a direct service-role write, by trigger", async () => {
    const { sessionId, sessionExerciseId, setId } = await startRaceSession();
    await finishSession(clientAToken, sessionId, null);

    const setResponse = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_session_sets?id=eq.${setId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ weight: 1234 }),
    });
    assert.equal(setResponse.status, 400);
    assert.match(((await setResponse.json()) as { message: string }).message, /terminal session/);

    const noteResponse = await fetch(`${SUPABASE_URL}/rest/v1/client_routine_session_exercises?id=eq.${sessionExerciseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ client_notes: "hacked" }),
    });
    assert.equal(noteResponse.status, 400);
    assert.match(((await noteResponse.json()) as { message: string }).message, /terminal session/);
  });

  // ---------------------------------------------------------------------
  // Phase 10: SECURITY DEFINER audit -- every one of the 5 RPCs, called as
  // a genuinely anonymous caller (no EXECUTE grant at all) and as an
  // authenticated caller with no client_user_links row (staff, in this
  // suite). The specific ids passed don't matter -- identity/authorization
  // is checked before anything derived from them is ever used, for all
  // five functions.
  // ---------------------------------------------------------------------

  const GARBAGE_ID = "00000000-0000-0000-0000-0000000000aa";

  const rpcCalls: Array<{ name: string; call: (token: string) => Promise<{ status: number; body: unknown }> }> = [
    { name: "start_routine_session", call: (token) => startSession(token, GARBAGE_ID, randomUUID()) },
    { name: "update_routine_session_set", call: (token) => updateSet(token, GARBAGE_ID, 1, { weight: 1, reps: 1, completed: true, notes: null }) },
    { name: "update_routine_session_exercise_note", call: (token) => updateExerciseNote(token, GARBAGE_ID, 1, "x") },
    { name: "finish_routine_session", call: (token) => finishSession(token, GARBAGE_ID, null) },
    { name: "abandon_routine_session", call: (token) => abandonSession(token, GARBAGE_ID) },
  ];

  for (const { name, call } of rpcCalls) {
    test(`${name}: an anonymous caller is rejected outright (no EXECUTE grant)`, async () => {
      const { status, body } = await call(ANON_KEY);
      assert.equal(status, 401, `${name}: anon must never reach the function body at all`);
      assert.match(
        (body as { message: string }).message,
        /permission denied|JWT/i,
        `${name}: rejection must be a permission/authentication failure, not a logic error`,
      );
    });

    test(`${name}: an authenticated user with no linked client is rejected`, async () => {
      const { status, body } = await call(staffAToken);
      assert.equal(status, 400, `${name}: staff has a profile but no client_user_links row`);
      assert.match((body as { message: string }).message, /no linked client/, `${name}`);
    });
  }

  // ---------------------------------------------------------------------
  // Phase 11: private.parse_prescribed_set_count edge cases, end-to-end
  // through start_routine_session -- not just the SQL function in
  // isolation. In every case, prescribed_sets_text on the snapshot must
  // still be the exact original text: the parsed count is only ever used
  // to decide how many set rows to create, never displayed as if it were
  // the literal prescription.
  // ---------------------------------------------------------------------

  const setCountCases: Array<{ label: string; setsText: string; expectedCount: number }> = [
    { label: '"0" clamps up to 1, not zero rows', setsText: "0", expectedCount: 1 },
    { label: '"-5" has no leading integer (a minus sign never matches), defaults to 1', setsText: "-5", expectedCount: 1 },
    { label: '"25" clamps down to the 20-row cap', setsText: "25", expectedCount: 20 },
    { label: 'a pathologically large leading number clamps to 20 instead of overflowing', setsText: "99999999999999x10", expectedCount: 20 },
  ];

  for (const { label, setsText, expectedCount } of setCountCases) {
    test(`set count parsing: ${label}`, async () => {
      const [exercise] = (await adminRequest("/rest/v1/exercise_library", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ gym_id: gymAId, name: "Edge Case Exercise", slug: `edge-${suffix}-${randomUUID().slice(0, 8)}` }),
      })) as Array<{ id: string }>;

      const [day] = (await adminRequest("/rest/v1/client_routine_days", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ client_routine_id: routineAId, day_index: 4, title: "Edge Case Day" }),
      })) as Array<{ id: string }>;

      await adminRequest("/rest/v1/client_routine_exercises", {
        method: "POST",
        body: JSON.stringify({
          client_routine_day_id: day.id,
          exercise_id: exercise.id,
          sort_order: 1,
          sets_text: setsText,
          reps_text: "n/a",
        }),
      });

      const { status, body } = await startSession(clientAToken, day.id, randomUUID());
      assert.equal(status, 200, label);
      const sessionId = (body as StartRow[])[0].session_id;
      createdSessionIds.push(sessionId);

      const [sessionExercise] = (await adminRequest(
        `/rest/v1/client_routine_session_exercises?client_routine_session_id=eq.${sessionId}&select=id,prescribed_sets_text`,
      )) as Array<{ id: string; prescribed_sets_text: string }>;
      assert.equal(sessionExercise.prescribed_sets_text, setsText, `${label}: the original text must be preserved verbatim`);

      const sets = (await adminRequest(
        `/rest/v1/client_routine_session_sets?client_routine_session_exercise_id=eq.${sessionExercise.id}&select=id`,
      )) as unknown[];
      assert.equal(sets.length, expectedCount, label);

      // Free the one-in-progress slot and the day_index=4 slot for the next
      // case, and remove this iteration's own exercise_library fixture
      // (not tracked by after()'s cleanup, unlike the shared fixtures).
      await abandonSession(clientAToken, sessionId);
      await adminRequest(`/rest/v1/client_routine_days?id=eq.${day.id}`, { method: "DELETE" });
      await adminRequest(`/rest/v1/exercise_library?id=eq.${exercise.id}`, { method: "DELETE" });
    });
  }
});
