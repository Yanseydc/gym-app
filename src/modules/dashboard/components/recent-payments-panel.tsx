import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { card, infoRow, statusNeutral } from "@/lib/ui";
import type { RecentDashboardPayment } from "@/modules/dashboard/types";

type RecentPaymentsPanelProps = {
  payments: RecentDashboardPayment[];
};

export async function RecentPaymentsPanel({ payments }: RecentPaymentsPanelProps) {
  const { t } = await getAdminText();

  return (
    <section
      className={card}
      style={{
        display: "grid",
        gap: 12,
        padding: 18,
        borderRadius: 18,
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 5px", fontSize: 18 }}>{t("dashboard.recentPaymentsTitle")}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.45 }}>
          {t("dashboard.recentPaymentsDescription")}
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyState message={t("dashboard.recentPaymentsEmpty")} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {payments.map((payment) => (
            <article
              key={payment.id}
              className={infoRow}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: "11px 12px",
                borderRadius: 12,
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 3, fontSize: 15 }}>
                  <Link href={`/dashboard/clients/${payment.clientId}`}>{payment.clientName}</Link>
                </strong>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {payment.concept} · {payment.paymentDate}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ display: "block" }}>${payment.amount.toFixed(2)}</strong>
                <span className={statusNeutral}>
                  {t(`payments.form.${payment.paymentMethod}`)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className={infoRow}
      style={{
        padding: 14,
        borderRadius: 12,
        color: "var(--muted)",
      }}
    >
      {message}
    </div>
  );
}
