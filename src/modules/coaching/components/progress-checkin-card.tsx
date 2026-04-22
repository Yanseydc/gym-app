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
            border: "1px solid var(--border)",
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
            gap: 14,
            padding: 18,
            borderRadius: 18,
            border: "1px dashed var(--border)",
            background: "rgba(255, 255, 255, 0.03)",
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
                color: "#121513",
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
                gap: 12,
                padding: 16,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.03)",
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
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Check-in
                  </span>
                  <strong style={{ fontSize: 18 }}>{checkIn.checkinDate}</strong>
                </div>
                <Link
                  href={`/dashboard/clients/${clientId}/progress-checkins/${checkIn.id}/edit`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                    fontWeight: 700,
                  }}
                >
                  Edit
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <MetaPill label="Weight" value={checkIn.weightKg ? `${checkIn.weightKg} kg` : "N/A"} />
                <MetaPill
                  label="Photos"
                  value={checkIn.photoTypes.length > 0 ? checkIn.photoTypes.join(", ") : "None"}
                />
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

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
