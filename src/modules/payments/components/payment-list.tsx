import Link from "next/link";
import { Pencil } from "lucide-react";

import { getText } from "@/lib/i18n";
import { buttonSecondary, cardSubtle, statusNeutral } from "@/lib/ui";
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
        className={cardSubtle}
        style={{
          padding: 18,
          borderRadius: 16,
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
          className={cardSubtle}
        style={{
          display: "grid",
          gap: 8,
          padding: 16,
          borderRadius: 16,
        }}
        >
          <div className="responsive-inline-header">
            <strong>${payment.amount.toFixed(2)}</strong>
            <span
              className={statusNeutral}
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

          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <Link href={`/dashboard/payments/${payment.id}/edit`} className={buttonSecondary}>
              <Pencil size={15} aria-hidden="true" />
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
