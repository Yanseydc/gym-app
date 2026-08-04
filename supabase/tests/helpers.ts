// Shared fixtures/helpers for the supabase/tests/*.integration.test.ts
// suite. Every file in this directory drives real PostgREST + GoTrue
// endpoints against a running local Supabase stack (real auth users, real
// JWTs, real RLS) -- see the header comment in
// activate-client-routine.integration.test.ts for the full run
// instructions and the reasoning for keeping these outside `npm test`'s
// `find src -name '*.test.ts'` glob.
//
// Never point SUPABASE_URL at a remote project when running any of these
// files: they create and delete real auth users, gyms, clients, routines
// and (as of this file) workout sessions against whatever project they
// target.

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is required to run this integration test. Start the local stack ` +
        "(`supabase start`) and export the local ANON/SERVICE_ROLE keys it prints " +
        "(see `supabase status`) before running this file. Never point this at a " +
        "remote/production project.",
    );
  }
  return value;
}

export const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY);
export const SERVICE_ROLE_KEY = requireEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function adminRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${await response.text()}`);
  }

  // PostgREST returns an empty body both for 204 No Content and for a
  // plain 201 Created without `Prefer: return=representation` -- checking
  // the actual text (rather than special-casing only 204) means a caller
  // that forgets that header gets `null` back instead of a JSON parse
  // crash on an empty string.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function createAuthUser(email: string, password: string): Promise<string> {
  const user = (await adminRequest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  })) as { id: string };

  return user.id;
}

export async function deleteAuthUser(userId: string) {
  await adminRequest(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}

export async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`sign-in failed for ${email}: ${response.status} ${await response.text()}`);
  }

  const session = (await response.json()) as { access_token: string };
  return session.access_token;
}

/** Calls a PostgREST RPC as the given access token; never throws on a
 * non-2xx response -- callers assert on `status`/`body` themselves, since
 * a rejected call (RLS denial, raised exception, version conflict) is
 * frequently the very thing under test. */
export async function callRpc(fn: string, accessToken: string, payload: unknown) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  return { status: response.status, body };
}
