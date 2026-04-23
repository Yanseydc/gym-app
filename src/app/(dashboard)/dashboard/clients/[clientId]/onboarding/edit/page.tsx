import Link from "next/link";
import { notFound } from "next/navigation";

import { getText } from "@/lib/i18n";
import { buttonSecondary } from "@/lib/ui";
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
        <Link
          href={`/dashboard/clients/${clientId}`}
          className={buttonSecondary}
          style={{ width: "fit-content" }}
        >
          {t.templates.onboarding.backToClient}
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
      <Link
        href={`/dashboard/clients/${clientId}`}
        className={buttonSecondary}
        style={{ width: "fit-content" }}
      >
        {t.templates.onboarding.backToClient}
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.templates.onboarding.editTitle}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("templates.onboarding.editDescription", {
            name: `${client.firstName} ${client.lastName}`,
          })}
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
        <OnboardingForm
          action={updateOnboarding.bind(null, clientId)}
          defaultValues={defaultValues}
          submitLabel={common.saveChanges}
        />
      </section>
    </div>
  );
}
