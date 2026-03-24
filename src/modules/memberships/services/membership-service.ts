import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientMembership,
  ClientMembershipFormValues,
  ClientMembershipRecord,
  MembershipPlan,
  MembershipPlanFormValues,
  MembershipPlanRecord,
  MembershipStatus,
} from "@/modules/memberships/types";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(startDate: string, durationInDays: number) {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + durationInDays - 1);
  return toIsoDate(date);
}

function resolveMembershipStatus(endDate: string, baseStatus: MembershipStatus): MembershipStatus {
  if (baseStatus === "cancelled") {
    return "cancelled";
  }

  const today = toIsoDate(new Date());
  return endDate < today ? "expired" : "active";
}

function mapMembershipPlan(record: MembershipPlanRecord): MembershipPlan {
  return {
    id: record.id,
    name: record.name,
    durationInDays: record.duration_in_days,
    price: Number(record.price),
    description: record.description,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeMembershipPlanPayload(values: MembershipPlanFormValues) {
  return {
    name: values.name.trim(),
    duration_in_days: values.durationInDays,
    price: values.price,
    description: values.description.trim() || null,
    is_active: values.isActive,
    updated_at: new Date().toISOString(),
  };
}

function mapClientMembership(
  record: ClientMembershipRecord,
  planName: string,
): ClientMembership {
  return {
    id: record.id,
    clientId: record.client_id,
    membershipPlanId: record.membership_plan_id,
    planName,
    startDate: record.start_date,
    endDate: record.end_date,
    status: resolveMembershipStatus(record.end_date, record.status),
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listMembershipPlans(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipPlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((plan) => mapMembershipPlan(plan as MembershipPlanRecord)),
    error: null,
  };
}

export async function listActiveMembershipPlans(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipPlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((plan) => mapMembershipPlan(plan as MembershipPlanRecord)),
    error: null,
  };
}

export async function getMembershipPlanById(
  supabase: AppSupabaseClient,
  membershipId: string,
): Promise<{ data: MembershipPlan | null; error: string | null }> {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapMembershipPlan(data as MembershipPlanRecord) : null,
    error: null,
  };
}

export async function createMembershipPlanRecord(
  supabase: AppSupabaseClient,
  values: MembershipPlanFormValues,
) {
  return supabase
    .from("membership_plans")
    .insert({
      ...normalizeMembershipPlanPayload(values),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateMembershipPlanRecord(
  supabase: AppSupabaseClient,
  membershipId: string,
  values: MembershipPlanFormValues,
) {
  return supabase
    .from("membership_plans")
    .update(normalizeMembershipPlanPayload(values))
    .eq("id", membershipId)
    .select("id")
    .single();
}

export async function assignMembershipToClientRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientMembershipFormValues,
) {
  const { data: planData, error: planError } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", values.membershipPlanId)
    .eq("is_active", true)
    .maybeSingle();

  if (planError) {
    return {
      data: null,
      error: planError.message,
    };
  }

  const plan = planData as MembershipPlanRecord | null;

  if (!plan) {
    return {
      data: null,
      error: "Selected membership plan is not available.",
    };
  }

  const endDate = addDays(values.startDate, plan.duration_in_days);
  const status = resolveMembershipStatus(endDate, "active");

  return supabase
    .from("client_memberships")
    .insert({
      client_id: clientId,
      membership_plan_id: plan.id,
      start_date: values.startDate,
      end_date: endDate,
      status,
      notes: values.notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function cancelClientMembershipRecord(
  supabase: AppSupabaseClient,
  clientMembershipId: string,
) {
  return supabase
    .from("client_memberships")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientMembershipId)
    .select("id")
    .single();
}

export async function listClientMembershipHistory(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientMembership[]; error: string | null }> {
  const { data, error } = await supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", clientId)
    .order("start_date", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const records = (data ?? []) as ClientMembershipRecord[];
  const planIds = [...new Set(records.map((record) => record.membership_plan_id))];

  let planNameMap = new Map<string, string>();

  if (planIds.length > 0) {
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("id, name")
      .in("id", planIds);

    if (plansError) {
      return {
        data: [],
        error: plansError.message,
      };
    }

    planNameMap = new Map(
      (plans ?? []).map((plan) => [String(plan.id), String(plan.name)]),
    );
  }

  return {
    data: records.map((record) =>
      mapClientMembership(record, planNameMap.get(record.membership_plan_id) ?? "Unknown plan"),
    ),
    error: null,
  };
}

export async function listMembershipAssignmentsByPlanId(
  supabase: AppSupabaseClient,
  membershipId: string,
): Promise<
  {
    data: Array<{
      id: string;
      clientId: string;
      clientName: string;
      startDate: string;
      endDate: string;
      status: MembershipStatus;
    }>;
    error: string | null;
  }
> {
  const { data, error } = await supabase
    .from("client_memberships")
    .select("*")
    .eq("membership_plan_id", membershipId)
    .order("start_date", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const memberships = (data ?? []) as ClientMembershipRecord[];
  const clientIds = [...new Set(memberships.map((membership) => membership.client_id))];

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
    data: memberships.map((membership) => ({
      id: membership.id,
      clientId: membership.client_id,
      clientName: clientMap.get(membership.client_id) ?? "Unknown client",
      startDate: membership.start_date,
      endDate: membership.end_date,
      status: resolveMembershipStatus(membership.end_date, membership.status),
    })),
    error: null,
  };
}

export const getMembershipPlansForPage = cache(async () => {
  const supabase = await createClient();
  return listMembershipPlans(supabase);
});

export const getActiveMembershipPlansForPage = cache(async () => {
  const supabase = await createClient();
  return listActiveMembershipPlans(supabase);
});

export const getMembershipPlanForPage = cache(async (membershipId: string) => {
  const supabase = await createClient();
  return getMembershipPlanById(supabase, membershipId);
});

export const getClientMembershipHistoryForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listClientMembershipHistory(supabase, clientId);
});

export const getMembershipAssignmentsForPage = cache(async (membershipId: string) => {
  const supabase = await createClient();
  return listMembershipAssignmentsByPlanId(supabase, membershipId);
});
