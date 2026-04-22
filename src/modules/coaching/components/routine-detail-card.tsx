import Link from "next/link";

import { DuplicateRoutineButton } from "@/modules/coaching/components/duplicate-routine-button";
import type { ClientRoutine, ClientRoutineSummary } from "@/modules/coaching/types";

export function RoutineSummaryList({
  clientId,
  routines,
}: {
  clientId: string;
  routines: ClientRoutineSummary[];
}) {
  if (routines.length === 0) {
    return (
      <article
        style={{
          padding: 24,
          borderRadius: 20,
          border: "1px dashed var(--border)",
          background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.88))",
          color: "var(--muted)",
        }}
      >
        No routines created yet for this client.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {routines.map((routine) => (
        <article
          key={routine.id}
          style={{
            display: "grid",
            gap: 14,
            padding: 20,
            borderRadius: 20,
            border: "1px solid rgba(0, 0, 0, 0.06)",
            background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.78))",
            boxShadow: "var(--shadow)",
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
            <div>
              <strong style={{ fontSize: 20 }}>{routine.title}</strong>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>
                {routine.dayCount} day{routine.dayCount === 1 ? "" : "s"}
              </div>
            </div>

            <StatusPill status={routine.status} />
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <DetailChip label="Starts on" value={routine.startsOn || "No start date"} />
            <DetailChip label="Ends on" value={routine.endsOn || "No end date"} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/dashboard/coaching/routines/${routine.id}`}
              style={actionLinkStyles}
            >
              View routine
            </Link>
            <Link
              href={`/dashboard/coaching/routines/${routine.id}/edit`}
              style={actionLinkStyles}
            >
              Edit routine
            </Link>
            <DuplicateRoutineButton
              routineId={routine.id}
              returnPath={`/dashboard/clients/${clientId}`}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function RoutineDetailCard({ routine, showEditLink = false }: {
  routine: ClientRoutine;
  showEditLink?: boolean;
}) {
  return (
    <article
      style={{
        display: "grid",
        gap: 22,
        padding: 28,
        borderRadius: 28,
        border: "1px solid rgba(0, 0, 0, 0.06)",
        background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.82))",
        boxShadow: "var(--shadow)",
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
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Routine overview
          </span>
          <h1 style={{ margin: "0 0 8px" }}>{routine.title}</h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <StatusPill status={routine.status} />
            <span style={{ color: "var(--muted)" }}>{routine.clientName}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {showEditLink ? (
            <Link href={`/dashboard/coaching/routines/${routine.id}/edit`} style={actionLinkStyles}>
              Edit routine
            </Link>
          ) : null}
          <DuplicateRoutineButton
            routineId={routine.id}
            returnPath={`/dashboard/coaching/routines/${routine.id}`}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label="Starts on" value={routine.startsOn || "Not set"} />
        <DetailItem label="Ends on" value={routine.endsOn || "Not set"} />
        <DetailItem label="Updated" value={new Date(routine.updatedAt).toLocaleString()} />
        <DetailItem label="Notes" value={routine.notes || "No notes"} fullWidth />
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Routine days</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Ordered day blocks and prescribed exercises for this client.
          </p>
        </div>

        {routine.days.length === 0 ? (
          <article
            style={{
              padding: 24,
              borderRadius: 20,
              border: "1px dashed var(--border)",
              background: "rgba(255, 250, 243, 0.92)",
              color: "var(--muted)",
            }}
          >
            No days added yet.
          </article>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {routine.days.map((day) => (
              <article
                key={day.id}
                style={{
                  display: "grid",
                  gap: 16,
                  padding: 22,
                  borderRadius: 22,
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  background: "rgba(255, 250, 243, 0.92)",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#fff",
                      color: "var(--accent-strong)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Day {day.dayIndex}
                  </span>
                  <strong style={{ display: "block", fontSize: 20, marginTop: 10 }}>
                    {day.title}
                  </strong>
                  {day.notes ? (
                    <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                      {day.notes}
                    </p>
                  ) : null}
                </div>

                {day.exercises.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)" }}>No exercises added yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {day.exercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        style={{
                          display: "grid",
                          gap: 12,
                          padding: 18,
                          borderRadius: 18,
                          background: "#fff",
                          border: "1px solid rgba(0, 0, 0, 0.06)",
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
                          <strong>
                            #{exercise.sortOrder} {exercise.exerciseName}
                          </strong>
                          <span style={{ color: "var(--muted)" }}>{exercise.exerciseSlug}</span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                          }}
                        >
                          <DetailChip label="Sets" value={exercise.setsText} />
                          <DetailChip label="Reps" value={exercise.repsText} />
                          <DetailChip label="Weight" value={exercise.targetWeightText || "N/A"} />
                          <DetailChip label="Rest" value={`${exercise.restSeconds ?? "N/A"} sec`} />
                        </div>
                        {exercise.notes ? (
                          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                            {exercise.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(239, 229, 212, 0.42)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: ClientRoutineSummary["status"] }) {
  const styles =
    status === "active"
      ? { background: "#dff4e8", color: "#1f6b42" }
      : status === "archived"
        ? { background: "#efe3d3", color: "#7a5a2f" }
        : { background: "#e7ecf5", color: "#31527a" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        ...styles,
      }}
    >
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}

function DetailItem({
  fullWidth = false,
  label,
  value,
}: {
  fullWidth?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(239, 229, 212, 0.5)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

const actionLinkStyles = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--surface-alt)",
  fontWeight: 700,
} as const;
