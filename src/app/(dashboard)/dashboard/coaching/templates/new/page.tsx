import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { getText } from "@/lib/i18n";
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
  const { t: adminT } = await getAdminText();
  const t = await getText("coaching");
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
        <BackNavigation href={returnPath} label={(await getText("common")).back} />
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
      <BackNavigation
        href={returnPath}
        label={t.templates.backToRoutine}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: adminT("nav.coaching") },
          { href: returnPath, label: routine.title },
          { label: t.templates.saveAsTemplate },
        ]}
      />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.templates.saveAsTemplate}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.templates.saveDescription}
        </p>
      </header>

      <section
        className="premium-panel feature-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        <RoutineTemplateForm
          action={createRoutineTemplate.bind(null, routine.id, returnPath)}
          defaultValues={defaultValues}
          submitLabel={t.templates.saveTemplate}
        />
      </section>
    </div>
  );
}
