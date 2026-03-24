import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function MembershipsPage() {
  return (
    <DashboardShell
      title="Membresias"
      description="Placeholder inicial para planes, suscripciones y renovaciones."
    >
      <PlaceholderCard
        title="Próximo alcance"
        body="Catálogo de planes, activación de membresías, congelamientos y vencimientos."
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
