import Link from "next/link";

import type { ClientCheckIn } from "@/modules/checkins/types";

type CheckInHistoryListProps = {
  checkIns: ClientCheckIn[];
  showClient?: boolean;
};

export function CheckInHistoryList({
  checkIns,
  showClient = true,
}: CheckInHistoryListProps) {
  if (checkIns.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        No check-ins registered yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {checkIns.map((checkIn) => (
        <article
          key={checkIn.id}
          style={{
            display: "grid",
            gap: 8,
            padding: 18,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong>
              {showClient ? (
                <Link href={`/dashboard/clients/${checkIn.clientId}`}>{checkIn.clientName}</Link>
              ) : (
                checkIn.clientName
              )}
            </strong>
            <span style={{ color: "var(--muted)" }}>
              {new Date(checkIn.checkedInAt).toLocaleString()}
            </span>
          </div>
          {checkIn.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {checkIn.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
