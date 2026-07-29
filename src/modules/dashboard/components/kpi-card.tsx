import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";

type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
  /** When present, the whole card becomes a link to this URL - used only by
   * the four membership KPI cards that deep-link to the operational list
   * filtered to their category. Cards without `href` render exactly as
   * before (a plain, non-interactive `<article>`, unchanged markup). */
  href?: string;
};

export function KpiCard({ label, value, tone = "default", href }: KpiCardProps) {
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

  const cardStyle: CSSProperties = {
    display: "grid",
    gap: 6,
    padding: "14px 15px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface-row)",
    boxShadow: "none",
    boxSizing: "border-box",
    borderLeft: `3px solid ${rail}`,
  };

  if (href) {
    // Omits boxShadow from the inline style (unlike cardStyle's base "none")
    // so the .ui-kpi-card-link:hover/:focus-visible rules in globals.css can
    // actually set it - an inline style always wins over an external
    // stylesheet rule, focus-visible or not, unless the property is absent.
    const { boxShadow: _boxShadow, ...linkStyle } = cardStyle;

    return (
      <Link href={href} className="ui-kpi-card-link" style={{ ...linkStyle, textDecoration: "none", color: "inherit" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{label}</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ display: "block", fontSize: 25, lineHeight: 1.1, color: accent }}>{value}</strong>
          <ChevronRight size={16} aria-hidden="true" style={{ color: "var(--muted)", flexShrink: 0 }} />
        </div>
      </Link>
    );
  }

  return (
    <article style={cardStyle}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 25, lineHeight: 1.1, color: accent }}>{value}</strong>
    </article>
  );
}
