import Link from "next/link";

import type { RecentDashboardPayment } from "@/modules/dashboard/types";

type RecentPaymentsPanelProps = {
  payments: RecentDashboardPayment[];
};

export function RecentPaymentsPanel({ payments }: RecentPaymentsPanelProps) {
  return (
    <section
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 8px" }}>Recent payments</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Latest manual payments registered in the system.
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyState message="No payments registered yet." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {payments.map((payment) => (
            <article
              key={payment.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                background: "rgba(239, 229, 212, 0.45)",
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>
                  <Link href={`/dashboard/clients/${payment.clientId}`}>{payment.clientName}</Link>
                </strong>
                <span style={{ color: "var(--muted)" }}>
                  {payment.concept} · {payment.paymentDate}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ display: "block" }}>${payment.amount.toFixed(2)}</strong>
                <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>
                  {payment.paymentMethod}
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
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px dashed var(--border)",
        color: "var(--muted)",
      }}
    >
      {message}
    </div>
  );
}
