import Link from "next/link";

import { getText } from "@/lib/i18n";
import { MembershipOperationsDashboard } from "@/modules/memberships/components/membership-operations-dashboard";
import { MembershipPlanList } from "@/modules/memberships/components/membership-plan-list";
import {
  getMembershipPlansForPage,
  getOperationalMembershipsForPage,
} from "@/modules/memberships/services/membership-service";

export default async function MembershipsPage() {
  const t = await getText("memberships");
  const [
    { data: plans, error },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
    getMembershipPlansForPage(),
    getOperationalMembershipsForPage(),
  ]);

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
          <h1 style={{ margin: "0 0 8px" }}>{t.title}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t.description}
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
          {t.newPlan}
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

      {membershipsError ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {membershipsError}
        </p>
      ) : (
        <MembershipOperationsDashboard memberships={memberships} />
      )}

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Planes</h2>
        <MembershipPlanList plans={plans} />
      </section>
    </div>
  );
}
