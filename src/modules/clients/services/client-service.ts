import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  Client,
  ClientFormValues,
  ClientListFilters,
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

  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim() || null,
    status: values.status,
    notes: values.notes.trim() || null,
    updated_at: timestamp,
  };
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

  return supabase
    .from("clients")
    .insert(withGymId({
      ...normalizeClientPayload(values),
      created_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
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

export const getClientForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return getClientById(supabase, clientId);
});

export const getClientsForPage = cache(async (filters: ClientListFilters) => {
  const supabase = await createClient();
  return listClients(supabase, filters);
});
