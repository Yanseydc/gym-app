import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressCheckInForm } from "@/modules/coaching/components/progress-checkin-form";
import { createProgressCheckIn } from "@/modules/coaching/services/create-progress-checkin";
import { getClientForPage } from "@/modules/clients/services/client-service";

type NewProgressCheckInPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function NewProgressCheckInPage({ params }: NewProgressCheckInPageProps) {
  const { clientId } = await params;
  const { data: client, error } = await getClientForPage(clientId);

  if (error) {
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
          {error}
        </p>
      </div>
    );
  }

  if (!client) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to client
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create progress check-in</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Capture a new progress snapshot for {client.firstName} {client.lastName}.
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
        <ProgressCheckInForm
          action={createProgressCheckIn.bind(null, clientId)}
          submitLabel="Create check-in"
        />
      </section>
    </div>
  );
}
