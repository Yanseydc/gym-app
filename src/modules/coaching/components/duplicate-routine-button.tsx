import { buttonSecondary } from "@/lib/ui";
import { duplicateRoutine } from "@/modules/coaching/services/duplicate-routine";

type DuplicateRoutineButtonProps = {
  routineId: string;
  returnPath: string;
};

export function DuplicateRoutineButton({
  routineId,
  returnPath,
}: DuplicateRoutineButtonProps) {
  return (
    <form action={duplicateRoutine.bind(null, routineId, returnPath)}>
      <button type="submit" className={buttonSecondary}>
        Duplicate routine
      </button>
    </form>
  );
}
