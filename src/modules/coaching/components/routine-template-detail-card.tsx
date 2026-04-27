import { getText } from "@/lib/i18n";
import type { RoutineTemplate } from "@/modules/coaching/types";
import { formatRestTime } from "@/modules/coaching/utils/rest-time";

export async function RoutineTemplateDetailCard({ template }: { template: RoutineTemplate }) {
  const t = await getText("coaching");
  const common = await getText("common");
  const days = Array.isArray(template.days) ? template.days : [];
  const totalExercises = days.reduce(
    (count, day) => count + (Array.isArray(day.exercises) ? day.exercises.length : 0),
    0,
  );
  const isIncomplete = !template.title || !Array.isArray(template.days);

  return (
    <article
      style={{
        display: "grid",
        gap: 22,
        padding: 28,
        borderRadius: 28,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(25, 30, 26, 0.98), rgba(20, 24, 21, 0.96))",
        boxShadow: "0 18px 38px rgba(0, 0, 0, 0.16)",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {t.templates.detailTitle}
        </span>
        <h1 style={{ margin: 0 }}>{template.title || t.templates.untitledTemplate}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.templates.detailDescription}
        </p>
      </div>

      {isIncomplete ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(209, 108, 67, 0.1)",
            color: "var(--accent-strong)",
            border: "1px solid rgba(209, 108, 67, 0.18)",
          }}
        >
          {t.templates.incompleteNotice}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label={t.templates.days} value={String(days.length)} />
        <DetailItem label={t.templates.exercises} value={String(totalExercises)} />
        <DetailItem label={t.templates.updated} value={new Date(template.updatedAt).toLocaleString()} />
        <DetailItem label={t.templates.notes} value={template.notes || t.templates.noNotes} fullWidth />
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>{t.templates.templateDays}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {t.templates.templateDaysDescription}
          </p>
        </div>

        {days.length === 0 ? (
          <article
            style={{
              padding: 24,
              borderRadius: 20,
              border: "1px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--muted)",
            }}
          >
            {t.templates.noDays}
          </article>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {days.map((day) => {
              const exercises = Array.isArray(day.exercises) ? day.exercises : [];

              return (
                <article
                  key={day.id}
                  style={{
                    display: "grid",
                    gap: 16,
                    padding: 22,
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
                      {t("templates.dayLabel", { index: day.dayIndex })}
                    </span>
                    <strong style={{ display: "block", fontSize: 20, marginTop: 10 }}>
                      {day.title || t.templates.untitledDay}
                    </strong>
                    {day.notes ? (
                      <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                        {day.notes}
                      </p>
                    ) : null}
                  </div>

                  {exercises.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted)" }}>{t.templates.noExercises}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          style={{
                            display: "grid",
                            gap: 12,
                            padding: 18,
                            borderRadius: 18,
                            background: "linear-gradient(180deg, rgba(35, 41, 36, 0.98), rgba(27, 31, 28, 0.96))",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <strong>{exercise.exerciseName}</strong>
                          <div
                            style={{
                              display: "grid",
                              gap: 10,
                              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            }}
                          >
                            <DetailChip label={t.templates.sets} value={exercise.setsText} />
                            <DetailChip label={t.templates.reps} value={exercise.repsText} />
                            <DetailChip
                              label={t.templates.weight}
                              value={exercise.targetWeightText || common.notAvailable}
                            />
                            <DetailChip
                              label={t.templates.rest}
                              value={formatRestTime(exercise.restSeconds, common.notAvailable)}
                            />
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
              );
            })}
          </div>
        )}
      </section>
    </article>
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
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--border)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
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
