"use server";

import { revalidatePath } from "next/cache";

import { getAdminText } from "@/lib/i18n/admin";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  cancelClientMembershipRecord,
  extendClientMembershipRecord,
  renewClientMembershipRecord,
} from "@/modules/memberships/services/membership-service";
import type { MembershipOperationMutationState } from "@/modules/memberships/types";
import { createPaymentRecord } from "@/modules/payments/services/payment-service";

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

  const supabase = await createSupabaseClient();
  const { error } = await createPaymentRecord(supabase, {
    clientId,
    clientMembershipId,
    amount,
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().slice(0, 10),
    concept: "Pago de membresía",
    notes: "",
  });

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
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

  const supabase = await createSupabaseClient();
  const { error } = await extendClientMembershipRecord(supabase, membershipId, days);

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
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
