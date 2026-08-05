"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { archiveRoutine } from "@/modules/coaching/services/archive-routine";
import type { ClientRoutineStatus } from "@/modules/coaching/types";

type ArchiveRoutineButtonProps = {
  routineId: string;
  status: ClientRoutineStatus;
};

/** Archiving requires an explicit confirmation that explains its effect
 * (Entrega A0 #4) -- previously a single unconfirmed click, identical for a
 * draft or the client's live active routine. */
export function ArchiveRoutineButton({ routineId, status }: ArchiveRoutineButtonProps) {
  const { t } = useAdminText();
  const toast = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (status === "archived") {
    return null;
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await archiveRoutine(routineId);

      setIsOpen(false);

      if (!result.ok) {
        toast.error(t("coaching.routines.archiveErrorToastTitle"), {
          description: t(`coaching.routines.archiveError.${result.errorKey}`),
        });
        return;
      }

      toast.success(t("coaching.routines.archiveSuccessToast"));
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={buttonSecondary} onClick={() => setIsOpen(true)}>
        {t("coaching.routines.archive")}
      </button>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setIsOpen(open);
          }
        }}
        title={t("coaching.routines.archiveConfirmTitle")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("coaching.routines.archiveConfirmAction")}
        onConfirm={handleConfirm}
        destructive
        pending={isPending}
      >
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("coaching.routines.archiveConfirmDescription")}
        </p>
      </ConfirmDialog>
    </>
  );
}
