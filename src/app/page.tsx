import Link from "next/link";

const sections = [
  {
    title: "Operación diaria",
    description: "Socios, check-ins, pagos y clases desde un solo panel.",
  },
  {
    title: "Arquitectura modular",
    description: "Features desacopladas para crecer sin reescribir el proyecto.",
  },
  {
    title: "Auth con roles",
    description: "Base lista para super admin, admin, staff, coach y cliente sobre Supabase.",
  },
];

export default function HomePage() {
  return (
    <main style={{ padding: "56px 0 72px" }}>
      <section
        style={{
          display: "grid",
          gap: 24,
          padding: 32,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          borderRadius: "calc(var(--radius) * 1.25)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <span
            style={{
              width: "fit-content",
              padding: "6px 12px",
              borderRadius: 999,
              background: "var(--surface-alt)",
              color: "var(--accent-strong)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            GymOS MVP Scaffold
          </span>
          <h1 style={{ margin: 0, fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
            Plataforma base para operar un gimnasio.
          </h1>
          <p style={{ margin: 0, maxWidth: 720, color: "var(--muted)", lineHeight: 1.7 }}>
            Este scaffold deja configurado Next.js, Supabase, estructura modular por
            features y el punto de partida para autenticación con roles.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{
              padding: "14px 18px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Ir a login
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: "14px 18px",
              border: "1px solid var(--border)",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Ver dashboard
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {sections.map((section) => (
          <article
            key={section.title}
            style={{
              padding: 20,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "rgba(255, 250, 243, 0.9)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>{section.title}</h2>
            <p style={{ marginBottom: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              {section.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
