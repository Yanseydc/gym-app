"use client";

import { buttonGhost } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
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
  const { t } = useAdminText();
  if (status === "archived") {
    return null;
  }

  return (
    <form action={archiveRoutine.bind(null, routineId, returnPath)}>
      <button type="submit" className={buttonGhost}>
        {t("coaching.routines.archive")}
      </button>
    </form>
  );
}
