import Link from "next/link";

import { ExerciseForm } from "@/modules/coaching/components/exercise-form";
import { createExercise } from "@/modules/coaching/services/create-exercise";

export default function NewExercisePage() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link
          href="/dashboard/coaching/exercises"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          Back to exercise library
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create exercise</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Add a reusable exercise entry for future client routines.
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <ExerciseForm action={createExercise} submitLabel="Create exercise" />
      </section>
    </div>
  );
}
