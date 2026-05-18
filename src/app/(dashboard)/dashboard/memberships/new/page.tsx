import { BackNavigation } from "@/components/navigation/back-navigation";
import { getText } from "@/lib/i18n";
import { MembershipPlanForm } from "@/modules/memberships/components/membership-plan-form";
import { createMembershipPlan } from "@/modules/memberships/services/create-membership-plan";

export default function NewMembershipPlanPage() {
  const tPromise = getText("memberships");
  return <NewMembershipPlanPageContent tPromise={tPromise} />;
}

async function NewMembershipPlanPageContent({ tPromise }: { tPromise: ReturnType<typeof getText> }) {
  const t = await tPromise;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation href="/dashboard/memberships" label={t.backToMemberships} />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.createPlan}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.createDescription}
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
          action={createMembershipPlan}
          submitLabel={t.createPlan}
        />
      </section>
    </div>
  );
}
