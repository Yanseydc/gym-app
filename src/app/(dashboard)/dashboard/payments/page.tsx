export default function PaymentsPage() {
  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px" }}>Pagos</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Placeholder inicial para cobros, historial y conciliación.
        </p>
      </header>
      <PlaceholderCard
        title="Próximo alcance"
        body="Registro manual de pagos, estado de cobro y vista por socio o membresía."
      />
    </>
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
