import { buttonGhost } from "@/lib/ui";
import { archiveRoutine } from "@/modules/coaching/services/archive-routine";
import type { ClientRoutineStatus } from "@/modules/coaching/types";

type ArchiveRoutineButtonProps = {
  routineId: string;
  returnPath: string;
  status: ClientRoutineStatus;
};

export function ArchiveRoutineButton({
  routineId,
  returnPath,
  status,
}: ArchiveRoutineButtonProps) {
  if (status === "archived") {
    return null;
  }

  return (
    <form action={archiveRoutine.bind(null, routineId, returnPath)}>
      <button type="submit" className={buttonGhost}>
        Archive routine
      </button>
    </form>
  );
}
