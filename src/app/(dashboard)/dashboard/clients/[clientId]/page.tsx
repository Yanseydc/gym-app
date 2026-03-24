import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientDetailCard } from "@/modules/clients/components/client-detail-card";
import { getClientForPage } from "@/modules/clients/services/client-service";

type ClientDetailPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const { data: client, error } = await getClientForPage(clientId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to clients
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
      <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
        Back to clients
      </Link>
      <ClientDetailCard client={client} />
    </div>
  );
}
