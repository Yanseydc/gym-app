"use client";

import { useRef, type ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { buttonDanger, buttonGhost, buttonPrimary } from "@/lib/ui";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Renders the confirm button as a destructive action (buttonDanger). */
  destructive?: boolean;
  /** Disables both buttons and blocks dismissal while a confirm is in flight. */
  pending?: boolean;
};

/** Generic confirm/cancel dialog built on the shared Dialog primitive. Takes
 * all copy as props, so it's reusable across any admin/coaching flow that
 * needs an explicit confirmation step (activation, archiving, etc.). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  onConfirm,
  destructive = false,
  pending = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      closeDisabled={pending}
      initialFocusRef={confirmRef}
    >
      <div style={{ display: "grid", gap: 18 }}>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={buttonGhost} onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? buttonDanger : buttonPrimary}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
