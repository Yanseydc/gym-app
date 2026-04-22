import Link from "next/link";

import { buttonSecondary } from "@/lib/ui";
import { ArchiveRoutineButton } from "@/modules/coaching/components/archive-routine-button";
import { DuplicateRoutineButton } from "@/modules/coaching/components/duplicate-routine-button";
import { SaveRoutineTemplateLink } from "@/modules/coaching/components/save-routine-template-link";
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
          padding: 18,
          borderRadius: 18,
          border: "1px dashed var(--border)",
          background: "rgba(255, 255, 255, 0.02)",
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
            gap: 8,
            padding: 14,
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.035)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 4,
              background:
                routine.status === "active"
                  ? "linear-gradient(180deg, #3b9f68, #7fd2a0)"
                  : routine.status === "archived"
                    ? "linear-gradient(180deg, #966a39, #c79a6d)"
                    : "linear-gradient(180deg, #34658f, #67a3d7)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 18, lineHeight: 1.2 }}>
                {routine.title}
              </strong>
              <div
                style={{
                  marginTop: 6,
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--accent-strong)" }}>
                  {routine.dayCount} day{routine.dayCount === 1 ? "" : "s"}
                </span>
                <span> · </span>
                {routine.startsOn ? `Starts ${routine.startsOn}` : "No start date"}
                <span> · </span>
                {routine.endsOn ? `Ends ${routine.endsOn}` : "No end date"}
              </div>
            </div>

            <StatusPill status={routine.status} />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
            }}
          >
            <Link
              href={`/dashboard/coaching/routines/${routine.id}`}
              className={actionLinkStyles}
            >
              View routine
            </Link>
            <Link
              href={`/dashboard/coaching/routines/${routine.id}/edit`}
              className={actionLinkStyles}
            >
              Edit routine
            </Link>
            <DuplicateRoutineButton
              routineId={routine.id}
              returnPath={`/dashboard/clients/${clientId}`}
            />
            <ArchiveRoutineButton
              routineId={routine.id}
              returnPath={`/dashboard/clients/${clientId}?tab=coaching`}
              status={routine.status}
            />
            <SaveRoutineTemplateLink
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
        gap: 20,
        padding: 22,
        borderRadius: 28,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(25, 30, 26, 0.98), rgba(20, 24, 21, 0.96))",
        boxShadow: "0 18px 38px rgba(0, 0, 0, 0.16)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <div className="responsive-inline-header">
          <div style={{ minWidth: 0, display: "grid", gap: 10 }}>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Routine overview
            </span>
            <div style={{ display: "grid", gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 3vw, 2.35rem)", lineHeight: 1.05 }}>
                {routine.title}
              </h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <StatusPill status={routine.status} />
                <span style={{ color: "var(--muted)" }}>{routine.clientName}</span>
              </div>
            </div>
          </div>

          <div className="responsive-actions-wrap" style={{ alignItems: "stretch" }}>
          {showEditLink ? (
            <Link href={`/dashboard/coaching/routines/${routine.id}/edit`} className={actionLinkStyles}>
              Edit routine
            </Link>
          ) : null}
          <DuplicateRoutineButton
            routineId={routine.id}
            returnPath={`/dashboard/coaching/routines/${routine.id}`}
          />
          <ArchiveRoutineButton
            routineId={routine.id}
            returnPath={`/dashboard/coaching/routines/${routine.id}`}
            status={routine.status}
          />
          <SaveRoutineTemplateLink
            routineId={routine.id}
            returnPath={`/dashboard/coaching/routines/${routine.id}`}
          />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 16,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.025)",
          }}
        >
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Planning notes
          </span>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.65 }}>
            {routine.notes || "No coaching notes yet for this routine."}
          </p>
        </div>
      </div>

      <div className="coaching-detail-meta-grid">
        <DetailItem label="Starts on" value={routine.startsOn || "Not set"} />
        <DetailItem label="Ends on" value={routine.endsOn || "Not set"} />
        <DetailItem label="Updated" value={new Date(routine.updatedAt).toLocaleString()} />
        <DetailItem label="Days" value={`${routine.days.length}`} />
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
              padding: 20,
              borderRadius: 20,
              border: "1px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
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
                  gap: 14,
                  padding: 18,
                  borderRadius: 22,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(209, 108, 67, 0.12)",
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
                  ) : (
                    <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                      No notes for this day.
                    </p>
                  )}
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
                          padding: 16,
                          borderRadius: 18,
                          background: "linear-gradient(180deg, rgba(35, 41, 36, 0.98), rgba(27, 31, 28, 0.96))",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div className="responsive-inline-header">
                          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                              Exercise {exercise.sortOrder}
                            </span>
                            <strong style={{ lineHeight: 1.35 }}>
                              {exercise.exerciseName}
                            </strong>
                          </div>
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>{exercise.exerciseSlug}</span>
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
                          <div
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "rgba(255, 255, 255, 0.025)",
                            }}
                          >
                            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                              Exercise notes
                            </span>
                            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                              {exercise.notes}
                            </p>
                          </div>
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
        background: "rgba(255, 255, 255, 0.035)",
        border: "1px solid var(--border)",
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
      ? { background: "var(--success-bg)", color: "var(--success)" }
      : status === "archived"
        ? { background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)" }
        : { background: "rgba(78, 132, 189, 0.16)", color: "#8ab9ea" };

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
        padding: 16,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--border)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

const actionLinkStyles = buttonSecondary;
