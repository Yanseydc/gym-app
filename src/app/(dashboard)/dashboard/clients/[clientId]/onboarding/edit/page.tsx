import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { getText } from "@/lib/i18n";
import { OnboardingForm } from "@/modules/coaching/components/onboarding-form";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { updateOnboarding } from "@/modules/coaching/services/update-onboarding";
import type { ClientOnboardingFormValues } from "@/modules/coaching/types";
import { getClientForPage } from "@/modules/clients/services/client-service";

type EditOnboardingPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function EditOnboardingPage({ params }: EditOnboardingPageProps) {
  const { t: adminT } = await getAdminText();
  const t = await getText("coaching");
  const common = await getText("common");
  const { clientId } = await params;
  const [{ data: client, error }, { data: onboarding, error: onboardingError }] = await Promise.all([
    getClientForPage(clientId),
    getOnboardingForPage(clientId),
  ]);

  if (error || onboardingError) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href={`/dashboard/clients/${clientId}?tab=coaching`} label={adminT("common.backToCoaching")} />
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error ?? onboardingError}
        </p>
      </div>
    );
  }

  if (!client || !onboarding) {
    notFound();
  }

  const defaultValues: ClientOnboardingFormValues = {
    weightKg: onboarding.weightKg,
    heightCm: onboarding.heightCm,
    goal: onboarding.goal,
    availableDays: onboarding.availableDays,
    availableSchedule: onboarding.availableSchedule,
    injuriesNotes: onboarding.injuriesNotes ?? "",
    experienceLevel: onboarding.experienceLevel,
    notes: onboarding.notes ?? "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation
        href={`/dashboard/clients/${clientId}?tab=coaching`}
        label={adminT("common.backToCoaching")}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: adminT("nav.coaching") },
          { href: `/dashboard/clients/${clientId}?tab=coaching`, label: `${client.firstName} ${client.lastName}` },
          { label: t.templates.onboarding.editTitle },
        ]}
      />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.templates.onboarding.editTitle}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("templates.onboarding.editDescription", {
            name: `${client.firstName} ${client.lastName}`,
          })}
        </p>
      </header>

      <section
        className="premium-panel feature-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        <OnboardingForm
          action={updateOnboarding.bind(null, clientId)}
          defaultValues={defaultValues}
          submitLabel={common.saveChanges}
        />
      </section>
    </div>
  );
}
