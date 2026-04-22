import type { RoutineTemplate } from "@/modules/coaching/types";

export function RoutineTemplateDetailCard({ template }: { template: RoutineTemplate }) {
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
          Routine template
        </span>
        <h1 style={{ margin: 0 }}>{template.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Reusable structure to create new client routines as drafts.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label="Days" value={String(template.days.length)} />
        <DetailItem
          label="Exercises"
          value={String(template.days.reduce((count, day) => count + day.exercises.length, 0))}
        />
        <DetailItem label="Updated" value={new Date(template.updatedAt).toLocaleString()} />
        <DetailItem label="Notes" value={template.notes || "No notes"} fullWidth />
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Template days</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Preview the structure that will be copied into a new draft routine.
          </p>
        </div>

        {template.days.length === 0 ? (
          <article
            style={{
              padding: 24,
              borderRadius: 20,
              border: "1px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--muted)",
            }}
          >
            This template does not contain any days yet.
          </article>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {template.days.map((day) => (
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
