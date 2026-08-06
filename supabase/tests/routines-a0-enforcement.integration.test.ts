// Entrega A0.3 (contract stage): the definitive, database-level proof that
// no direct authenticated write can ever change client_routines.status.
// A0.1 (RLS isolation + archive_client_routine RPC) and A0.2 (app
// exclusively uses activate_client_routine/archive_client_routine) are
// already live in production; this migration and this test file are the
// only remaining piece.
//
// Requires a running local Supabase stack, with
// 20260806100000_enforce_client_routine_status_transitions.sql applied.
// Never point SUPABASE_URL at a remote/production project.

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

async function postAs(token: string, path: string, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
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

describe("Entrega A0.3: client_routines.status is unreachable by any direct authenticated write (requires local Supabase running)", () => {
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
      body: JSON.stringify({ name: `A0.3 Enforcement Gym ${suffix}` }),
    })) as Array<{ id: string }>;
    gymId = gym.id;

    const coachEmail = `a03-coach-${suffix}@test.local`;
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
      body: JSON.stringify({ gym_id: gymId, first_name: "A0.3", last_name: `Enforcement ${suffix}`, phone: "5555550800" }),
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

  // --- INSERT ------------------------------------------------------------

  test("INSERT directo con status='draft': permitido", async () => {
    const { status, body } = await postAs(coachToken, "/rest/v1/client_routines", {
      gym_id: gymId,
      client_id: clientId,
      title: "Insert Draft",
      status: "draft",
    });
    assert.equal(status, 201);
    assert.equal(body[0].status, "draft");
  });

  test("INSERT directo con status='active': bloqueado", async () => {
    const { status } = await postAs(coachToken, "/rest/v1/client_routines", {
      gym_id: gymId,
      client_id: clientId,
      title: "Insert Active",
      status: "active",
    });
    assert.equal(status, 400);
    const rows = (await adminRequest(
      `/rest/v1/client_routines?client_id=eq.${clientId}&title=eq.Insert Active&select=id`,
    )) as unknown[];
    assert.deepEqual(rows, []);
  });

  test("INSERT directo con status='archived': bloqueado", async () => {
    const { status } = await postAs(coachToken, "/rest/v1/client_routines", {
      gym_id: gymId,
      client_id: clientId,
      title: "Insert Archived",
      status: "archived",
    });
    assert.equal(status, 400);
    const rows = (await adminRequest(
      `/rest/v1/client_routines?client_id=eq.${clientId}&title=eq.Insert Archived&select=id`,
    )) as unknown[];
    assert.deepEqual(rows, []);
  });

  // --- Direct PATCH: every transition blocked ----------------------------

  test("PATCH directo draft -> active: bloqueado", async () => {
    const routineId = await makeRoutine("Draft to Active");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "active" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "draft");
  });

  test("PATCH directo draft -> archived: bloqueado", async () => {
    const routineId = await makeRoutine("Draft to Archived");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "archived" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "draft");
  });

  test("PATCH directo active -> draft: bloqueado", async () => {
    const routineId = await makeRoutine("Active to Draft", "active");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "draft" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "active");
  });

  test("PATCH directo active -> archived: bloqueado", async () => {
    const routineId = await makeRoutine("Active to Archived", "active");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "archived" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "active");
  });

  test("PATCH directo archived -> draft: bloqueado", async () => {
    const routineId = await makeRoutine("Archived to Draft", "archived");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "draft" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("PATCH directo archived -> active: bloqueado", async () => {
    const routineId = await makeRoutine("Archived to Active", "archived");
    const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, { status: "active" });
    assert.equal(status, 400);
    assert.equal(await statusOf(routineId), "archived");
  });

  // --- Attempts to falsify the authorization mechanism --------------------

  test("intento de falsificar el mecanismo: la función privada del trigger no está expuesta como RPC pública", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/enforce_client_routine_status_transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${coachToken}` },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 404, "PostgREST only exposes public-schema functions; the trigger fn lives in private and is never reachable");
  });

  test("intento de falsificar el mecanismo: no existe ningún endpoint set_config/current_setting alcanzable por PostgREST", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_config`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${coachToken}` },
      body: JSON.stringify({ setting_name: "irrelevant", new_value: "irrelevant", is_local: true }),
    });
    assert.equal(response.status, 404);
  });

  // --- Metadata-only updates work in every status -------------------------

  test("actualizar título/fechas/notas sin cambiar estado funciona en draft, active y archived", async () => {
    for (const initial of ["draft", "active", "archived"] as const) {
      const routineId = await makeRoutine(`Metadata Only ${initial}`, initial);
      const { status } = await patchAs(coachToken, `/rest/v1/client_routines?id=eq.${routineId}`, {
        title: `Metadata Only ${initial} (renamed)`,
        notes: "updated notes",
      });
      assert.equal(status, 200);
      assert.equal(await statusOf(routineId), initial);
    }
  });

  // --- Dedicated RPCs keep working exactly as before ----------------------

  test("activate_client_routine funciona (draft -> active)", async () => {
    const routineId = await makeRoutine("RPC Activate");
    const result = await callRpc("activate_client_routine", coachToken, activatePayload(routineId, clientId, "RPC Activate"));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(await statusOf(routineId), "active");
  });

  test("activar reemplaza y archiva correctamente la rutina activa anterior", async () => {
    const first = await makeRoutine("Replace Previous A", "active");
    const second = await makeRoutine("Replace Previous B");

    const result = await callRpc("activate_client_routine", coachToken, activatePayload(second, clientId, "Replace Previous B"));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body[0].archived_previous, true);
    assert.equal(await statusOf(first), "archived");
    assert.equal(await statusOf(second), "active");
  });

  test("archive_client_routine funciona para draft", async () => {
    const routineId = await makeRoutine("RPC Archive Draft");
    const result = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body[0].already_archived, false);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("archive_client_routine funciona para active", async () => {
    const routineId = await makeRoutine("RPC Archive Active", "active");
    const result = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body[0].already_archived, false);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("repetir archive es idempotente", async () => {
    const routineId = await makeRoutine("RPC Archive Twice", "active");
    const first = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(first.status, 200);
    assert.equal(first.body[0].already_archived, false);
    const second = await callRpc("archive_client_routine", coachToken, { target_routine_id: routineId });
    assert.equal(second.status, 200);
    assert.equal(second.body[0].already_archived, true);
    assert.equal(await statusOf(routineId), "archived");
  });

  test("activate_client_routine puede revivir una rutina archivada (archived -> active), igual que antes de A0.3", async () => {
    const routineId = await makeRoutine("Archived Then Revived", "archived");
    const result = await callRpc("activate_client_routine", coachToken, activatePayload(routineId, clientId, "Archived Then Revived"));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(await statusOf(routineId), "active");
  });

  test("duplicar (INSERT directo con status='draft', el mismo patrón que duplicateRoutineRecord) funciona independientemente del estado de origen", async () => {
    const source = await makeRoutine("Duplicate Source", "active");
    const { status, body } = await postAs(coachToken, "/rest/v1/client_routines", {
      gym_id: gymId,
      client_id: clientId,
      title: "Duplicate Source (Copy)",
      status: "draft",
    });
    assert.equal(status, 201);
    assert.equal(body[0].status, "draft");
    assert.equal(await statusOf(source), "active", "the source routine's own status must stay untouched by duplicating");
  });

  // --- Concurrency ---------------------------------------------------------

  test("concurrencia: dos activaciones simultáneas de dos rutinas distintas para el mismo cliente terminan en un único estado consistente", async () => {
    const routineA = await makeRoutine("Concurrent A");
    const routineB = await makeRoutine("Concurrent B");

    const [resultA, resultB] = await Promise.all([
      callRpc("activate_client_routine", coachToken, activatePayload(routineA, clientId, "Concurrent A")),
      callRpc("activate_client_routine", coachToken, activatePayload(routineB, clientId, "Concurrent B")),
    ]);

    // Both calls must resolve (no unhandled DB error/deadlock); the RPC's
    // own row locking (for update) serializes them.
    assert.ok(resultA.status === 200 && resultB.status === 200, JSON.stringify({ resultA, resultB }));

    const activeRows = (await adminRequest(
      `/rest/v1/client_routines?client_id=eq.${clientId}&status=eq.active&select=id`,
    )) as Array<{ id: string }>;
    assert.equal(activeRows.length, 1, "exactly one routine must end up active, never zero, never two");
  });

  test("doble envío: repetir la misma llamada de archivar dos veces en paralelo no produce dos efectos distintos", async () => {
    const routineId = await makeRoutine("Double Submit Archive", "active");
    const [first, second] = await Promise.all([
      callRpc("archive_client_routine", coachToken, { target_routine_id: routineId }),
      callRpc("archive_client_routine", coachToken, { target_routine_id: routineId }),
    ]);
    assert.ok(first.status === 200 && second.status === 200, JSON.stringify({ first, second }));
    assert.equal(await statusOf(routineId), "archived");
  });
});

describe("Entrega A0.3: authorization on the dedicated RPCs is unaffected by the new trigger (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "TestPass123!";

  let gymAId!: string;
  let gymBId!: string;
  let clientAId!: string;
  let coachAUserId!: string;
  let coachBUserId!: string;
  let coachBToken!: string;
  let clientRoleUserId!: string;
  let clientRoleToken!: string;

  before(async () => {
    const [gymA, gymB] = (await Promise.all([
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0.3 Auth Gym A ${suffix}` }),
      }),
      adminRequest("/rest/v1/gyms", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: `A0.3 Auth Gym B ${suffix}` }),
      }),
    ])) as [Array<{ id: string }>, Array<{ id: string }>];
    gymAId = gymA[0].id;
    gymBId = gymB[0].id;

    const coachAEmail = `a03-auth-coach-a-${suffix}@test.local`;
    coachAUserId = await createAuthUser(coachAEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: coachAUserId, email: coachAEmail, role: "admin", gym_id: gymAId }),
    });

    const coachBEmail = `a03-auth-coach-b-${suffix}@test.local`;
    coachBUserId = await createAuthUser(coachBEmail, password);
    await adminRequest("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: coachBUserId, email: coachBEmail, role: "admin", gym_id: gymBId }),
    });
    coachBToken = await signIn(coachBEmail, password);

    const clientRoleEmail = `a03-auth-clientrole-${suffix}@test.local`;
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
      body: JSON.stringify({ gym_id: gymAId, first_name: "Auth", last_name: `Client ${suffix}`, phone: "5555550900" }),
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

  test("un coach de otro gimnasio (B) no puede activar una rutina del gimnasio A", async () => {
    const routineId = await makeDraftRoutine("Cross Gym Activate");
    const result = await callRpc("activate_client_routine", coachBToken, activatePayload(routineId, clientAId, "Cross Gym Activate"));
    assert.equal(result.status, 400);
  });

  test("un coach de otro gimnasio (B) no puede archivar una rutina del gimnasio A", async () => {
    const routineId = await makeDraftRoutine("Cross Gym Archive");
    const result = await callRpc("archive_client_routine", coachBToken, { target_routine_id: routineId });
    assert.equal(result.status, 400);
  });

  test("el rol 'client' no puede ejecutar activate_client_routine", async () => {
    const routineId = await makeDraftRoutine("Client Role Activate");
    const result = await callRpc("activate_client_routine", clientRoleToken, activatePayload(routineId, clientAId, "Client Role Activate"));
    assert.equal(result.status, 400);
  });

  test("el rol 'client' no puede ejecutar archive_client_routine", async () => {
    const routineId = await makeDraftRoutine("Client Role Archive");
    const result = await callRpc("archive_client_routine", clientRoleToken, { target_routine_id: routineId });
    assert.equal(result.status, 400);
  });

  test("anon no puede ejecutar activate_client_routine", async () => {
    const routineId = await makeDraftRoutine("Anon Activate");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/activate_client_routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify(activatePayload(routineId, clientAId, "Anon Activate")),
    });
    assert.ok(response.status === 401 || response.status === 403, `unexpected status ${response.status}`);
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

  test("anon no puede insertar client_routines en absoluto (INSERT draft directo también requiere autenticación)", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/client_routines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymAId, client_id: clientAId, title: "Anon Insert", status: "draft" }),
    });
    assert.ok(response.status === 401 || response.status === 403, `unexpected status ${response.status}`);
  });
});

describe("Entrega A0.3: service_role keeps its documented administrative access (requires local Supabase running)", () => {
  const suffix = randomUUID().slice(0, 8);
  let gymId!: string;
  let clientId!: string;

  before(async () => {
    const [gym] = (await adminRequest("/rest/v1/gyms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: `A0.3 Service Role Gym ${suffix}` }),
    })) as Array<{ id: string }>;
    gymId = gym.id;
    const [client] = (await adminRequest("/rest/v1/clients", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, first_name: "SvcRole", last_name: `Test ${suffix}`, phone: "5555551000" }),
    })) as Array<{ id: string }>;
    clientId = client.id;
  });

  after(async () => {
    await adminRequest(`/rest/v1/client_routines?client_id=eq.${clientId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/clients?id=eq.${clientId}`, { method: "DELETE" });
    await adminRequest(`/rest/v1/gyms?id=eq.${gymId}`, { method: "DELETE" });
  });

  test("service_role puede insertar una rutina directamente como 'active' (contexto administrativo de confianza, p. ej. fixtures/migraciones/scripts)", async () => {
    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientId, title: "Service Role Direct Active", status: "active" }),
    })) as Array<{ id: string; status: string }>;
    assert.equal(routine.status, "active");
  });

  test("service_role puede hacer cualquier transición directa de status (p. ej. active -> draft), algo que authenticated nunca puede", async () => {
    // Archive whatever the previous test left active first -- the unique
    // "one active routine per client" index is a separate, legitimate,
    // pre-existing constraint (not part of this trigger) that this test
    // must not collide with.
    await adminRequest(`/rest/v1/client_routines?client_id=eq.${clientId}&status=eq.active`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });

    const [routine] = (await adminRequest("/rest/v1/client_routines", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ gym_id: gymId, client_id: clientId, title: "Service Role Any Transition", status: "active" }),
    })) as Array<{ id: string }>;

    await adminRequest(`/rest/v1/client_routines?id=eq.${routine.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
    });

    const rows = (await adminRequest(`/rest/v1/client_routines?id=eq.${routine.id}&select=status`)) as Array<{
      status: string;
    }>;
    assert.equal(rows[0].status, "draft");
  });
});
