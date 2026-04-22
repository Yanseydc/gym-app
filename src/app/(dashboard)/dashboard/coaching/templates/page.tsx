import Link from "next/link";

import { RoutineTemplateList } from "@/modules/coaching/components/routine-template-list";
import { getRoutineTemplatesForPage } from "@/modules/coaching/services/routine-template-service";

export default async function RoutineTemplatesPage() {
  const { data: templates, error } = await getRoutineTemplatesForPage();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Routine templates</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Save reusable routine structures and apply them to clients as new drafts.
          </p>
        </div>

        <Link
          href="/dashboard/coaching/exercises"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          Back to coaching
        </Link>
      </header>

      {error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      ) : null}

      <RoutineTemplateList templates={templates} />
    </div>
  );
}
