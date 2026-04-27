import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  Client,
  ClientFormValues,
  ClientListFilters,
  ClientMergeCandidate,
  ClientRecord,
} from "@/modules/clients/types";

function mapClient(record: ClientRecord): Client {
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    phone: record.phone,
    email: record.email,
    status: record.status,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeClientPayload(values: ClientFormValues) {
  const timestamp = new Date().toISOString();
  const email = normalizeClientEmail(values.email);

  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    phone: values.phone.trim(),
    email: email || null,
    status: values.status,
    notes: values.notes.trim() || null,
    updated_at: timestamp,
  };
}

function normalizeClientEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUniqueEmailViolation(message?: string) {
  return Boolean(message && /clients_email_gym_unique/i.test(message));
}

export async function listClients(
  supabase: AppSupabaseClient,
  filters: ClientListFilters,
): Promise<{ data: Client[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: [],
      error: scopeError,
    };
  }

  let query = supabase
    .from("clients")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  query = applyGymScope(query, scope);

  if (filters.search) {
    const search = filters.search.trim();
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((client) => mapClient(client as ClientRecord)),
    error: null,
  };
}

export async function getClientById(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: Client | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: null,
      error: scopeError,
    };
  }

  let query = supabase
    .from("clients")
    .select("*")
    .eq("id", clientId);

  query = applyGymScope(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapClient(data as ClientRecord) : null,
    error: null,
  };
}

export async function createClientRecord(
  supabase: AppSupabaseClient,
  values: ClientFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: null,
      error: { message: scopeError ?? "Unable to resolve gym scope." },
    };
  }

  const normalizedEmail = normalizeClientEmail(values.email);

  if (normalizedEmail && !scope.isSuperAdmin) {
    const { data: existingClients, error: duplicateLookupError } = await supabase
      .from("clients")
      .select("id, email")
      .eq("gym_id", scope.gymId ?? "")
      .not("email", "is", null);

    if (duplicateLookupError) {
      return {
        data: null,
        error: { message: duplicateLookupError.message },
      };
    }

    const duplicate = (existingClients ?? []).find(
      (client) => normalizeClientEmail(String(client.email ?? "")) === normalizedEmail,
    );

    if (duplicate) {
      return {
        data: null,
        error: {
          message: "Ya existe un cliente con este correo en este gimnasio.",
          field: "email",
        },
      };
    }
  }

  const result = await supabase
    .from("clients")
    .insert(withGymId({
      ...normalizeClientPayload(values),
      created_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();

  if (isUniqueEmailViolation(result.error?.message)) {
    return {
      data: null,
      error: {
        message: "Ya existe un cliente con este correo en este gimnasio.",
        field: "email",
      },
    };
  }

  return result;
}

export async function updateClientRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: null,
      error: { message: scopeError ?? "Unable to resolve gym scope." },
    };
  }

  let query = supabase
    .from("clients")
    .update(normalizeClientPayload(values))
    .eq("id", clientId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

async function countClientRows(
  supabase: AppSupabaseClient,
  table: "client_routines" | "payments" | "client_checkins",
  clientId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function listClientMergeCandidates(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientMergeCandidate[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return {
      data: [],
      error: scopeError,
    };
  }

  let currentQuery = supabase
    .from("clients")
    .select("id, email, gym_id")
    .eq("id", clientId);
  currentQuery = applyGymScope(currentQuery, scope);
  const { data: currentClient, error: currentError } = await currentQuery.maybeSingle();

  if (currentError) {
    return {
      data: [],
      error: currentError.message,
    };
  }

  if (!currentClient) {
    return {
      data: [],
      error: "Client not found.",
    };
  }

  let candidatesQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, email")
    .neq("id", clientId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (currentClient.gym_id) {
    candidatesQuery = candidatesQuery.eq("gym_id", currentClient.gym_id);
  } else {
    candidatesQuery = candidatesQuery.is("gym_id", null);
  }

  if (!scope.isSuperAdmin) {
    candidatesQuery = candidatesQuery.eq("gym_id", scope.gymId ?? "");
  }

  const { data: candidateRows, error: candidatesError } = await candidatesQuery;

  if (candidatesError) {
    return {
      data: [],
      error: candidatesError.message,
    };
  }

  const currentEmail = normalizeClientEmail(String(currentClient.email ?? ""));

  try {
    const candidates = await Promise.all(
      (candidateRows ?? []).map(async (candidate) => ({
        id: String(candidate.id),
        firstName: String(candidate.first_name),
        lastName: String(candidate.last_name),
        email: candidate.email,
        isEmailDuplicate:
          Boolean(currentEmail) &&
          normalizeClientEmail(String(candidate.email ?? "")) === currentEmail,
        counts: {
          routines: await countClientRows(supabase, "client_routines", String(candidate.id)),
          payments: await countClientRows(supabase, "payments", String(candidate.id)),
          checkins: await countClientRows(supabase, "client_checkins", String(candidate.id)),
        },
      })),
    );

    return {
      data: candidates,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load merge candidates.",
    };
  }
}

export async function mergeClientRecords(
  supabase: AppSupabaseClient,
  mainClientId: string,
  duplicateClientId: string,
) {
  const { error } = await supabase.rpc("merge_clients", {
    main_client_id: mainClientId,
    duplicate_client_id: duplicateClientId,
  });

  return {
    error: error?.message ?? null,
  };
}

export const getClientForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return getClientById(supabase, clientId);
});

export const getClientsForPage = cache(async (filters: ClientListFilters) => {
  const supabase = await createClient();
  return listClients(supabase, filters);
});

export const getClientMergeCandidatesForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listClientMergeCandidates(supabase, clientId);
});
