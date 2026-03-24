import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function PaymentsPage() {
  return (
    <DashboardShell
      title="Pagos"
      description="Placeholder inicial para cobros, historial y conciliación."
    >
      <PlaceholderCard
        title="Próximo alcance"
        body="Registro manual de pagos, estado de cobro y vista por socio o membresía."
      />
    </DashboardShell>
  );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ marginBottom: 0, color: "var(--muted)", lineHeight: 1.6 }}>{body}</p>
    </article>
  );
}
