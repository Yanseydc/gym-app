import Link from "next/link";
import { notFound } from "next/navigation";

import { RoutineTemplateForm } from "@/modules/coaching/components/routine-template-form";
import { createRoutineTemplate } from "@/modules/coaching/services/create-routine-template";
import { getRoutineForPage } from "@/modules/coaching/services/routine-service";
import type { RoutineTemplateFormValues } from "@/modules/coaching/types";

type NewRoutineTemplatePageProps = {
  searchParams?: Promise<{
    routineId?: string;
    returnTo?: string;
  }>;
};

export default async function NewRoutineTemplatePage({
  searchParams,
}: NewRoutineTemplatePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const routineId = resolvedSearchParams.routineId ?? "";
  const returnPath = resolvedSearchParams.returnTo ?? `/dashboard/coaching/routines/${routineId}`;

  if (!routineId) {
    notFound();
  }

  const { data: routine, error } = await getRoutineForPage(routineId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href={returnPath} style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back
        </Link>
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
      </div>
    );
  }

  if (!routine) {
    notFound();
  }

  const defaultValues: RoutineTemplateFormValues = {
    title: `${routine.title} Template`,
    notes: routine.notes ?? "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href={returnPath} style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to routine
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Save routine as template</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This will copy the routine structure, its days, and all prescribed exercises into a reusable template.
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <RoutineTemplateForm
          action={createRoutineTemplate.bind(null, routine.id, returnPath)}
          defaultValues={defaultValues}
          submitLabel="Save template"
        />
      </section>
    </div>
  );
}
