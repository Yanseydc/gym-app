import Link from "next/link";

import { getText } from "@/lib/i18n";
import { buttonSecondary } from "@/lib/ui";
import { duplicateExercise } from "@/modules/coaching/services/duplicate-exercise";
import type { ExerciseLibraryItem } from "@/modules/coaching/types";

type ExerciseListProps = {
  exercises: ExerciseLibraryItem[];
};

export async function ExerciseList({ exercises }: ExerciseListProps) {
  const t = await getText("exercises");
  const common = await getText("common");
  if (exercises.length === 0) {
    return (
      <article
        style={{
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        {t.noExercises}
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {exercises.map((exercise) => (
        <article
          key={exercise.id}
          style={{
            display: "grid",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 14,
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
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 320px" }}>
              <strong style={{ fontSize: 18 }}>{exercise.name}</strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <SourcePill
                  source={exercise.source}
                  systemLabel={t.systemExercise}
                  gymLabel={t.gymExercise}
                />
                <StatusPill
                  isActive={exercise.isActive}
                  activeLabel={common.active}
                  inactiveLabel={common.inactive}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {exercise.canEdit ? (
                <Link href={`/dashboard/coaching/exercises/${exercise.id}/edit`} className={buttonSecondary}>
                  {common.edit}
                </Link>
              ) : null}
              {exercise.canDuplicate ? (
                <form action={duplicateExercise.bind(null, exercise.id)}>
                  <button type="submit" className={buttonSecondary}>
                    {t.duplicateExercise}
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <div style={{ color: "var(--muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MetaChip value={exercise.primaryMuscle || t.noPrimaryMuscle} />
            <MetaChip value={exercise.equipment || t.noEquipment} />
            <MetaChip value={exercise.difficulty || t.noDifficulty} />
          </div>

          {exercise.description ? (
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5, fontSize: 14 }}>
              {exercise.description}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function SourcePill({
  source,
  systemLabel,
  gymLabel,
}: {
  source: ExerciseLibraryItem["source"];
  systemLabel: string;
  gymLabel: string;
}) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {source === "system" ? systemLabel : gymLabel}
    </span>
  );
}

function MetaChip({ value }: { value: string }) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--border)",
        fontSize: 12,
      }}
    >
      {value}
    </span>
  );
}

function StatusPill({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: isActive ? "var(--success-bg)" : "var(--neutral-badge-bg)",
        color: isActive ? "var(--success)" : "var(--neutral-badge-fg)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}
