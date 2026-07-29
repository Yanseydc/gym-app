import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId } from "@/lib/auth/gym-scope";
import { getTodayInAppTimeZone } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";
import { getOperationalStatus } from "@/modules/memberships/lib/membership-lifecycle";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  AssignMembershipWithPaymentResult,
  ClientMembership,
  ClientMembershipFormValues,
  ClientMembershipRecord,
  MembershipOperationItem,
  MembershipPlan,
  MembershipPlanFormValues,
  MembershipPlanRecord,
  MembershipStatus,
} from "@/modules/memberships/types";

type AssignMembershipWithPaymentInput = {
  membershipPlanId: string;
  startDate: string;
  notes: string;
  paymentMethod: string;
  amount: number;
  idempotencyKey: string;
};

type MembershipAccessSummary = {
  membershipId: string | null;
  planName: string;
  endDate: string | null;
  status: MembershipStatus | "none";
  totalPaid: number;
  remainingBalance: number;
};

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

  if (baseStatus === "pending_payment" || baseStatus === "partial") {
    return baseStatus;
  }

  const today = toIsoDate(new Date());
  return endDate < today ? "expired" : "active";
}

function isCurrentActiveMembership(record: Pick<ClientMembershipRecord, "end_date" | "status">) {
  if (record.status === "cancelled") {
    return false;
  }

  return record.status === "active" || record.end_date >= toIsoDate(new Date());
}

/**
 * Whether this specific client_memberships row grants live access (check-in,
 * portal, etc.) right now. This is the single source of truth consumed by
 * getClientMembershipAccessLookup below, so check-in search and manual
 * check-in can never disagree.
 *
 * Deliberately NOT the same thing as isCurrentActiveMembership above, which
 * answers a different question - "is this the client's current-period
 * membership" for renew/extend eligibility and the operational dashboard's
 * grouping - and intentionally does not gate access (e.g. it doesn't care
 * about pending payments, and treats a bare `status === "active"` as
 * sufficient without re-checking end_date). Reusing it here would have kept
 * the same class of bug: a stale "active" row past its end_date must NOT
 * grant access.
 *
 * Every condition is written out explicitly rather than delegated to
 * resolveMembershipStatus, so this predicate keeps working even if that
 * display-status mapping changes later:
 *   - not cancelled;
 *   - the stored status must be exactly "active" - matching the existing
 *     policy already enforced in CheckInClientResultCard/createCheckInRecord:
 *     pending_payment and partial memberships do NOT grant access, even
 *     though they are not cancelled either;
 *   - start_date must have already begun;
 *   - end_date must not have passed yet.
 *
 * `today` must be computed by the caller (see getTodayInAppTimeZone) so every
 * row in the same lookup is judged against the exact same "today", in the
 * app's operating time zone rather than UTC.
 */
function hasActiveAccessNow(
  record: Pick<ClientMembershipRecord, "status" | "start_date" | "end_date">,
  today: string,
) {
  if (record.status === "cancelled") {
    return false;
  }

  if (record.status !== "active") {
    return false;
  }

  return record.start_date <= today && record.end_date >= today;
}

/**
 * Deterministic tie-break used whenever more than one client_memberships row
 * is a candidate:
 *   - among rows that pass hasActiveAccessNow (normally at most one, since
 *     the client_memberships_no_overlapping_active_periods DB constraint
 *     blocks overlapping active/pending_payment/partial periods - but it
 *     does not guarantee non-overlapping periods can't both be active at
 *     once, so more than one is possible in theory);
 *   - or, when none are eligible, among ALL of the client's rows, purely to
 *     pick which one is "most relevant" to display - that selection is
 *     informational only and must never be used to grant access.
 * Furthest-out end_date wins first, then furthest-out start_date, then most
 * recently created, then id as a final, always-deterministic fallback. Never
 * depends on the order rows came back from the database.
 */
function compareByRecency(
  a: Pick<ClientMembershipRecord, "id" | "start_date" | "end_date" | "created_at">,
  b: Pick<ClientMembershipRecord, "id" | "start_date" | "end_date" | "created_at">,
) {
  if (a.end_date !== b.end_date) {
    return a.end_date > b.end_date ? -1 : 1;
  }

  if (a.start_date !== b.start_date) {
    return a.start_date > b.start_date ? -1 : 1;
  }

  if (a.created_at !== b.created_at) {
    return a.created_at > b.created_at ? -1 : 1;
  }

  return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
}

type AccessRecord = Pick<
  ClientMembershipRecord,
  "id" | "status" | "start_date" | "end_date" | "created_at"
>;

/**
 * Single source of truth for turning a client's client_memberships rows into
 * one access decision: grant access if AT LEAST ONE row is currently
 * eligible (hasActiveAccessNow), never based on which row happens to come
 * first. When none are eligible, still returns a row - deterministically
 * chosen via compareByRecency - purely so callers can show a useful label;
 * `isEligible` is what must gate access, not the mere presence of `record`.
 */
export function selectAccessRecord<T extends AccessRecord>(
  records: T[],
  today: string,
): { record: T | null; isEligible: boolean } {
  if (records.length === 0) {
    return { record: null, isEligible: false };
  }

  const eligible = records.filter((record) => hasActiveAccessNow(record, today));
  const isEligible = eligible.length > 0;
  const pool = isEligible ? eligible : records;
  const winner = [...pool].sort(compareByRecency)[0];

  return { record: winner, isEligible };
}

/**
 * The Spanish message shown when a new membership period would occupy the
 * same space as an existing one - used both when the pre-insert check below
 * catches it, and when a genuine race loses to the
 * client_memberships_no_overlapping_active_periods exclusion constraint and
 * the database rejects the insert instead. Never mentions the table or
 * constraint by name.
 */
export const MEMBERSHIP_PERIOD_CONFLICT_MESSAGE =
  "Ya existe una membresía para este cliente en ese periodo. Actualiza la página e inténtalo de nuevo.";

const PERIOD_OCCUPYING_STATUSES: readonly MembershipStatus[] = ["active", "pending_payment", "partial"];

/**
 * Whether [newStartDate, newEndDate] would collide with any of `existing`'s
 * rows, reproducing the exact semantics of the
 * client_memberships_no_overlapping_active_periods exclusion constraint
 * (supabase/migrations/20260717090000_membership_payment_lifecycle.sql):
 *   - both intervals are inclusive on both ends;
 *   - only "active", "pending_payment" and "partial" rows occupy their
 *     period - "cancelled" rows never block, regardless of their dates;
 *   - overlap test: existing.start_date <= newEndDate && newStartDate <= existing.end_date.
 * Pure and dependency-free so it can be unit tested without Supabase. Used
 * as an authoritative pre-insert check in renewClientMembershipRecord - the
 * database constraint remains the last line of defense for genuinely
 * concurrent requests that both pass this check before either commits.
 */
export function overlapsExistingPeriod(
  newStartDate: string,
  newEndDate: string,
  existing: Pick<ClientMembershipRecord, "status" | "start_date" | "end_date">[],
): boolean {
  return existing.some(
    (record) =>
      PERIOD_OCCUPYING_STATUSES.includes(record.status) &&
      record.start_date <= newEndDate &&
      newStartDate <= record.end_date,
  );
}

/**
 * Whether a Postgres error is the client_memberships_no_overlapping_active_periods
 * exclusion constraint firing (SQLSTATE 23P01, exclusion_violation) - the
 * last-line-of-defense case where two requests both passed
 * overlapsExistingPeriod's pre-insert check before either had committed.
 * Pure so the mapping from "raw error" to "this specific known case" is
 * unit-testable without mocking a real Postgrest error end to end.
 */
export function isMembershipPeriodConflictError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23P01";
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
  planPrice: number,
  totalPaid: number,
): ClientMembership {
  const remainingBalance = Math.max(0, planPrice - totalPaid);
  const effectiveStatus = resolveMembershipStatus(record.end_date, record.status);

  return {
    id: record.id,
    clientId: record.client_id,
    membershipPlanId: record.membership_plan_id,
    planName,
    planPrice,
    startDate: record.start_date,
    endDate: record.end_date,
    status: effectiveStatus,
    totalPaid,
    remainingBalance,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getClientMembershipAccessLookup(
  supabase: AppSupabaseClient,
  clientIds: string[],
): Promise<Map<string, MembershipAccessSummary>> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    throw new Error(scopeError ?? "Unable to resolve gym scope.");
  }

  if (clientIds.length === 0) {
    return new Map();
  }

  let membershipsQuery = supabase
    .from("client_memberships")
    .select("*")
    .in("client_id", clientIds)
    .order("start_date", { ascending: false });

  membershipsQuery = applyGymScope(membershipsQuery, scope);

  const { data, error } = await membershipsQuery;

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as ClientMembershipRecord[];
  const planIds = [...new Set(records.map((record) => record.membership_plan_id))];
  const membershipIds = records.map((record) => record.id);

  let planMap = new Map<string, { name: string; price: number }>();

  if (planIds.length > 0) {
    let plansQuery = supabase
      .from("membership_plans")
      .select("id, name, price")
      .in("id", planIds);

    plansQuery = applyGymScope(plansQuery, scope);

    const { data: plans, error: plansError } = await plansQuery;

    if (plansError) {
      throw new Error(plansError.message);
    }

    planMap = new Map(
      (plans ?? []).map((plan) => [
        String(plan.id),
        {
          name: String(plan.name),
          price: Number(plan.price),
        },
      ]),
    );
  }

  let paymentTotals = new Map<string, number>();

  if (membershipIds.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", membershipIds);

    paymentsQuery = applyGymScope(paymentsQuery, scope);

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      throw new Error(paymentsError.message);
    }

    paymentTotals = (payments ?? []).reduce((map, payment) => {
      const membershipId = String(payment.client_membership_id);
      map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>());
  }

  const recordsByClient = new Map<string, ClientMembershipRecord[]>();

  records.forEach((record) => {
    const clientId = String(record.client_id);
    const list = recordsByClient.get(clientId) ?? [];
    list.push(record);
    recordsByClient.set(clientId, list);
  });

  const today = getTodayInAppTimeZone();

  return new Map<string, MembershipAccessSummary>(
    clientIds.map((clientId) => {
      const clientRecords = recordsByClient.get(clientId) ?? [];
      const { record: winner, isEligible } = selectAccessRecord(clientRecords, today);

      if (!winner) {
        return [
          clientId,
          {
            membershipId: null,
            planName: "No membership history",
            endDate: null,
            status: "none" as const,
            totalPaid: 0,
            remainingBalance: 0,
          },
        ];
      }

      const winnerMembership = mapClientMembership(
        winner,
        planMap.get(winner.membership_plan_id)?.name ?? "Unknown plan",
        planMap.get(winner.membership_plan_id)?.price ?? 0,
        paymentTotals.get(winner.id) ?? 0,
      );

      return [
        clientId,
        {
          membershipId: winnerMembership.id,
          planName: winnerMembership.planName,
          endDate: winnerMembership.endDate,
          // Forced to "active" when isEligible, rather than trusting
          // winnerMembership.status (resolveMembershipStatus computes "today"
          // in UTC, hasActiveAccessNow uses the app's operating time zone) -
          // this keeps the access decision and the displayed status from
          // ever disagreeing right at a UTC/local day boundary.
          status: isEligible ? ("active" as const) : winnerMembership.status,
          totalPaid: winnerMembership.totalPaid,
          remainingBalance: winnerMembership.remainingBalance,
        },
      ];
    }),
  );
}

export async function listMembershipPlans(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipPlan[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .order("name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

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
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

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
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("id", membershipId);

  query = applyGymScope(query, scope);

  const { data, error } = await query.maybeSingle();

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
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  return supabase
    .from("membership_plans")
    .insert(withGymId({
      ...normalizeMembershipPlanPayload(values),
      created_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
}

export async function updateMembershipPlanRecord(
  supabase: AppSupabaseClient,
  membershipId: string,
  values: MembershipPlanFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let query = supabase
    .from("membership_plans")
    .update(normalizeMembershipPlanPayload(values))
    .eq("id", membershipId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

export async function assignMembershipToClientRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientMembershipFormValues,
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

  let overlappingQuery = supabase
    .from("client_memberships")
    .select("id, start_date, end_date, status")
    .eq("client_id", clientId)
    .in("status", ["active", "pending_payment", "partial"])
    .lte("start_date", values.startDate)
    .gte("end_date", values.startDate)
    .limit(1);

  overlappingQuery = applyGymScope(overlappingQuery, scope);

  const { data: overlappingMemberships, error: overlappingMembershipsError } = await overlappingQuery;

  if (overlappingMembershipsError) {
    return {
      data: null,
      error: overlappingMembershipsError.message,
    };
  }

  const openMembership = (overlappingMemberships ?? [])[0];

  if (openMembership) {
    return {
      data: null,
      error:
        "This client already has an active membership for that date. Choose a different start date or review the current membership.",
    };
  }

  let planQuery = supabase
    .from("membership_plans")
    .select("*")
    .eq("id", values.membershipPlanId)
    .eq("is_active", true);

  planQuery = applyGymScope(planQuery, scope);

  const { data: planData, error: planError } = await planQuery.maybeSingle();

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
  const status: MembershipStatus = "pending_payment";

  return supabase
    .from("client_memberships")
    .insert(withGymId({
      client_id: clientId,
      membership_plan_id: plan.id,
      start_date: values.startDate,
      end_date: endDate,
      status,
      notes: values.notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
}

export async function assignMembershipWithPaymentRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: AssignMembershipWithPaymentInput,
): Promise<{ data: AssignMembershipWithPaymentResult | null; error: string | null }> {
  const { error: scopeError } = await requireGymScope(supabase);

  if (scopeError) {
    return { data: null, error: scopeError };
  }

  const { data, error } = await supabase.rpc("assign_membership_with_payment", {
    p_client_id: clientId,
    p_membership_plan_id: values.membershipPlanId,
    p_start_date: values.startDate,
    p_notes: values.notes.trim() || null,
    p_payment_method: values.paymentMethod,
    p_amount: values.amount,
    p_idempotency_key: values.idempotencyKey,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const row = (data ?? [])[0];

  if (!row) {
    return { data: null, error: "Membership assignment did not return a result." };
  }

  return {
    data: {
      membershipId: row.membership_id,
      paymentId: row.payment_id,
      status: row.status as MembershipStatus,
      amountPaid: Number(row.amount_paid),
      totalPaid: Number(row.total_paid),
      remainingBalance: Number(row.remaining_balance),
    },
    error: null,
  };
}

export async function cancelClientMembershipRecord(
  supabase: AppSupabaseClient,
  clientMembershipId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let query = supabase
    .from("client_memberships")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientMembershipId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

export async function extendClientMembershipRecord(
  supabase: AppSupabaseClient,
  clientMembershipId: string,
  days: number,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  if (!Number.isFinite(days) || days <= 0) {
    return { data: null, error: "Enter a valid number of days." };
  }

  let membershipQuery = supabase
    .from("client_memberships")
    .select("id, end_date, status")
    .eq("id", clientMembershipId);
  membershipQuery = applyGymScope(membershipQuery, scope);
  const { data: membership, error: membershipError } = await membershipQuery.maybeSingle();

  if (membershipError) {
    return { data: null, error: membershipError.message };
  }

  if (!membership) {
    return { data: null, error: "Membership not found." };
  }

  if (membership.status === "cancelled") {
    return { data: null, error: "Cancelled memberships cannot be extended." };
  }

  if (!isCurrentActiveMembership(membership)) {
    return { data: null, error: "Expired memberships cannot be extended. Renew instead." };
  }

  const baseDate = String(membership.end_date) < toIsoDate(new Date())
    ? toIsoDate(new Date())
    : String(membership.end_date);
  const nextEndDate = addDays(baseDate, days + 1);

  let updateQuery = supabase
    .from("client_memberships")
    .update({
      end_date: nextEndDate,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientMembershipId);
  updateQuery = applyGymScope(updateQuery, scope);

  return updateQuery.select("id").single();
}

export async function renewClientMembershipRecord(
  supabase: AppSupabaseClient,
  clientMembershipId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  let membershipQuery = supabase
    .from("client_memberships")
    .select("client_id, membership_plan_id, end_date, status")
    .eq("id", clientMembershipId);
  membershipQuery = applyGymScope(membershipQuery, scope);
  const { data: membership, error: membershipError } = await membershipQuery.maybeSingle();

  if (membershipError) {
    return { data: null, error: membershipError.message };
  }

  if (!membership) {
    return { data: null, error: "Membership not found." };
  }

  let activeQuery = supabase
    .from("client_memberships")
    .select("id")
    .eq("client_id", membership.client_id)
    .neq("id", clientMembershipId)
    .neq("status", "cancelled")
    .gte("end_date", toIsoDate(new Date()))
    .limit(1);
  activeQuery = applyGymScope(activeQuery, scope);
  const { data: activeMemberships, error: activeError } = await activeQuery;

  if (activeError) {
    return { data: null, error: activeError.message };
  }

  if (!isCurrentActiveMembership(membership) && (activeMemberships ?? []).length > 0) {
    return {
      data: null,
      error: "Este cliente ya tiene una membresía activa.",
    };
  }

  let planQuery = supabase
    .from("membership_plans")
    .select("id, duration_in_days")
    .eq("id", membership.membership_plan_id)
    .eq("is_active", true);
  planQuery = applyGymScope(planQuery, scope);
  const { data: plan, error: planError } = await planQuery.maybeSingle();

  if (planError) {
    return { data: null, error: planError.message };
  }

  if (!plan) {
    return { data: null, error: "Membership plan is not available." };
  }

  const today = toIsoDate(new Date());
  const startDate = String(membership.end_date) >= today
    ? addDays(String(membership.end_date), 2)
    : today;
  const endDate = addDays(startDate, Number(plan.duration_in_days));

  // Authoritative pre-insert check: does the period we're about to create
  // collide with any of this client's other active/pending_payment/partial
  // rows? This is what actually prevents the double-submit/stale-modal
  // scenario (renewing the same source membership twice recomputes the
  // exact same period both times) instead of surfacing a raw Postgres
  // error. The exclusion constraint below remains as the last line of
  // defense for a genuine race between two concurrent requests that both
  // reach this point before either has inserted.
  let overlapQuery = supabase
    .from("client_memberships")
    .select("id, status, start_date, end_date")
    .eq("client_id", membership.client_id)
    .neq("id", clientMembershipId)
    .in("status", PERIOD_OCCUPYING_STATUSES);
  overlapQuery = applyGymScope(overlapQuery, scope);
  const { data: occupyingPeriods, error: overlapQueryError } = await overlapQuery;

  if (overlapQueryError) {
    return { data: null, error: overlapQueryError.message };
  }

  if (overlapsExistingPeriod(startDate, endDate, occupyingPeriods ?? [])) {
    return { data: null, error: MEMBERSHIP_PERIOD_CONFLICT_MESSAGE };
  }

  const insertResult = await supabase
    .from("client_memberships")
    .insert(withGymId({
      client_id: String(membership.client_id),
      membership_plan_id: String(membership.membership_plan_id),
      start_date: startDate,
      end_date: endDate,
      status: "pending_payment",
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();

  if (isMembershipPeriodConflictError(insertResult.error)) {
    return { data: null, error: MEMBERSHIP_PERIOD_CONFLICT_MESSAGE };
  }

  return insertResult;
}

export async function listOperationalMemberships(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipOperationItem[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_memberships")
    .select("*")
    .order("end_date", { ascending: true });
  query = applyGymScope(query, scope);
  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  const records = (data ?? []) as ClientMembershipRecord[];
  const clientIds = [...new Set(records.map((record) => record.client_id))];
  const planIds = [...new Set(records.map((record) => record.membership_plan_id))];
  const membershipIds = records.map((record) => record.id);
  let clientMap = new Map<string, string>();
  let planMap = new Map<string, { name: string; price: number }>();
  let paymentTotals = new Map<string, number>();

  if (clientIds.length > 0) {
    let clientsQuery = supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);
    clientsQuery = applyGymScope(clientsQuery, scope);
    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      return { data: [], error: clientsError.message };
    }

    clientMap = new Map((clients ?? []).map((client) => [
      String(client.id),
      `${String(client.first_name)} ${String(client.last_name)}`,
    ]));
  }

  if (planIds.length > 0) {
    let plansQuery = supabase
      .from("membership_plans")
      .select("id, name, price")
      .in("id", planIds);
    plansQuery = applyGymScope(plansQuery, scope);
    const { data: plans, error: plansError } = await plansQuery;

    if (plansError) {
      return { data: [], error: plansError.message };
    }

    planMap = new Map((plans ?? []).map((plan) => [
      String(plan.id),
      { name: String(plan.name), price: Number(plan.price) },
    ]));
  }

  if (membershipIds.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", membershipIds);
    paymentsQuery = applyGymScope(paymentsQuery, scope);
    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      return { data: [], error: paymentsError.message };
    }

    paymentTotals = (payments ?? []).reduce((map, payment) => {
      const membershipId = String(payment.client_membership_id);
      map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>());
  }

  const activeMembershipByClient = records.reduce((map, record) => {
    if (isCurrentActiveMembership(record)) {
      map.set(record.client_id, record.id);
    }

    return map;
  }, new Map<string, string>());

  return {
    data: records.map((record) => {
      const plan = planMap.get(record.membership_plan_id);
      const membership = mapClientMembership(
        record,
        plan?.name ?? "Unknown plan",
        plan?.price ?? 0,
        paymentTotals.get(record.id) ?? 0,
      );

      return {
        ...membership,
        clientName: clientMap.get(record.client_id) ?? "Unknown client",
        hasCurrentActiveMembership: activeMembershipByClient.has(record.client_id),
        isCurrentActiveMembership: activeMembershipByClient.get(record.client_id) === record.id,
        operationalStatus: getOperationalStatus(record.start_date, record.end_date, membership.status),
      };
    }),
    error: null,
  };
}

export async function listClientMembershipHistory(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientMembership[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", clientId)
    .order("start_date", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const records = (data ?? []) as ClientMembershipRecord[];
    const planIds = [...new Set(records.map((record) => record.membership_plan_id))];
    let planMap = new Map<string, { name: string; price: number }>();

    if (planIds.length > 0) {
      let plansQuery = supabase
        .from("membership_plans")
        .select("id, name, price")
        .in("id", planIds);

      plansQuery = applyGymScope(plansQuery, scope);

      const { data: plans, error: plansError } = await plansQuery;

      if (plansError) {
        return {
          data: [],
          error: plansError.message,
        };
      }

      planMap = new Map(
        (plans ?? []).map((plan) => [
          String(plan.id),
          { name: String(plan.name), price: Number(plan.price) },
        ]),
      );
    }

    const membershipIds = records.map((record) => record.id);
    let paymentTotals = new Map<string, number>();

    if (membershipIds.length > 0) {
      let paymentsQuery = supabase
        .from("payments")
        .select("client_membership_id, amount")
        .in("client_membership_id", membershipIds);

      paymentsQuery = applyGymScope(paymentsQuery, scope);

      const { data: payments, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        return {
          data: [],
          error: paymentsError.message,
        };
      }

      paymentTotals = (payments ?? []).reduce((map, payment) => {
        const membershipId = String(payment.client_membership_id);
        map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
        return map;
      }, new Map<string, number>());
    }

    return {
      data: records.map((record) =>
        mapClientMembership(
          record,
          planMap.get(record.membership_plan_id)?.name ?? "Unknown plan",
          planMap.get(record.membership_plan_id)?.price ?? 0,
          paymentTotals.get(record.id) ?? 0,
        ),
      ),
      error: null,
    };
  } catch (lookupError) {
    return {
      data: [],
      error: lookupError instanceof Error ? lookupError.message : "Unable to load memberships.",
    };
  }
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
      planPrice: number;
      totalPaid: number;
      remainingBalance: number;
      startDate: string;
      endDate: string;
      status: MembershipStatus;
    }>;
    error: string | null;
  }
> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_memberships")
    .select("*")
    .eq("membership_plan_id", membershipId)
    .order("start_date", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

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

  const membershipIds = memberships.map((membership) => membership.id);
  let paymentTotals = new Map<string, number>();

  if (membershipIds.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", membershipIds);

    paymentsQuery = applyGymScope(paymentsQuery, scope);

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      return {
        data: [],
        error: paymentsError.message,
      };
    }

    paymentTotals = (payments ?? []).reduce((map, payment) => {
      const membershipId = String(payment.client_membership_id);
      map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>());
  }

  let planQuery = supabase
    .from("membership_plans")
    .select("id, price")
    .eq("id", membershipId);

  planQuery = applyGymScope(planQuery, scope);

  const { data: planData, error: planError } = await planQuery.maybeSingle();

  if (planError) {
    return {
      data: [],
      error: planError.message,
    };
  }

  const planPrice = planData ? Number(planData.price) : 0;

  return {
    data: memberships.map((membership) => ({
      id: membership.id,
      clientId: membership.client_id,
      clientName: clientMap.get(membership.client_id) ?? "Unknown client",
      planPrice,
      totalPaid: paymentTotals.get(membership.id) ?? 0,
      remainingBalance: Math.max(0, planPrice - (paymentTotals.get(membership.id) ?? 0)),
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

export const getOperationalMembershipsForPage = cache(async () => {
  const supabase = await createClient();
  return listOperationalMemberships(supabase);
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
