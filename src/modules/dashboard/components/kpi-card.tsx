type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  const accent =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning-fg)"
        : "var(--foreground)";
  const rail =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning-fg)"
        : "var(--accent-info)";

  return (
    <article
      style={{
        display: "grid",
        gap: 6,
        padding: "14px 15px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface-row)",
        boxShadow: "none",
        boxSizing: "border-box",
        borderLeft: `3px solid ${rail}`,
      }}
    >
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 25, lineHeight: 1.1, color: accent }}>{value}</strong>
    </article>
  );
}
