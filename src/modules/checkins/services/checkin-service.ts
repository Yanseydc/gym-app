import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type { Database } from "@/types/database";
import type {
  CheckInClientResult,
  CheckInFormValues,
  CheckInRecord,
  ClientCheckIn,
  ClientMembershipAccessStatus,
} from "@/modules/checkins/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMembershipAccessStatus(
  memberships: Array<{
    id: string;
    membershipPlanName: string;
    endDate: string;
    status: string;
  }>,
): {
  status: ClientMembershipAccessStatus;
  label: string;
  activeMembershipId: string | null;
} {
  if (memberships.length === 0) {
    return {
      status: "none",
      label: "No membership history",
      activeMembershipId: null,
    };
  }

  const today = toIsoDate(new Date());
  const sorted = [...memberships].sort((left, right) => right.endDate.localeCompare(left.endDate));
  const activeMembership = sorted.find(
    (membership) => membership.status === "active" && membership.endDate >= today,
  );

  if (activeMembership) {
    return {
      status: "active",
      label: `${activeMembership.membershipPlanName} active until ${activeMembership.endDate}`,
      activeMembershipId: activeMembership.id,
    };
  }

  const latest = sorted[0];

  if (latest.status === "cancelled") {
    return {
      status: "cancelled",
      label: `${latest.membershipPlanName} cancelled`,
      activeMembershipId: null,
    };
  }

  if (latest.status === "pending_payment") {
    return {
      status: "pending_payment",
      label: `${latest.membershipPlanName} awaiting payment`,
      activeMembershipId: null,
    };
  }

  return {
    status: "expired",
    label: `${latest.membershipPlanName} expired on ${latest.endDate}`,
    activeMembershipId: null,
  };
}

async function getClientMembershipLookup(
  supabase: AppSupabaseClient,
  clientIds: string[],
) {
  if (clientIds.length === 0) {
    return new Map<string, ReturnType<typeof getMembershipAccessStatus>>();
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("client_memberships")
    .select("id, client_id, membership_plan_id, end_date, status")
    .in("client_id", clientIds);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const records = memberships ?? [];
  const planIds = [...new Set(records.map((membership) => String(membership.membership_plan_id)))];

  let planMap = new Map<string, string>();

  if (planIds.length > 0) {
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("id, name")
      .in("id", planIds);

    if (plansError) {
      throw new Error(plansError.message);
    }

    planMap = new Map((plans ?? []).map((plan) => [String(plan.id), String(plan.name)]));
  }

  const grouped = new Map<
    string,
    Array<{ id: string; membershipPlanName: string; endDate: string; status: string }>
  >();

  records.forEach((membership) => {
    const clientId = String(membership.client_id);
    const list = grouped.get(clientId) ?? [];
    list.push({
      id: String(membership.id),
      membershipPlanName: planMap.get(String(membership.membership_plan_id)) ?? "Plan",
      endDate: String(membership.end_date),
      status: String(membership.status),
    });
    grouped.set(clientId, list);
  });

  return new Map(
    clientIds.map((clientId) => [
      clientId,
      getMembershipAccessStatus(grouped.get(clientId) ?? []),
    ]),
  );
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
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return {
      data: [],
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .or(`first_name.ilike.%${trimmedSearch}%,last_name.ilike.%${trimmedSearch}%`)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(10);

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
          label: "No membership history",
          activeMembershipId: null,
        };

        return {
          id: String(client.id),
          firstName: String(client.first_name),
          lastName: String(client.last_name),
          fullName: `${String(client.first_name)} ${String(client.last_name)}`,
          status: client.status,
          membershipStatus: membership.status,
          membershipLabel: membership.label,
          activeMembershipId: membership.activeMembershipId,
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

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("first_name, last_name")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    return {
      data: [],
      error: clientError.message,
    };
  }

  const clientName = clientData
    ? `${String(clientData.first_name)} ${String(clientData.last_name)}`
    : "Unknown client";

  return {
    data: (data ?? []).map((checkIn) => mapCheckIn(checkIn as CheckInRecord, clientName)),
    error: null,
  };
}

export async function listRecentCheckIns(
  supabase: AppSupabaseClient,
): Promise<{ data: ClientCheckIn[]; error: string | null }> {
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
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

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
    data: records.map((record) =>
      mapCheckIn(record, clientMap.get(record.client_id) ?? "Unknown client"),
    ),
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
