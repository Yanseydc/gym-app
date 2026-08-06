"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { buttonPrimary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { activateRoutine } from "@/modules/coaching/services/activate-routine";

type ActivateRoutineButtonProps = {
  routineId: string;
  routineTitle: string;
  clientName: string;
};

/** "Activar rutina" -- deliberately separate from the generic "Guardar
 * borrador" action (Entrega A0 #3). Never selectable/appliable by accident:
 * this is the only UI path that can set a routine active, and it always
 * goes through an explicit confirmation naming the client, the routine, and
 * the two real consequences (replaces the current active routine if any,
 * client sees it immediately). */
export function ActivateRoutineButton({ routineId, routineTitle, clientName }: ActivateRoutineButtonProps) {
  const { t } = useAdminText();
  const toast = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await activateRoutine(routineId);

      if (!result.ok) {
        setIsOpen(false);
        toast.error(t("coaching.routines.activateErrorToastTitle"), {
          description: t(`coaching.routines.activateError.${result.errorKey}`),
        });
        return;
      }

      setIsOpen(false);
      toast.success(
        result.archivedPrevious
          ? t("coaching.routines.activateSuccessArchivedPreviousToast")
          : t("coaching.routines.activateSuccessToast"),
      );
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={buttonPrimary} onClick={() => setIsOpen(true)}>
        {t("coaching.routines.activate")}
      </button>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setIsOpen(open);
          }
        }}
        title={t("coaching.routines.activateConfirmTitle")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("coaching.routines.activateConfirmAction")}
        onConfirm={handleConfirm}
        pending={isPending}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0 }}>
            {t("coaching.routines.activateConfirmClient")}: <strong>{clientName}</strong>
            <br />
            {t("coaching.routines.activateConfirmRoutine")}: <strong>{routineTitle}</strong>
          </p>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.activateConfirmReplaces")}</p>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.activateConfirmVisible")}</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
