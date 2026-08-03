import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { card, infoRow, metaChip } from "@/lib/ui";
import type { AttentionPendingPaymentMembership } from "@/modules/dashboard/types";
import { MembershipStatusBadge } from "@/modules/memberships/components/membership-status-badge";
import { buildPendingPaymentsHref } from "@/modules/memberships/lib/membership-list-filter";

type PendingPaymentsPanelProps = {
  items: AttentionPendingPaymentMembership[];
  total: number;
};

export async function PendingPaymentsPanel({ items, total }: PendingPaymentsPanelProps) {
  const { t, locale } = await getAdminText();
  const formattingLocale = locale === "es" ? "es-MX" : "en-US";
  const currencyFormatter = new Intl.NumberFormat(formattingLocale, { style: "currency", currency: "MXN" });

  return (
    <section className={card} style={{ display: "grid", gap: 12, padding: 18, borderRadius: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 5px", fontSize: 18 }}>{t("dashboard.attention.pending.title")}</h3>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.45 }}>
            {t("dashboard.attention.pending.description")}
          </p>
        </div>
        <span className={metaChip}>{total}</span>
      </div>

      {items.length === 0 ? (
        <EmptyState message={t("dashboard.attention.pending.empty")} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <article
              key={item.id}
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
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", marginBottom: 3, fontSize: 15 }}>
                  <Link href={`/dashboard/clients/${item.clientId}`}>{item.clientName}</Link>
                </strong>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{item.planName}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <MembershipStatusBadge status={item.status} />
                <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {t("memberships.operations.balance", { amount: currencyFormatter.format(item.remainingBalance) })}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {total > items.length ? (
        <Link href={buildPendingPaymentsHref()} style={{ fontSize: 14, fontWeight: 700 }}>
          {t("dashboard.attention.viewAll")}
        </Link>
      ) : null}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className={infoRow} style={{ padding: 14, borderRadius: 12, color: "var(--muted)" }}>
      {message}
    </div>
  );
}
