import Link from "next/link";
import { notFound } from "next/navigation";

import { getText } from "@/lib/i18n";
import { RoutineTemplateApplyForm } from "@/modules/coaching/components/routine-template-apply-form";
import { RoutineTemplateDetailCard } from "@/modules/coaching/components/routine-template-detail-card";
import { applyRoutineTemplate } from "@/modules/coaching/services/apply-routine-template";
import { getRoutineTemplateForPage } from "@/modules/coaching/services/routine-template-service";
import { getRoutineClientOptionsForPage } from "@/modules/coaching/services/routine-service";

type RoutineTemplateDetailPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function RoutineTemplateDetailPage({
  params,
}: RoutineTemplateDetailPageProps) {
  const t = await getText("coaching");
  const common = await getText("common");
  const { templateId } = await params;
  const [
    { data: template, error },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    getRoutineTemplateForPage(templateId),
    getRoutineClientOptionsForPage(),
  ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/coaching/templates" style={{ color: "var(--muted)", fontWeight: 600 }}>
          {common.back}
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

  if (!template) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href="/dashboard/coaching/templates" style={{ color: "var(--muted)", fontWeight: 600 }}>
        {t.templates.backToTemplates}
      </Link>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
        >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>{t.templates.applyTemplate}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t.templates.applyDescription}
          </p>
        </div>

        {clientsError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {clientsError}
          </p>
        ) : (
          <RoutineTemplateApplyForm
            action={applyRoutineTemplate.bind(null, template.id)}
            clients={clients}
          />
        )}
      </section>

      <RoutineTemplateDetailCard template={template} />
    </div>
  );
}
