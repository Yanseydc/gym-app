import Link from "next/link";

import { MembershipPlanList } from "@/modules/memberships/components/membership-plan-list";
import { getMembershipPlansForPage } from "@/modules/memberships/services/membership-service";

export default async function MembershipsPage() {
  const { data: plans, error } = await getMembershipPlansForPage();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Memberships</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Manage membership plans and review their assignment history.
          </p>
        </div>

        <Link
          href="/dashboard/memberships/new"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          New plan
        </Link>
      </header>

      {error ? (
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
      ) : null}

      <MembershipPlanList plans={plans} />
    </div>
  );
}
