import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { RecentClientsPanel } from "@/modules/dashboard/components/recent-clients-panel";
import { RecentPaymentsPanel } from "@/modules/dashboard/components/recent-payments-panel";
import { getDashboardSnapshot } from "@/modules/dashboard/services/dashboard-service";

export default async function DashboardPage() {
  const { metrics, recentPayments, recentClients, errors } = await getDashboardSnapshot();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px" }}>Dashboard</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Operational view for staff and administration.
        </p>
      </header>

      {errors.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 16,
            borderRadius: 16,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <KpiCard label="Active clients" value={String(metrics.activeClients)} tone="success" />
        <KpiCard label="Active memberships" value={String(metrics.activeMemberships)} tone="success" />
        <KpiCard label="Expired memberships" value={String(metrics.expiredMemberships)} tone="warning" />
        <KpiCard
          label="Expiring in 7 days"
          value={String(metrics.membershipsExpiringSoon)}
          tone="warning"
        />
        <KpiCard label="Income today" value={`$${metrics.incomeToday.toFixed(2)}`} />
        <KpiCard
          label="Income this month"
          value={`$${metrics.incomeThisMonth.toFixed(2)}`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <RecentPaymentsPanel payments={recentPayments} />
        <RecentClientsPanel clients={recentClients} />
      </div>
    </div>
  );
}
