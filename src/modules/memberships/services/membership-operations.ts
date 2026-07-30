"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminText } from "@/lib/i18n/admin";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { mapKnownMembershipError } from "@/modules/memberships/lib/membership-error-messages";
import {
  cancelClientMembershipRecord,
  extendMembershipRecord,
  renewClientMembershipRecord,
} from "@/modules/memberships/services/membership-service";
import type { MembershipOperationMutationState } from "@/modules/memberships/types";
import { registerMembershipPaymentRecord } from "@/modules/payments/services/payment-service";

function refreshMemberships() {
  revalidatePath("/dashboard/memberships");
}

export async function registerMembershipPayment(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const { t } = await getAdminText();
  const amount = Number(formData.get("amount"));
  const clientId = String(formData.get("clientId") ?? "");
  const clientMembershipId = String(formData.get("clientMembershipId") ?? "");

  if (!clientId || !clientMembershipId || !Number.isFinite(amount) || amount <= 0) {
    return { error: t("memberships.operations.feedback.invalidAmount") };
  }

  // Validated as a UUID (never trusted as opaque text) before it ever
  // reaches the RPC - matches assign-membership.ts's own idempotencyKey
  // check. A missing/invalid key never calls the RPC at all.
  const idempotencyKeyResult = z.string().uuid().safeParse(formData.get("idempotencyKey"));

  if (!idempotencyKeyResult.success) {
    return { error: t("memberships.operations.feedback.invalidRequest") };
  }

  const supabase = await createSupabaseClient();
  const { error } = await registerMembershipPaymentRecord(supabase, {
    clientId,
    clientMembershipId,
    amount,
    paymentMethod: "cash",
    idempotencyKey: idempotencyKeyResult.data,
  });

  if (error) {
    // Never forward a raw Postgres/RPC message to the user.
    return { error: mapKnownMembershipError(error) ?? t("memberships.operations.feedback.paymentFailed") };
  }

  refreshMemberships();
  return { success: t("memberships.operations.feedback.paymentSuccess") };
}

export async function renewMembership(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const { t } = await getAdminText();
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) {
    return { error: t("memberships.operations.feedback.membershipRequired") };
  }

  const supabase = await createSupabaseClient();
  const { error } = await renewClientMembershipRecord(supabase, membershipId);

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
  }

  refreshMemberships();
  return { success: t("memberships.operations.feedback.renewSuccess") };
}

export async function extendMembership(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const { t } = await getAdminText();
  const membershipId = String(formData.get("membershipId") ?? "");
  const days = Number(formData.get("days"));

  if (!membershipId || !Number.isFinite(days) || days <= 0) {
    return { error: t("memberships.operations.feedback.invalidDays") };
  }

  const idempotencyKeyResult = z.string().uuid().safeParse(formData.get("idempotencyKey"));

  if (!idempotencyKeyResult.success) {
    return { error: t("memberships.operations.feedback.invalidRequest") };
  }

  const supabase = await createSupabaseClient();
  const { error } = await extendMembershipRecord(supabase, {
    clientMembershipId: membershipId,
    days,
    idempotencyKey: idempotencyKeyResult.data,
  });

  if (error) {
    // Never forward a raw Postgres/RPC message to the user.
    return { error: mapKnownMembershipError(error) ?? t("memberships.operations.feedback.extendFailed") };
  }

  refreshMemberships();
  return { success: t("memberships.operations.feedback.extendSuccess") };
}

export async function cancelMembershipFromDashboard(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const { t } = await getAdminText();
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) {
    return { error: t("memberships.operations.feedback.membershipRequired") };
  }

  const supabase = await createSupabaseClient();
  const { error } = await cancelClientMembershipRecord(supabase, membershipId);

  if (error) {
    return { error: error.message };
  }

  refreshMemberships();
  return { success: t("memberships.operations.feedback.cancelSuccess") };
}
