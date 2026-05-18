import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
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
        <BackNavigation href="/dashboard/memberships" label={t.backToMemberships} />
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
      <BackNavigation href={`/dashboard/memberships/${plan.id}`} label={t.backToPlan} />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.editPlan}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.editDescription}
        </p>
      </header>

      <section
        className="premium-panel"
        style={{
          padding: 24,
          borderRadius: 24,
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
