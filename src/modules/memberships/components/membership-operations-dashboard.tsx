"use client";

import { useMemo, useState, useActionState, type CSSProperties } from "react";
import Link from "next/link";

import { buttonDanger, buttonSecondary, input } from "@/lib/ui";
import {
  cancelMembershipFromDashboard,
  extendMembership,
  registerMembershipPayment,
  renewMembership,
} from "@/modules/memberships/services/membership-operations";
import type {
  MembershipOperationItem,
  MembershipOperationalStatus,
  MembershipOperationMutationState,
} from "@/modules/memberships/types";

type Filter = "all" | "active" | "expired" | "expiring";
type ActionType = "payment" | "renew" | "extend" | "cancel";

const initialState: MembershipOperationMutationState = {};

export function MembershipOperationsDashboard({
  memberships,
}: {
  memberships: MembershipOperationItem[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [action, setAction] = useState<{ type: ActionType; membership: MembershipOperationItem } | null>(null);
  const stats = useMemo(() => ({
    expired: memberships.filter((membership) => membership.operationalStatus === "expired").length,
    expiring: memberships.filter((membership) => membership.operationalStatus === "expiring").length,
    active: memberships.filter((membership) => membership.operationalStatus === "active").length,
  }), [memberships]);
  const visibleMemberships = memberships.filter((membership) =>
    filter === "all" ? membership.operationalStatus !== "cancelled" : membership.operationalStatus === filter,
  );

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="responsive-meta-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Vencidas" value={stats.expired} tone="danger" />
        <StatCard label="Por vencer" value={stats.expiring} tone="warning" />
        <StatCard label="Activas" value={stats.active} tone="success" />
      </div>

      <div style={filterStyles}>
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterButton>
        <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>Activas</FilterButton>
        <FilterButton active={filter === "expired"} onClick={() => setFilter("expired")}>Vencidas</FilterButton>
        <FilterButton active={filter === "expiring"} onClick={() => setFilter("expiring")}>Por vencer</FilterButton>
      </div>

      {visibleMemberships.length === 0 ? (
        <div style={emptyStyles}>No hay membresías para este filtro.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {visibleMemberships.map((membership) => (
            <article key={membership.id} style={cardStyles}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/dashboard/clients/${membership.clientId}`} style={{ fontWeight: 800, fontSize: 17 }}>
                  {membership.clientName}
                </Link>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {membership.planName} · vence {membership.endDate}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                <StatusBadge status={membership.operationalStatus} />
                <span style={balanceStyles}>Saldo: ${membership.remainingBalance.toFixed(2)}</span>
              </div>

              <div style={actionsStyles}>
                <button type="button" className={buttonSecondary} onClick={() => setAction({ type: "payment", membership })}>
                  Registrar pago
                </button>
                <button type="button" className={buttonSecondary} onClick={() => setAction({ type: "renew", membership })}>
                  Renovar
                </button>
                <button type="button" className={buttonSecondary} onClick={() => setAction({ type: "extend", membership })}>
                  Extender
                </button>
                <button type="button" className={buttonDanger} onClick={() => setAction({ type: "cancel", membership })}>
                  Cancelar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {action ? <MembershipActionModal action={action} onClose={() => setAction(null)} /> : null}
    </section>
  );
}

function MembershipActionModal({
  action,
  onClose,
}: {
  action: { type: ActionType; membership: MembershipOperationItem };
  onClose: () => void;
}) {
  const actionFn =
    action.type === "payment"
      ? registerMembershipPayment
      : action.type === "renew"
        ? renewMembership
        : action.type === "extend"
          ? extendMembership
          : cancelMembershipFromDashboard;
  const [state, formAction, pending] = useActionState(actionFn, initialState);
  const title =
    action.type === "payment"
      ? "Registrar pago"
      : action.type === "renew"
        ? "Renovar membresía"
        : action.type === "extend"
          ? "Extender membresía"
          : "Cancelar membresía";

  return (
    <div role="dialog" aria-modal="true" style={overlayStyles}>
      <form action={formAction} style={modalStyles}>
        <input type="hidden" name="clientId" value={action.membership.clientId} />
        <input type="hidden" name="clientMembershipId" value={action.membership.id} />
        <input type="hidden" name="membershipId" value={action.membership.id} />
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{title}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            {action.membership.clientName} · {action.membership.planName}
          </p>
        </div>

        {action.type === "payment" ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Monto</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={action.membership.remainingBalance > 0 ? action.membership.remainingBalance.toFixed(2) : ""}
              className={input}
            />
          </label>
        ) : null}

        {action.type === "extend" ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Días a extender</span>
            <input name="days" type="number" min="1" defaultValue="7" className={input} />
          </label>
        ) : null}

        {action.type === "renew" ? (
          <p style={noticeStyles}>Se creará una nueva membresía con el mismo plan.</p>
        ) : null}

        {action.type === "cancel" ? (
          <p style={noticeStyles}>La membresía quedará cancelada y no contará como activa.</p>
        ) : null}

        {state.error ? <p style={errorStyles}>{state.error}</p> : null}
        {state.success ? <p style={successStyles}>{state.success}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={buttonSecondary} onClick={onClose} disabled={pending}>
            Cerrar
          </button>
          <button type="submit" className={action.type === "cancel" ? buttonDanger : buttonSecondary} disabled={pending}>
            {pending ? "Procesando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "success" }) {
  const palette = getTonePalette(tone);

  return (
    <article style={{ ...statStyles, background: palette.background, color: palette.color }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <strong style={{ fontSize: 30 }}>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: MembershipOperationalStatus }) {
  const tone = status === "expired" ? "danger" : status === "expiring" ? "warning" : status === "active" ? "success" : "neutral";
  const palette = getTonePalette(tone);
  const label = status === "expired" ? "Vencida" : status === "expiring" ? "Por vencer" : status === "active" ? "Activa" : "Cancelada";

  return <span style={{ ...badgeStyles, background: palette.background, color: palette.color }}>{label}</span>;
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid var(--border)",
      background: active ? "var(--surface-alt)" : "transparent",
      color: active ? "var(--foreground)" : "var(--muted)",
      fontWeight: 700,
      cursor: "pointer",
    }}>
      {children}
    </button>
  );
}

function getTonePalette(tone: "danger" | "warning" | "success" | "neutral") {
  if (tone === "danger") return { background: "var(--danger-bg)", color: "var(--danger-fg)" };
  if (tone === "warning") return { background: "var(--warning-bg)", color: "var(--warning-fg)" };
  if (tone === "success") return { background: "var(--success-bg)", color: "var(--success)" };
  return { background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)" };
}

const filterStyles: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const statStyles: CSSProperties = { display: "grid", gap: 6, padding: 16, borderRadius: 16, border: "1px solid var(--border)" };
const emptyStyles: CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed var(--border)", color: "var(--muted)" };
const cardStyles: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, padding: 16, borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)" };
const actionsStyles: CSSProperties = { gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" };
const badgeStyles: CSSProperties = { padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 800 };
const balanceStyles: CSSProperties = { padding: "5px 9px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, fontWeight: 700 };
const overlayStyles: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,0.58)" };
const modalStyles: CSSProperties = { width: "min(100%, 420px)", display: "grid", gap: 16, padding: 20, borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface)" };
const noticeStyles: CSSProperties = { margin: 0, color: "var(--muted)", lineHeight: 1.5 };
const errorStyles: CSSProperties = { margin: 0, padding: 10, borderRadius: 12, background: "var(--danger-bg)", color: "var(--danger-fg)" };
const successStyles: CSSProperties = { margin: 0, padding: 10, borderRadius: 12, background: "var(--success-bg)", color: "var(--success)" };
