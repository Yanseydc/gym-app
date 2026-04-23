import Link from "next/link";

import { getText } from "@/lib/i18n";
import { buttonSecondary } from "@/lib/ui";
import { ExerciseForm } from "@/modules/coaching/components/exercise-form";
import { createExercise } from "@/modules/coaching/services/create-exercise";

export default async function NewExercisePage() {
  const t = await getText("exercises");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link
          href="/dashboard/coaching/exercises"
          className={buttonSecondary}
          style={{ width: "fit-content" }}
        >
          {t.backToExerciseLibrary}
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.createExercise}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.createDescription}
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
        <ExerciseForm action={createExercise} submitLabel={t.createExercise} />
      </section>
    </div>
  );
}
