"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cx } from "@/components/ui/cx";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Element focused when the dialog opens, instead of the first focusable child in DOM order. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Blocks Escape, outside click and the visible close button while true.
   * Pass the same `pending` flag used to disable the dialog's own submit button
   * (e.g. from useActionState) - there is no other supported reason to set this.
   */
  closeDisabled?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  initialFocusRef,
  closeDisabled = false,
  className,
}: DialogProps) {
  const openerRef = useRef<HTMLElement | null>(null);

  // Captured with useLayoutEffect (runs before Content's own passive effects) so
  // it reflects whatever was focused right before this dialog opened - not just
  // a Radix <Trigger>, since consumers may run custom logic (e.g. setting
  // selected-row state) in their own trigger's onClick before calling
  // onOpenChange(true).
  useLayoutEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ui-dialog-overlay" />
        <RadixDialog.Content
          className={cx("ui-dialog-content", className)}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (closeDisabled) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (closeDisabled) {
              event.preventDefault();
            }
          }}
        >
          <div className="ui-dialog-header">
            <RadixDialog.Title className="ui-dialog-title">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="ui-dialog-close"
                aria-label="Cerrar"
                disabled={closeDisabled}
              >
                <X width={18} height={18} aria-hidden="true" />
              </button>
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="ui-dialog-description">
              {description}
            </RadixDialog.Description>
          ) : null}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
