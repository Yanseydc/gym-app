type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  const accent =
    tone === "success"
      ? "#1f6b42"
      : tone === "warning"
        ? "#7a5a2f"
        : "var(--accent-strong)";

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
      <strong style={{ display: "block", fontSize: 28, color: accent }}>{value}</strong>
    </article>
  );
}
