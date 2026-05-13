"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import type { UpdatePortalAccessEmailMutationState } from "@/modules/coaching/types";

type UpdatePortalAccessEmailButtonProps = {
  action: (
    state: UpdatePortalAccessEmailMutationState,
  ) => Promise<UpdatePortalAccessEmailMutationState>;
  clientEmail: string;
  disabled?: boolean;
  portalEmail: string;
};

const initialState: UpdatePortalAccessEmailMutationState = {};

export function UpdatePortalAccessEmailButton({
  action,
  clientEmail,
  disabled = false,
  portalEmail,
}: UpdatePortalAccessEmailButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      router.refresh();
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router, state.success]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={buttonSecondary}
        onClick={() => setIsOpen(true)}
      >
        Actualizar acceso del portal
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-portal-access-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.58)",
          }}
        >
          <section
            style={{
              width: "min(460px, 100%)",
              display: "grid",
              gap: 16,
              padding: 22,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <h3 id="update-portal-access-title" style={{ margin: 0 }}>
                Actualizar acceso del portal
              </h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                Esta acción cambiará explícitamente el correo de acceso al portal y enviará un
                nuevo correo de recuperación.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: 8,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Correo actual del portal: <strong style={{ color: "inherit" }}>{portalEmail}</strong>
              </p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Nuevo correo del cliente: <strong style={{ color: "inherit" }}>{clientEmail}</strong>
              </p>
            </div>

            {state.error ? (
              <p
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--danger-bg)",
                  color: "var(--danger-fg)",
                  fontWeight: 700,
                }}
              >
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  fontWeight: 700,
                }}
              >
                {state.success}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={pending}
                className={buttonSecondary}
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </button>
              <form action={formAction}>
                <button type="submit" disabled={pending || Boolean(state.success)} className={buttonPrimary}>
                  {pending ? "Actualizando..." : "Confirmar actualización"}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
