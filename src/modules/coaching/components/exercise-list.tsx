import Link from "next/link";

import type { ExerciseLibraryItem } from "@/modules/coaching/types";

type ExerciseListProps = {
  exercises: ExerciseLibraryItem[];
};

export function ExerciseList({ exercises }: ExerciseListProps) {
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
        No exercises found.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {exercises.map((exercise) => (
        <article
          key={exercise.id}
          style={{
            display: "grid",
            gap: 12,
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
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 18 }}>{exercise.name}</strong>
              <span style={{ color: "var(--muted)" }}>{exercise.slug}</span>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <StatusPill isActive={exercise.isActive} />
              <Link
                href={`/dashboard/coaching/exercises/${exercise.id}/edit`}
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
          </div>

          <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{exercise.primaryMuscle || "No primary muscle"}</span>
            <span>{exercise.equipment || "No equipment"}</span>
            <span>{exercise.difficulty || "No difficulty"}</span>
          </div>

          {exercise.description ? (
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              {exercise.description}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: isActive ? "#dff4e8" : "#efe3d3",
        color: isActive ? "#1f6b42" : "#7a5a2f",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
