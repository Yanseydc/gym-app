import Link from "next/link";

import { getText } from "@/lib/i18n";
import type { Payment } from "@/modules/payments/types";

type PaymentListProps = {
  payments: Payment[];
  showClient?: boolean;
};

export async function PaymentList({ payments, showClient = true }: PaymentListProps) {
  const t = await getText("payments");
  if (payments.length === 0) {
    return (
      <article
        style={{
          padding: 18,
          borderRadius: 16,
          border: "1px dashed var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
          color: "var(--muted)",
        }}
      >
        {t.empty}
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {payments.map((payment) => (
        <article
          key={payment.id}
        style={{
          display: "grid",
          gap: 8,
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
        >
          <div className="responsive-inline-header">
            <strong>${payment.amount.toFixed(2)}</strong>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {payment.paymentMethod}
            </span>
          </div>

          <div style={{ color: "var(--muted)", display: "grid", gap: 6 }}>
            {showClient ? (
              <span>
                {t.client}:{" "}
                <Link href={`/dashboard/clients/${payment.clientId}`} style={{ fontWeight: 700 }}>
                  {payment.clientName}
                </Link>
              </span>
            ) : null}
            <span>{t.concept}: {payment.concept}</span>
            <span>{t.date}: {payment.paymentDate}</span>
            <span>{t.membership}: {payment.membershipLabel ?? t.notLinked}</span>
          </div>

          <div>
            <Link href={`/dashboard/payments/${payment.id}/edit`} style={{ fontWeight: 700 }}>
              {t.editLink}
            </Link>
          </div>

          {payment.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {payment.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
