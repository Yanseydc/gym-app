import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { RecentClientsPanel } from "@/modules/dashboard/components/recent-clients-panel";
import { RecentPaymentsPanel } from "@/modules/dashboard/components/recent-payments-panel";
import { getDashboardSnapshot } from "@/modules/dashboard/services/dashboard-service";
import { getAdminText } from "@/lib/i18n/admin";

export default async function DashboardPage() {
  const { t } = await getAdminText();
  const { metrics, recentPayments, recentClients, errors } = await getDashboardSnapshot();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px" }}>{t("dashboard.title")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("dashboard.description")}
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
        <KpiCard label={t("dashboard.activeClients")} value={String(metrics.activeClients)} tone="success" />
        <KpiCard label={t("dashboard.activeMemberships")} value={String(metrics.activeMemberships)} tone="success" />
        <KpiCard label={t("dashboard.expiredMemberships")} value={String(metrics.expiredMemberships)} tone="warning" />
        <KpiCard
          label={t("dashboard.expiringSoon")}
          value={String(metrics.membershipsExpiringSoon)}
          tone="warning"
        />
        <KpiCard label={t("dashboard.incomeToday")} value={`$${metrics.incomeToday.toFixed(2)}`} />
        <KpiCard
          label={t("dashboard.incomeThisMonth")}
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
