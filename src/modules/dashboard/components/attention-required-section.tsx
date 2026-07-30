import { getAdminText } from "@/lib/i18n/admin";
import { ExpiringMembershipsPanel } from "@/modules/dashboard/components/expiring-memberships-panel";
import { PendingPaymentsPanel } from "@/modules/dashboard/components/pending-payments-panel";
import type { AttentionRequiredSnapshot } from "@/modules/dashboard/types";

type AttentionRequiredSectionProps = {
  attentionRequired: AttentionRequiredSnapshot;
};

export async function AttentionRequiredSection({ attentionRequired }: AttentionRequiredSectionProps) {
  const { t } = await getAdminText();

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>{t("dashboard.attention.title")}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
          {t("dashboard.attention.description")}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <ExpiringMembershipsPanel items={attentionRequired.expiring} total={attentionRequired.expiringTotal} />
        <PendingPaymentsPanel items={attentionRequired.pendingPayments} total={attentionRequired.pendingPaymentsTotal} />
      </div>
    </section>
  );
}
