import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentEditForm } from "@/modules/payments/components/payment-edit-form";
import { getPaymentForPage } from "@/modules/payments/services/payment-service";
import { updatePayment } from "@/modules/payments/services/update-payment";

type EditPaymentPageProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export default async function EditPaymentPage({ params }: EditPaymentPageProps) {
  const { paymentId } = await params;
  const { data: payment, error } = await getPaymentForPage(paymentId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/payments" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to payments
        </Link>
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
      </div>
    );
  }

  if (!payment) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link href="/dashboard/payments" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to payments
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Edit payment</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Update concept and notes for this payment.
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <PaymentEditForm action={updatePayment.bind(null, payment.id)} payment={payment} />
      </section>
    </div>
  );
}
