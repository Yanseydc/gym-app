import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { getText } from "@/lib/i18n";
import { ExerciseForm } from "@/modules/coaching/components/exercise-form";
import { ExerciseGalleryManager } from "@/modules/coaching/components/exercise-gallery-manager";
import { createExerciseMedia } from "@/modules/coaching/services/create-exercise-media";
import { deleteExerciseMedia } from "@/modules/coaching/services/delete-exercise-media";
import { getExerciseMediaForPage } from "@/modules/coaching/services/exercise-media-service";
import { getExerciseForPage } from "@/modules/coaching/services/exercise-service";
import { updateExerciseMedia } from "@/modules/coaching/services/update-exercise-media";
import { updateExercise } from "@/modules/coaching/services/update-exercise";
import type { ExerciseFormValues } from "@/modules/coaching/types";

type EditExercisePageProps = {
  params: Promise<{
    exerciseId: string;
  }>;
};

export default async function EditExercisePage({ params }: EditExercisePageProps) {
  const { t: adminT } = await getAdminText();
  const t = await getText("exercises");
  const common = await getText("common");
  const { exerciseId } = await params;
  const [{ data: exercise, error }, { data: galleryItems, error: galleryError }] = await Promise.all([
    getExerciseForPage(exerciseId),
    getExerciseMediaForPage(exerciseId),
  ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href="/dashboard/coaching/exercises" label={t.backToExerciseLibrary} />
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

  if (!exercise.canEdit) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href="/dashboard/coaching/exercises" label={t.backToExerciseLibrary} />
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--warning-bg)",
            color: "var(--warning-fg)",
          }}
        >
          This system exercise cannot be edited directly. Use it as a base to create a custom exercise for your gym.
        </p>
      </div>
    );
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
      <BackNavigation
        href="/dashboard/coaching/exercises"
        label={t.backToExerciseLibrary}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: adminT("nav.coaching") },
          { href: "/dashboard/coaching/exercises", label: t.title },
          { label: exercise.name },
        ]}
      />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.editExercise}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.editDescription}
        </p>
      </header>

      <section
        className="premium-panel feature-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        <ExerciseForm
          action={updateExercise.bind(null, exercise.id)}
          defaultValues={defaultValues}
          submitLabel={common.saveChanges}
        />
      </section>

      <section
        className="premium-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        {galleryError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--danger-bg)",
              color: "var(--danger-fg)",
            }}
          >
            {galleryError}
          </p>
        ) : (
          <ExerciseGalleryManager
            items={galleryItems}
            createAction={createExerciseMedia.bind(null, exercise.id)}
            updateAction={updateExerciseMedia.bind(null, exercise.id)}
            deleteAction={deleteExerciseMedia.bind(null, exercise.id)}
          />
        )}
      </section>
    </div>
  );
}
