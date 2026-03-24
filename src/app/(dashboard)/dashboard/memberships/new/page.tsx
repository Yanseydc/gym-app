import Link from "next/link";

import { MembershipPlanForm } from "@/modules/memberships/components/membership-plan-form";
import { createMembershipPlan } from "@/modules/memberships/services/create-membership-plan";

export default function NewMembershipPlanPage() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link
          href="/dashboard/memberships"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          Back to memberships
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create membership plan</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Define duration, price and availability for a new plan.
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
          submitLabel="Create membership plan"
        />
      </section>
    </div>
  );
}
