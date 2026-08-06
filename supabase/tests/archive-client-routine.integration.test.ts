// Entrega A0.1 (expand stage): the new archive_client_routine RPC, plus an
// explicit backward-compatibility check that the currently-deployed app's
// own archiving path (a direct UPDATE of client_routines.status) still
// works completely unaffected. This file intentionally does NOT test that
// a direct PATCH is blocked -- that enforcement (a trigger) is Entrega
// A0.3's concern and does not exist yet at this stage. Every test here
// must pass against a database built from `main` + only A0.1's two
// migrations, with zero app code changes.
//
// Requires a running local Supabase stack. Never point SUPABASE_URL at a
// remote/production project.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { ANON_KEY, SUPABASE_URL, adminRequest, callRpc, createAuthUser, deleteAuthUser, signIn } from "./helpers";

async function patchAs(token: string, path: string, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function activatePayload(routineId: string, clientId: string, title: string) {
  return {
    target_routine_id: routineId,
    target_client_id: clientId,
    target_title: title,
    target_notes: "",
    target_starts_on: null,
    target_ends_on: null,
  };
}

describe("Entrega A0.1: archive_client_routine RPC + old-app compatibility (requires local Supabase running, main + A0.1 migrations only)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymId!: string;
  let coachUserId!: string;
  let coachToken!: string;
  let clientId!: string;

  before(async () => {
    const [gym] = (await adminRequest("/rest/v1/gyms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: `A0.1 Archive RPC Gym ${suffix}` }),
    })) as Array<{ id: string }>;
    gymId = gym.id;

    const coachEmail = `a01-archive-coach-${suffix}@test.local`;
    coachUserId = await createAuthUser(coachEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: coachUserId, email: coachEmail, role: "admin", gym_id: gymId }),
    });
    coachToken = await signIn(coachEmail, password);

    const [client] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, first_name: "A0.1", last_name: `Archive ${suffix}`, phone: "5555550600" }),
    })) as Array<{ id: string }>;
    clientId = client.id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?client_id=eq.${clientId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=eq.${clientId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/profiles?id=eq.${coachUserId}`, { method: "DELETE" });
    await deleteAuthUser(coachUserId);
    await adminRequest(`/rest/v1/gyms?id=eq.${gymId}`, { method: "DELETE" });
  });

  async function makeRoutine(title: string, status: "draft" | "active" | "archived" = "draft") {
    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientId, title, status: "draft" }),
    })) as Array<{ id: string }>;

    if (status === "active") {
      const result = await callRpc("activate_client_routine", coachToken, activatePayload(routine.id, clientId, title));
      assert.equal(result.status, 200, JSON.stringify(result.body));
    } else if (status === "archived") {
      const result = await callRpc("archive_client_routine", coachToken, { target_routine_id: routine.id });
      assert.equal(result.status, 200, JSON.stringify(result.body));
    }

    return routine.id as string;
  }

  async function statusOf(routineId: string): Promise<string> {
    const rows = (await adminRequest(`/rest/v1/client_routines?id=eq.${routineId}&select=status`)) as Array<{
      status: string;
    }>;
    return rows[0].status;
  }

  // --- Historical note: this file was written for the A0.1 gate, when
  //     the OLD app still archived via a direct UPDATE and no enforcement
  //     trigger existed yet -- these two tests originally asserted that
  //     direct UPDATE archiving "still works." Entrega A0.3 adds the
  //     enforcement trigger that deliberately closes exactly that path
  //     (see routines-a0-enforcement.integration.test.ts for the full,
  //     definitive coverage of every direct-write transition). Updated
  //     here to assert the new, permanent reality instead of leaving a
  //     now-obsolete assertion failing in CI.

  test("archivar mediante UPDATE directo (draft -> archived) está bloqueado desde A0.3 -- exclusivamente vía archive_client_routine", async () => {
    const routineId = await makeRoutine("Old App Archive Draft");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "archived" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "draft");
  });

  test("archivar mediante UPDATE directo (active -> archived) está bloqueado desde A0.3", async () => {
    const routineId = await makeRoutine("Old App Archive Active", "active");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "archived" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "active");
  });

  test("[compatibilidad app vieja] activar mediante la RPC preexistente activate_client_routine sigue funcionando sin cambios", async () => {
    const routineId = await makeRoutine("Old App Activate");
    const result = await callRpc("activate_client_routine", coachToken, activatePayload(routineId, clientId, "Old App Activate"));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(await statusOf(routineId), "active");
  });

  // --- The new RPC itself ------------------------------------------------

  test("archivar un borrador mediante la nueva RPC funciona", async () => {
    const routineId = await makeRoutine("RPC Archive Draft");
    const result = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body[0].already_archived, false);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("archivar una rutina activa mediante la nueva RPC funciona", async () => {
    const routineId = await makeRoutine("RPC Archive Active", "active");
    const result = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body[0].already_archived, false);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("repetir la RPC sobre la misma rutina ya archivada es estable/idempotente", async () => {
    const routineId = await makeRoutine("RPC Archive Twice", "active");

    const first = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(first.status, 200);
    assert.equal(first.body[0].already_archived, false);

    const second = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(second.status, 200);
    assert.equal(second.body[0].already_archived, true);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("activar (RPC preexistente) reemplaza la rutina activa anterior, que fue archivada por la nueva RPC", async () => {
    const first = await makeRoutine("Replace Previous A", "active");
    const second = await makeRoutine("Replace Previous B");

    const archived = await callRpc("archive_client_routine", coachToken, { target_routine_id: first });
    assert.equal(archived.status, 200);
    assert.equal(await statusOf(first), "archived");

    const activated = await callRpc("activate_client_routine", coachToken, activatePayload(second, clientId, "Replace Previous B"));
    assert.equal(activated.status, 200, JSON.stringify(activated.body));
    assert.equal(await statusOf(second), "active");
  });

  test("la nueva RPC de archivar puede seguirse de una reactivación vía la RPC preexistente (archived -> active)", async () => {
    const routineId = await makeRoutine("Archived Then Reactivated", "archived");
    const result = await callRpc("activate_client_routine", coachToken, activatePayload(routineId, clientId, "Archived Then Reactivated"));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(await statusOf(routineId), "active");
  });

  test("guardar metadatos (sin tocar status) conserva el estado, en cualquier estado", async () => {
    for (const initial of ["draft", "active", "archived"] as const) {
      const routineId = await makeRoutine(`Metadata preserve ${initial}`, initial);
      const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, {
        title: `Metadata preserve ${initial} (renamed)`,
      });
      assert.equal(status, 200);
      assert.equal(await statusOf(routineId), initial);
    }
  });
});

describe("Entrega A0.1: archive_client_routine authorization -- cross-gym, role, anon (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  let clientAId!: string;
  let coachAUserId!: string;
  let coachAToken!: string;
  let coachBUserId!: string;
  let coachBToken!: string;
  let clientRoleUserId!: string;
  let clientRoleToken!: string;

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0.1 Archive Auth Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0.1 Archive Auth Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    const coachAEmail = `a01-archive-auth-coach-a-${suffix}@test.local`;
    coachAUserId = await createAuthUser(coachAEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: coachAUserId, email: coachAEmail, role: "admin", gym_id: gymAId }),
    });
    coachAToken = await signIn(coachAEmail, password);

    const coachBEmail = `a01-archive-auth-coach-b-${suffix}@test.local`;
    coachBUserId = await createAuthUser(coachBEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: coachBUserId, email: coachBEmail, role: "admin", gym_id: gymBId }),
    });
    coachBToken = await signIn(coachBEmail, password);

    const clientRoleEmail = `a01-archive-auth-clientrole-${suffix}@test.local`;
    clientRoleUserId = await createAuthUser(clientRoleEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: clientRoleUserId, email: clientRoleEmail, role: "client", gym_id: gymAId }),
    });
    clientRoleToken = await signIn(clientRoleEmail, password);

    const [clientA] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, first_name: "Auth", last_name: `Client ${suffix}`, phone: "5555550700" }),
    })) as Array<{ id: string }>;
    clientAId = clientA.id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?client_id=eq.${clientAId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=eq.${clientAId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/profiles?id=in.(${coachAUserId},${coachBUserId},${clientRoleUserId})`, { method: "DELETE" });
    await Promise.all([deleteAuthUser(coachAUserId), deleteAuthUser(coachBUserId), deleteAuthUser(clientRoleUserId)]);
    await adminRequest(`/rest/v1/gyms?id=in.(${gymAId},${gymBId})`, { method: "DELETE" });
  });

  async function makeDraftRoutine(title: string) {
    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title, status: "draft" }),
    })) as Array<{ id: string }>;
    return routine.id as string;
  }

  test("un coach de otro gimnasio (B) no puede archivar una rutina del gimnasio A", async () => {
    const routineId = await makeDraftRoutine("Cross Gym Archive");
    const result = await callRpc("archive_client_routine", coachBToken, { target_routine_id: routineId });
    assert.equal(result.status, 400);
  });

  test("el rol 'client' no puede ejecutar archive_client_routine", async () => {
    const routineId = await makeDraftRoutine("Client Role Archive");
    const result = await callRpc("archive_client_routine", clientRoleToken, { target_routine_id: routineId });
    assert.equal(result.status, 400);
  });

  test("anon no puede ejecutar archive_client_routine", async () => {
    const routineId = await makeDraftRoutine("Anon Archive");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/archive_client_routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ target_routine_id: routineId }),
    });
    assert.ok(response.status === 401 || response.status === 403, `unexpected status ${response.status}`);
  });

  test("intentar archivar una rutina inexistente devuelve un error estable, no un éxito silencioso", async () => {
    const result = await callRpc("archive_client_routine", coachAToken, {
      target_routine_id: "00000000-0000-0000-0000-000000000000",
    });
    assert.equal(result.status, 400);
  });
});
