import Link from "next/link";

import { getText } from "@/lib/i18n";
import { PaymentList } from "@/modules/payments/components/payment-list";
import { getPaymentsForPage } from "@/modules/payments/services/payment-service";

export default async function PaymentsPage() {
  const t = await getText("payments");
  const { data: payments, error } = await getPaymentsForPage();

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
          href="/dashboard/payments/new"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {t.newPayment}
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

      <PaymentList payments={payments} />
    </div>
  );
}
