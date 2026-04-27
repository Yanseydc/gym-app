"use client";

import { useActionState, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { buttonDanger, buttonSecondary, input } from "@/lib/ui";
import type { ClientMergeCandidate, ClientMergeMutationState } from "@/modules/clients/types";

type ClientMergePanelProps = {
  action: (
    state: ClientMergeMutationState,
    formData: FormData,
  ) => Promise<ClientMergeMutationState>;
  candidates: ClientMergeCandidate[];
};

const initialState: ClientMergeMutationState = {
  error: undefined,
  success: undefined,
};

export function ClientMergePanel({ action, candidates }: ClientMergePanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [state, formAction, pending] = useActionState(action, initialState);
  const duplicateCandidates = candidates.filter((candidate) => candidate.isEmailDuplicate);
  const showDuplicateWarning = duplicateCandidates.length > 0;
  const selectedClient = candidates.find((candidate) => candidate.id === selectedClientId) ?? null;
  const filteredCandidates = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      normalizeSearch(`${candidate.firstName} ${candidate.lastName} ${candidate.email ?? ""}`).includes(
        normalizedQuery,
      ),
    );
  }, [candidates, query]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.refresh();
      setIsOpen(false);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [router, state.success]);

  if (!showDuplicateWarning) {
    return null;
  }

  return (
    <>
      <article style={warningStyles}>
        <div>
          <strong style={{ display: "block", marginBottom: 4 }}>Posible cliente duplicado</strong>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            Encontramos otro cliente con el mismo correo en este gimnasio.
          </p>
        </div>
        <button type="button" className={buttonSecondary} onClick={() => {
          setSelectedClientId(duplicateCandidates[0]?.id ?? "");
          setIsOpen(true);
        }}>
          Fusionar
        </button>
      </article>

      {isOpen ? (
        <div role="dialog" aria-modal="true" style={overlayStyles}>
          <div style={modalStyles}>
            <div style={{ display: "grid", gap: 6 }}>
              <h2 style={{ margin: 0 }}>Fusionar clientes</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Se moverán todos los datos al cliente actual y el otro será eliminado.
              </p>
            </div>

            <form action={formAction} style={{ display: "grid", gap: 14 }}>
              <input type="hidden" name="duplicateClientId" value={selectedClientId} />
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Cliente duplicado</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar cliente"
                  className={input}
                />
              </label>

              <div style={candidateListStyles}>
                {filteredCandidates.length === 0 ? (
                  <p style={{ margin: 0, padding: 12, color: "var(--muted)" }}>
                    No se encontraron clientes.
                  </p>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedClientId(candidate.id)}
                      style={{
                        ...candidateButtonStyles,
                        background:
                          selectedClientId === candidate.id
                            ? "var(--surface-alt)"
                            : "transparent",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block" }}>
                          {candidate.firstName} {candidate.lastName}
                        </strong>
                        <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                          {candidate.email ?? "Sin correo"}
                        </span>
                      </span>
                      {candidate.isEmailDuplicate ? <span style={badgeStyles}>Duplicado</span> : null}
                    </button>
                  ))
                )}
              </div>

              {selectedClient ? (
                <section style={selectedStyles}>
                  <strong>
                    {selectedClient.firstName} {selectedClient.lastName}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>{selectedClient.email ?? "Sin correo"}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <CountChip label="Rutinas" value={selectedClient.counts.routines} />
                    <CountChip label="Pagos" value={selectedClient.counts.payments} />
                    <CountChip label="Check-ins" value={selectedClient.counts.checkins} />
                  </div>
                </section>
              ) : null}

              {state.error ? <p style={errorStyles}>{state.error}</p> : null}
              {state.success ? <p style={successStyles}>{state.success}</p> : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => setIsOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={buttonDanger}
                  disabled={pending || !selectedClientId}
                >
                  {pending ? "Fusionando..." : "Fusionar clientes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <span style={countChipStyles}>
      {label}: {value}
    </span>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const warningStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  padding: 16,
  borderRadius: 16,
  border: "1px solid var(--warning-border, var(--border))",
  background: "var(--surface)",
};

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(0, 0, 0, 0.58)",
};

const modalStyles: CSSProperties = {
  width: "min(100%, 560px)",
  maxHeight: "min(720px, calc(100vh - 36px))",
  overflow: "auto",
  display: "grid",
  gap: 18,
  padding: 20,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "0 22px 70px rgba(0, 0, 0, 0.45)",
};

const candidateListStyles: CSSProperties = {
  display: "grid",
  gap: 4,
  maxHeight: 260,
  overflowY: "auto",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 6,
};

const candidateButtonStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderRadius: 10,
  color: "var(--foreground)",
  cursor: "pointer",
  textAlign: "left",
};

const selectedStyles: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 12,
  borderRadius: 12,
  background: "var(--surface-alt)",
};

const badgeStyles: CSSProperties = {
  flex: "0 0 auto",
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 700,
};

const countChipStyles: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 700,
};

const errorStyles: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 12,
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
};

const successStyles: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 12,
  background: "var(--success-bg)",
  color: "var(--success)",
};
