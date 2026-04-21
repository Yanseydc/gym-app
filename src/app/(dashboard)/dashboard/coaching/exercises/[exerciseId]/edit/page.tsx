import Link from "next/link";
import { notFound } from "next/navigation";

import { ExerciseForm } from "@/modules/coaching/components/exercise-form";
import { getExerciseForPage } from "@/modules/coaching/services/exercise-service";
import { updateExercise } from "@/modules/coaching/services/update-exercise";
import type { ExerciseFormValues } from "@/modules/coaching/types";

type EditExercisePageProps = {
  params: Promise<{
    exerciseId: string;
  }>;
};

export default async function EditExercisePage({ params }: EditExercisePageProps) {
  const { exerciseId } = await params;
  const { data: exercise, error } = await getExerciseForPage(exerciseId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link
          href="/dashboard/coaching/exercises"
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          Back to exercise library
        </Link>
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
      </div>
    );
  }

  if (!exercise) {
    notFound();
  }

  const defaultValues: ExerciseFormValues = {
    name: exercise.name,
    slug: exercise.slug,
    description: exercise.description ?? "",
    videoUrl: exercise.videoUrl ?? "",
    thumbnailUrl: exercise.thumbnailUrl ?? "",
    primaryMuscle: exercise.primaryMuscle ?? "",
    secondaryMuscle: exercise.secondaryMuscle ?? "",
    equipment: exercise.equipment ?? "",
    difficulty: exercise.difficulty ?? "",
    instructions: exercise.instructions ?? "",
    coachTips: exercise.coachTips ?? "",
    commonMistakes: exercise.commonMistakes ?? "",
    isActive: exercise.isActive,
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href="/dashboard/coaching/exercises"
        style={{ color: "var(--muted)", fontWeight: 600 }}
      >
        Back to exercise library
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Edit exercise</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Update exercise metadata and coaching reference content.
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
        <ExerciseForm
          action={updateExercise.bind(null, exercise.id)}
          defaultValues={defaultValues}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
