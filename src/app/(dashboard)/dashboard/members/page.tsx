import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function MembersPage() {
  return (
    <DashboardShell
      title="Socios"
      description="Placeholder inicial para el módulo de gestión de socios."
    >
      <PlaceholderCard
        title="Próximo alcance"
        body="Alta, edición, búsqueda, estado de membresía y check-in por sucursal."
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
