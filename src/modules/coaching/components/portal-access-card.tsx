import Link from "next/link";

import type { ClientPortalAccess } from "@/modules/coaching/types";

export function ClientPortalAccessCard({
  clientId,
  portalAccess,
}: {
  clientId: string;
  portalAccess: ClientPortalAccess | null;
}) {
  if (!portalAccess) {
    return (
      <article
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px dashed var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Portal access</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            This client does not have portal access linked yet.
          </p>
        </div>

        <div>
          <Link
            href={`/dashboard/clients/${clientId}/portal-access/new`}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 14,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Link portal user
          </Link>
        </div>
      </article>
    );
  }

  const fullName = [portalAccess.profile.firstName, portalAccess.profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      style={{
        display: "grid",
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 8px" }}>Portal access</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This client is already linked to a portal user.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label="Portal user" value={fullName || "No name"} />
        <DetailItem label="Email" value={portalAccess.profile.email} />
        <DetailItem label="Role" value={portalAccess.profile.role} />
        <DetailItem label="Linked at" value={new Date(portalAccess.linkedAt).toLocaleString()} />
      </div>
    </article>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(239, 229, 212, 0.5)",
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong>
    </div>
  );
}
