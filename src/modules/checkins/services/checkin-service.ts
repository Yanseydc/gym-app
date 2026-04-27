import { cache } from "react";

import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type { Database } from "@/types/database";
import { getClientMembershipAccessLookup } from "@/modules/memberships/services/membership-service";
import type {
  CheckInClientResult,
  CheckInFormValues,
  CheckInRecord,
  ClientCheckIn,
  ClientMembershipAccessStatus,
} from "@/modules/checkins/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

async function getClientMembershipLookup(
  supabase: AppSupabaseClient,
  clientIds: string[],
) {
  return getClientMembershipAccessLookup(supabase, clientIds);
}

function mapCheckIn(
  record: CheckInRecord,
  clientName: string,
): ClientCheckIn {
  return {
    id: record.id,
    clientId: record.client_id,
    clientName,
    checkedInAt: record.checked_in_at,
    notes: record.notes,
  };
}

export async function searchClientsForCheckIn(
  supabase: AppSupabaseClient,
  search: string,
): Promise<{ data: CheckInClientResult[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return {
      data: [],
      error: null,
    };
  }

  let query = supabase
    .from("clients")
    .select("*")
    .or(`first_name.ilike.%${trimmedSearch}%,last_name.ilike.%${trimmedSearch}%`)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(10);

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const clients = (data ?? []) as ClientRow[];
    const clientIds = clients.map((client) => String(client.id));
    const membershipLookup = await getClientMembershipLookup(supabase, clientIds);

    return {
      data: clients.map((client) => {
        const membership = membershipLookup.get(String(client.id)) ?? {
          status: "none" as const,
          planName: "No membership history",
          endDate: null,
          membershipId: null,
          totalPaid: 0,
          remainingBalance: 0,
        };

        const membershipLabel =
          membership.status === "active"
            ? `${membership.planName} active until ${membership.endDate}`
            : membership.status === "expired"
              ? `${membership.planName} expired on ${membership.endDate}`
              : membership.status === "cancelled"
                ? `${membership.planName} cancelled`
                : membership.status === "pending_payment"
                  ? `${membership.planName} awaiting payment · $${membership.remainingBalance.toFixed(2)} remaining`
                  : membership.status === "partial"
                    ? `${membership.planName} partially paid · $${membership.remainingBalance.toFixed(2)} remaining`
                  : "No membership history";

        return {
          id: String(client.id),
          firstName: String(client.first_name),
          lastName: String(client.last_name),
          fullName: `${String(client.first_name)} ${String(client.last_name)}`,
          status: client.status,
          membershipStatus: membership.status,
          membershipLabel,
          activeMembershipId: membership.status === "active" ? membership.membershipId : null,
        };
      }),
      error: null,
    };
  } catch (membershipError) {
    return {
      data: [],
      error: membershipError instanceof Error ? membershipError.message : "Unable to load memberships.",
    };
  }
}

export async function createCheckInRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: CheckInFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  let clientQuery = supabase
    .from("clients")
    .select("id")
    .eq("id", clientId);

  clientQuery = applyGymScope(clientQuery, scope);

  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return { data: null, error: clientError.message };
  }

  if (!clientData) {
    return { data: null, error: "Selected client is not available." };
  }

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const membershipLookup = await getClientMembershipLookup(supabase, [clientId]);
  const membership = membershipLookup.get(clientId);

  if (!membership || membership.status !== "active") {
    return {
      data: null,
      error: "Client does not have an active membership.",
    };
  }

  const { data: recentCheckIn, error: recentCheckInError } = await supabase
    .from("check_ins")
    .select("id, checked_in_at")
    .eq("client_id", clientId)
    .gte("checked_in_at", fiveMinutesAgo)
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCheckInError) {
    return {
      data: null,
      error: recentCheckInError.message,
    };
  }

  if (recentCheckIn) {
    return {
      data: null,
      error: "This client already checked in within the last 5 minutes.",
    };
  }

  const insertResult = await supabase
    .from("check_ins")
    .insert({
      client_id: clientId,
      checked_in_at: now.toISOString(),
      created_at: now.toISOString(),
      notes: values.notes.trim() || null,
    })
    .select("id")
    .single();

  if (
    insertResult.error &&
    /check_ins_no_duplicates_within_5_minutes/.test(insertResult.error.message)
  ) {
    return {
      data: null,
      error: "This client already checked in within the last 5 minutes.",
    };
  }

  return insertResult;
}

export async function listClientCheckIns(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientCheckIn[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", clientId)
    .order("checked_in_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  let clientQuery = supabase
    .from("clients")
    .select("first_name, last_name")
    .eq("id", clientId);

  clientQuery = applyGymScope(clientQuery, scope);

  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return {
      data: [],
      error: clientError.message,
    };
  }

  if (!clientData) {
    return {
      data: [],
      error: null,
    };
  }

  const clientName = `${String(clientData.first_name)} ${String(clientData.last_name)}`;

  return {
    data: (data ?? []).map((checkIn) => mapCheckIn(checkIn as CheckInRecord, clientName)),
    error: null,
  };
}

export async function listRecentCheckIns(
  supabase: AppSupabaseClient,
): Promise<{ data: ClientCheckIn[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("checked_in_at", { ascending: false })
    .limit(20);

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const records = (data ?? []) as CheckInRecord[];
  const clientIds = [...new Set(records.map((record) => record.client_id))];

  let clientMap = new Map<string, string>();

  if (clientIds.length > 0) {
    let clientsQuery = supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    clientsQuery = applyGymScope(clientsQuery, scope);

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      return {
        data: [],
        error: clientsError.message,
      };
    }

    clientMap = new Map(
      (clients ?? []).map((client) => [
        String(client.id),
        `${String(client.first_name)} ${String(client.last_name)}`,
      ]),
    );
  }

  return {
    data: records
      .filter((record) => scope.isSuperAdmin || clientMap.has(record.client_id))
      .map((record) => mapCheckIn(record, clientMap.get(record.client_id) ?? "Unknown client")),
    error: null,
  };
}

export const getCheckInSearchResultsForPage = cache(async (search: string) => {
  const supabase = await createClient();
  return searchClientsForCheckIn(supabase, search);
});

export const getRecentCheckInsForPage = cache(async () => {
  const supabase = await createClient();
  return listRecentCheckIns(supabase);
});

export const getClientCheckInsForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listClientCheckIns(supabase, clientId);
});
