import Link from "next/link";

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
      <div>
        <Link
          href="/dashboard/memberships"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          {t.backToMemberships}
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.createPlan}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.createDescription}
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
          action={createMembershipPlan}
          submitLabel={t.createPlan}
        />
      </section>
    </div>
  );
}
