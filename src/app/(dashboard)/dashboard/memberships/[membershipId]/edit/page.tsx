import Link from "next/link";
import { notFound } from "next/navigation";

import { getText } from "@/lib/i18n";
import { MembershipPlanForm } from "@/modules/memberships/components/membership-plan-form";
import { getMembershipPlanForPage } from "@/modules/memberships/services/membership-service";
import { updateMembershipPlan } from "@/modules/memberships/services/update-membership-plan";
import type { MembershipPlanFormValues } from "@/modules/memberships/types";

type EditMembershipPlanPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

export default async function EditMembershipPlanPage({
  params,
}: EditMembershipPlanPageProps) {
  const t = await getText("memberships");
  const { membershipId } = await params;
  const { data: plan, error } = await getMembershipPlanForPage(membershipId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link
          href="/dashboard/memberships"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          {t.backToMemberships}
        </Link>
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!plan) {
    notFound();
  }

  const defaultValues: MembershipPlanFormValues = {
    name: plan.name,
    durationInDays: plan.durationInDays,
    price: plan.price,
    description: plan.description ?? "",
    isActive: plan.isActive,
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href={`/dashboard/memberships/${plan.id}`}
        style={{ color: "var(--muted)", fontWeight: 600 }}
      >
        {t.backToPlan}
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.editPlan}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.editDescription}
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <MembershipPlanForm
          action={updateMembershipPlan.bind(null, plan.id)}
          defaultValues={defaultValues}
          submitLabel={(await getText("common")).saveChanges}
        />
      </section>
    </div>
  );
}
