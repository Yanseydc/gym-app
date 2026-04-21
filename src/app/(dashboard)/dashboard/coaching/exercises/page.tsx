import Link from "next/link";

import { ExerciseList } from "@/modules/coaching/components/exercise-list";
import { getExercisesForPage } from "@/modules/coaching/services/exercise-service";

export default async function ExercisesPage() {
  const { data: exercises, error } = await getExercisesForPage();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Exercise library</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Manage reusable exercise references for coaching routines.
          </p>
        </div>

        <Link
          href="/dashboard/coaching/exercises/new"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          New exercise
        </Link>
      </header>

      {error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      ) : null}

      <ExerciseList exercises={exercises} />
    </div>
  );
}
