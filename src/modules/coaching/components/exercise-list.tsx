import { getText } from "@/lib/i18n";
import { ExerciseListClient } from "@/modules/coaching/components/exercise-list-client";
import type { ExerciseLibraryItem } from "@/modules/coaching/types";

type ExerciseListProps = {
  exercises: ExerciseLibraryItem[];
};

export async function ExerciseList({ exercises }: ExerciseListProps) {
  const t = await getText("exercises");
  const common = await getText("common");

  return (
    <ExerciseListClient
      exercises={exercises}
      text={{
        noExercises: t.noExercises,
        systemExercise: t.systemExercise,
        gymExercise: t.gymExercise,
        duplicateExercise: t.duplicateExercise,
        allExercises: t.allExercises,
        systemExercises: t.systemExercises,
        customExercises: t.customExercises,
        duplicateDialogTitle: t.duplicateDialogTitle,
        duplicateDialogMessage: t.duplicateDialogMessage,
        createCopy: t.createCopy,
        deactivateExercise: t.deactivateExercise,
        deactivateDialogTitle: t.deactivateDialogTitle,
        deactivateDialogMessage: t.deactivateDialogMessage,
        cancel: common.cancel,
        edit: common.edit,
        active: common.active,
        inactive: common.inactive,
        noPrimaryMuscle: t.noPrimaryMuscle,
        noEquipment: t.noEquipment,
        noDifficulty: t.noDifficulty,
      }}
    />
  );
}
