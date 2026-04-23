import Link from "next/link";
import type { ReactNode } from "react";

import { getAdminText } from "@/lib/i18n/admin";
import { buttonSecondary } from "@/lib/ui";
import { ArchiveRoutineButton } from "@/modules/coaching/components/archive-routine-button";
import { DuplicateRoutineButton } from "@/modules/coaching/components/duplicate-routine-button";
import { SaveRoutineTemplateLink } from "@/modules/coaching/components/save-routine-template-link";
import type { ClientRoutine, ClientRoutineSummary } from "@/modules/coaching/types";

export async function RoutineSummaryList({
  clientId,
  routines,
}: {
  clientId: string;
  routines: ClientRoutineSummary[];
}) {
  const { t } = await getAdminText();
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
        {t("coaching.routines.empty")}
      </article>
    );
  }

  const activeRoutine = routines.find((routine) => routine.status === "active") ?? null;
  const archivedRoutines = routines.filter((routine) => routine.id !== activeRoutine?.id);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {activeRoutine ? (
        <article
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            borderRadius: 22,
            border: "1px solid rgba(127, 210, 160, 0.4)",
            background: "linear-gradient(180deg, rgba(39, 53, 45, 0.96), rgba(24, 30, 27, 0.98))",
            boxShadow: "0 18px 36px rgba(0, 0, 0, 0.18)",
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
              background: "linear-gradient(180deg, #3b9f68, #7fd2a0)",
            }}
          />
          <div className="responsive-inline-header" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <StatusPill status="active" label={t("coaching.routines.activeBadge")} />
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {formatRoutineDuration(t, activeRoutine)}
                </span>
              </div>
              <strong style={{ display: "block", fontSize: 22, lineHeight: 1.15 }}>
                {activeRoutine.title}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Link href={`/dashboard/coaching/routines/${activeRoutine.id}`} className={actionLinkStyles}>
              {t("coaching.routines.view")}
            </Link>
            <Link href={`/dashboard/coaching/routines/${activeRoutine.id}/edit`} className={actionLinkStyles}>
              {t("common.edit")}
            </Link>
            <RoutineActionsMenu
              label={t("coaching.routines.secondaryActions")}
              content={
                <>
                  <DuplicateRoutineButton
                    routineId={activeRoutine.id}
                    returnPath={`/dashboard/clients/${clientId}`}
                  />
                  <SaveRoutineTemplateLink
                    routineId={activeRoutine.id}
                    returnPath={`/dashboard/clients/${clientId}`}
                  />
                  <ArchiveRoutineButton
                    routineId={activeRoutine.id}
                    returnPath={`/dashboard/clients/${clientId}?tab=coaching`}
                    status={activeRoutine.status}
                  />
                </>
              }
            />
          </div>
        </article>
      ) : (
        <article
          style={{
            display: "grid",
            gap: 8,
            padding: 18,
            borderRadius: 18,
            border: "1px dashed var(--border)",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <strong>{t("coaching.routines.noActive")}</strong>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.noActiveDescription")}</p>
        </article>
      )}

      <section style={{ display: "grid", gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 15 }}>{t("clients.detail.previousRoutines")}</h4>
        {archivedRoutines.length === 0 ? (
          <article
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--muted)",
            }}
          >
            {t("coaching.routines.previousEmpty")}
          </article>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {archivedRoutines.map((routine) => (
              <article
                key={routine.id}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 14,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <div className="responsive-inline-header">
                  <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                    <strong style={{ display: "block", fontSize: 17, lineHeight: 1.2 }}>{routine.title}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>
                      {formatRoutineDuration(t, routine)}
                    </span>
                  </div>
                  <StatusPill status={routine.status} label={t(`common.status.${routine.status}`)} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Link href={`/dashboard/coaching/routines/${routine.id}`} className={actionLinkStyles}>
                    {t("coaching.routines.view")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatRoutineDuration(
  t: Awaited<ReturnType<typeof getAdminText>>["t"],
  routine: ClientRoutineSummary,
) {
  const days = t(
    routine.dayCount === 1 ? "coaching.routines.dayCountOne" : "coaching.routines.dayCountOther",
    { count: routine.dayCount },
  );

  const range =
    routine.startsOn && routine.endsOn
      ? t("common.dateRange", { start: routine.startsOn, end: routine.endsOn })
      : routine.startsOn
        ? t("coaching.routines.starts", { date: routine.startsOn })
        : routine.endsOn
          ? t("coaching.routines.ends", { date: routine.endsOn })
          : "";

  if (!range) {
    return days || t("coaching.routines.durationUnknown");
  }

  return t("coaching.routines.durationWithRange", { days, range });
}

function RoutineActionsMenu({
  label,
  content,
}: {
  label: string;
  content: ReactNode;
}) {
  return (
    <details style={{ position: "relative" }}>
      <summary
        className={actionLinkStyles}
        style={{ listStyle: "none", cursor: "pointer", minWidth: 44, justifyContent: "center" }}
        aria-label={label}
      >
        ⋯
      </summary>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          minWidth: 220,
          display: "grid",
          gap: 8,
          padding: 10,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "rgba(17, 22, 19, 0.98)",
          boxShadow: "0 18px 30px rgba(0, 0, 0, 0.22)",
          zIndex: 10,
        }}
      >
        {content}
      </div>
    </details>
  );
}

export async function RoutineDetailCard({ routine, showEditLink = false }: {
  routine: ClientRoutine;
  showEditLink?: boolean;
}) {
  const { t, locale } = await getAdminText();
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
              {t("coaching.routines.overview")}
            </span>
            <div style={{ display: "grid", gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 3vw, 2.35rem)", lineHeight: 1.05 }}>
                {routine.title}
              </h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <StatusPill status={routine.status} label={t(`common.status.${routine.status}`)} />
                <span style={{ color: "var(--muted)" }}>{routine.clientName}</span>
              </div>
            </div>
          </div>

          <div className="responsive-actions-wrap" style={{ alignItems: "stretch" }}>
          {showEditLink ? (
            <Link href={`/dashboard/coaching/routines/${routine.id}/edit`} className={actionLinkStyles}>
              {t("coaching.routines.edit")}
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
            {t("coaching.routines.planningNotes")}
          </span>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.65 }}>
            {routine.notes || t("coaching.routines.planningNotesEmpty")}
          </p>
        </div>
      </div>

      <div className="coaching-detail-meta-grid">
        <DetailItem label={t("coaching.routines.startsOn")} value={routine.startsOn || t("common.notAvailable")} />
        <DetailItem label={t("coaching.routines.endsOn")} value={routine.endsOn || t("common.notAvailable")} />
        <DetailItem label={t("coaching.routines.updated")} value={new Date(routine.updatedAt).toLocaleString(locale)} />
        <DetailItem label={t("coaching.routines.daysLabel")} value={`${routine.days.length}`} />
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>{t("coaching.routines.routineDays")}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {t("coaching.routines.routineDaysDescription")}
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
            {t("coaching.routines.noDays")}
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
                    {t("coaching.routines.day", { index: day.dayIndex })}
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
                      {t("coaching.routines.noDayNotes")}
                    </p>
                  )}
                </div>

                {day.exercises.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.noExercises")}</p>
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
                              {t("coaching.routines.exercise", { index: exercise.sortOrder })}
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
                          <DetailChip label={t("coaching.routines.sets")} value={exercise.setsText} />
                          <DetailChip label={t("coaching.routines.reps")} value={exercise.repsText} />
                          <DetailChip label={t("coaching.routines.weight")} value={exercise.targetWeightText || t("common.notAvailable")} />
                          <DetailChip label={t("coaching.routines.rest")} value={`${exercise.restSeconds ?? t("common.notAvailable")} sec`} />
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
                              {t("coaching.routines.exerciseNotes")}
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

function StatusPill({ label, status }: { label: string; status: ClientRoutineSummary["status"] }) {
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
      {label}
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
