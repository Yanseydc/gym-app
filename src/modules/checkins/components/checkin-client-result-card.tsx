import Link from "next/link";

import { CheckInForm } from "@/modules/checkins/components/checkin-form";
import { CheckInStatusBadge } from "@/modules/checkins/components/checkin-status-badge";
import { createCheckIn } from "@/modules/checkins/services/create-checkin";
import type { CheckInClientResult } from "@/modules/checkins/types";

export function CheckInClientResultCard({
  client,
}: {
  client: CheckInClientResult;
}) {
  const canCheckIn = client.membershipStatus === "active";

  return (
    <article
      style={{
        display: "grid",
        gap: 16,
        padding: 20,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ display: "block", fontSize: 20, marginBottom: 6 }}>
            <Link href={`/dashboard/clients/${client.id}`}>{client.fullName}</Link>
          </strong>
          <p style={{ margin: 0, color: "var(--muted)" }}>{client.membershipLabel}</p>
        </div>
        <CheckInStatusBadge status={client.membershipStatus} />
      </div>

      {!canCheckIn ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {client.membershipStatus === "expired"
            ? "This client has an expired membership. Entry should not be allowed."
            : client.membershipStatus === "pending_payment"
              ? "This client has a pending payment membership. Entry should not be allowed."
            : client.membershipStatus === "partial"
              ? "This client has a partially paid membership. Entry should not be allowed."
            : client.membershipStatus === "cancelled"
              ? "This client has a cancelled membership. Entry should not be allowed."
              : "This client does not have an active membership."}
        </div>
      ) : (
        <CheckInForm action={createCheckIn.bind(null, client.id)} />
      )}
    </article>
  );
}
