import Link from "next/link";

import type { ProgressCheckInSummary } from "@/modules/coaching/types";

export function ProgressCheckInSection({
  checkIns,
  clientId,
}: {
  checkIns: ProgressCheckInSummary[];
  clientId: string;
}) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Progress check-ins</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Capture progress snapshots with notes and front, side, back photos.
          </p>
        </div>

        <Link
          href={`/dashboard/clients/${clientId}/progress-checkins/new`}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          New check-in
        </Link>
      </div>

      {checkIns.length === 0 ? (
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
          <p style={{ margin: 0, color: "var(--muted)" }}>
            No progress check-ins recorded yet.
          </p>
          <div>
            <Link
              href={`/dashboard/clients/${clientId}/progress-checkins/new`}
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: 14,
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Create first check-in
            </Link>
          </div>
        </article>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {checkIns.map((checkIn) => (
            <article
              key={checkIn.id}
              style={{
                display: "grid",
                gap: 10,
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
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <strong>{checkIn.checkinDate}</strong>
                <Link
                  href={`/dashboard/clients/${clientId}/progress-checkins/${checkIn.id}/edit`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--surface-alt)",
                    fontWeight: 700,
                  }}
                >
                  Edit
                </Link>
              </div>

              <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>Weight: {checkIn.weightKg ? `${checkIn.weightKg} kg` : "N/A"}</span>
                <span>Photos: {checkIn.photoTypes.length > 0 ? checkIn.photoTypes.join(", ") : "None"}</span>
              </div>

              {checkIn.clientNotes ? (
                <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                  Client: {checkIn.clientNotes}
                </p>
              ) : null}
              {checkIn.coachNotes ? (
                <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                  Coach: {checkIn.coachNotes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
