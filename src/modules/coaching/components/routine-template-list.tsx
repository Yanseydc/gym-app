import Link from "next/link";

import type { RoutineTemplateSummary } from "@/modules/coaching/types";

export function RoutineTemplateList({ templates }: { templates: RoutineTemplateSummary[] }) {
  if (templates.length === 0) {
    return (
      <article
        style={{
          padding: 24,
          borderRadius: 20,
          border: "1px dashed var(--border)",
          background: "rgba(255, 255, 255, 0.02)",
          color: "var(--muted)",
        }}
      >
        No routine templates saved yet.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {templates.map((template) => (
        <article
          key={template.id}
          style={{
            display: "grid",
            gap: 14,
            padding: 20,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(25, 30, 26, 0.98), rgba(20, 24, 21, 0.96))",
            boxShadow: "0 18px 38px rgba(0, 0, 0, 0.16)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 20 }}>{template.title}</strong>
              {template.notes ? (
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                  {template.notes}
                </p>
              ) : null}
            </div>

            <Link href={`/dashboard/coaching/templates/${template.id}`} style={actionLinkStyles}>
              View template
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <MetaChip label="Days" value={String(template.dayCount)} />
            <MetaChip label="Exercises" value={String(template.exerciseCount)} />
            <MetaChip label="Updated" value={new Date(template.updatedAt).toLocaleString()} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(239, 229, 212, 0.42)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

const actionLinkStyles = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--surface-alt)",
  border: "1px solid var(--border)",
  fontWeight: 700,
  height: "fit-content",
} as const;
