import Link from "next/link";
import { notFound } from "next/navigation";

import { OnboardingForm } from "@/modules/coaching/components/onboarding-form";
import { createOnboarding } from "@/modules/coaching/services/create-onboarding";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";
import { getClientForPage } from "@/modules/clients/services/client-service";

type NewOnboardingPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function NewOnboardingPage({ params }: NewOnboardingPageProps) {
  const { clientId } = await params;
  const [{ data: client, error }, { data: onboarding, error: onboardingError }] = await Promise.all([
    getClientForPage(clientId),
    getOnboardingForPage(clientId),
  ]);

  if (error || onboardingError) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to client
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

  if (!client) {
    notFound();
  }

  if (onboarding) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to client
        </Link>
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff7e8",
            color: "#7a5a2f",
          }}
        >
          This client already has onboarding. Use edit instead.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to client
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create coaching onboarding</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Capture the initial coaching context for {client.firstName} {client.lastName}.
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
          action={createOnboarding.bind(null, clientId)}
          submitLabel="Create onboarding"
        />
      </section>
    </div>
  );
}
