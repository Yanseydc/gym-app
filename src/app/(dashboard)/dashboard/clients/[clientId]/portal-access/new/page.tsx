import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalAccessForm } from "@/modules/coaching/components/portal-access-form";
import { createPortalAccess } from "@/modules/coaching/services/create-portal-access";
import { getPortalAccessForPage } from "@/modules/coaching/services/portal-access-service";
import { getClientForPage } from "@/modules/clients/services/client-service";

type NewPortalAccessPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function NewPortalAccessPage({ params }: NewPortalAccessPageProps) {
  const { clientId } = await params;
  const [{ data: client, error }, { data: portalAccess, error: portalAccessError }] =
    await Promise.all([
      getClientForPage(clientId),
      getPortalAccessForPage(clientId),
    ]);

  if (error || portalAccessError) {
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
          {error ?? portalAccessError}
        </p>
      </div>
    );
  }

  if (!client) {
    notFound();
  }

  if (portalAccess) {
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
          This client already has portal access linked.
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
        <h1 style={{ margin: "0 0 8px" }}>Link portal access</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Link {client.firstName} {client.lastName} to an existing member account in the portal.
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
        <PortalAccessForm
          action={createPortalAccess.bind(null, clientId)}
        />
      </section>
    </div>
  );
}
