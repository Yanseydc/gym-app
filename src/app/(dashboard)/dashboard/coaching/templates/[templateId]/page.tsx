import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
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
  const { t: adminT } = await getAdminText();
  const t = await getText("coaching");
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
        <BackNavigation href="/dashboard/coaching/templates" label={t.templates.backToTemplates} />
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
      <BackNavigation
        href="/dashboard/coaching/templates"
        label={t.templates.backToTemplates}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: adminT("nav.coaching") },
          { href: "/dashboard/coaching/templates", label: t.templates.title },
          { label: template.title },
        ]}
      />

      <section
        className="premium-panel feature-panel"
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
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
