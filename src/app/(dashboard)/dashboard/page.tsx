import { getCurrentUser } from "@/modules/auth/services/auth-service";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px" }}>Dashboard</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Vista inicial para staff y administración del gimnasio.
        </p>
      </header>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <MetricCard label="Rol actual" value={user.role} />
        <MetricCard label="Sucursal" value="Por definir" />
        <MetricCard label="Estado" value="Scaffold inicial" />
      </div>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <p style={{ marginTop: 0, marginBottom: 8, color: "var(--muted)" }}>{label}</p>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </article>
  );
}
