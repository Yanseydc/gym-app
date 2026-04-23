import Link from "next/link";

import { getText } from "@/lib/i18n";
import { PaymentForm } from "@/modules/payments/components/payment-form";
import { createPayment } from "@/modules/payments/services/create-payment";
import { getPaymentFormOptionsForPage } from "@/modules/payments/services/payment-service";

type NewPaymentPageProps = {
  searchParams?: Promise<{
    clientId?: string;
  }>;
};

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const t = await getText("payments");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { clients, memberships, error } = await getPaymentFormOptionsForPage();
  const selectedClientId = resolvedSearchParams.clientId ?? "";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link href="/dashboard/payments" style={{ color: "var(--muted)", fontWeight: 600 }}>
          {t.backToPayments}
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.registerPayment}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.registerDescription}
        </p>
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

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <PaymentForm
          action={createPayment.bind(null, null)}
          clients={clients}
          memberships={memberships}
          submitLabel={t.registerPayment}
          defaultValues={{ clientId: selectedClientId }}
        />
      </section>
    </div>
  );
}
