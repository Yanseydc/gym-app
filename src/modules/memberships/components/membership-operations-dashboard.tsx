"use client";

import { useEffect, useMemo, useRef, useState, useActionState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, CalendarPlus, CircleDollarSign, RefreshCw } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { formatCivilDate, getTodayInAppTimeZone } from "@/lib/date-format";
import {
  buttonDanger,
  buttonSecondary,
  cardSubtle,
  formError,
  input,
  statusDanger,
  statusNeutral,
  statusSuccess,
  statusWarning,
} from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import {
  canExtendMembership,
  canRenewMembership,
} from "@/modules/memberships/lib/membership-operations-permissions";
import {
  parseMembershipListFilter,
  type MembershipListFilter,
} from "@/modules/memberships/lib/membership-list-filter";
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

type ActionType = "payment" | "renew" | "extend" | "cancel";

const initialState: MembershipOperationMutationState = {};
const PAGE_SIZE = 20;

export function MembershipOperationsDashboard({
  memberships,
}: {
  memberships: MembershipOperationItem[];
}) {
  const { locale, t } = useAdminText();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseMembershipListFilter(searchParams.get("filter"));
  const setFilter = (next: MembershipListFilter) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [action, setAction] = useState<{ type: ActionType; membership: MembershipOperationItem } | null>(null);
  const today = useMemo(() => getTodayInAppTimeZone(), []);
  const formattingLocale = locale === "es" ? "es-MX" : "en-US";
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(formattingLocale, { style: "currency", currency: "MXN" }),
    [formattingLocale],
  );
  const membershipsByClient = useMemo(() => {
    const map = new Map<string, MembershipOperationItem[]>();

    for (const membership of memberships) {
      const list = map.get(membership.clientId) ?? [];
      list.push(membership);
      map.set(membership.clientId, list);
    }

    return map;
  }, [memberships]);
  const stats = useMemo(() => ({
    expired: memberships.filter((membership) => membership.operationalStatus === "expired").length,
    expiring: memberships.filter((membership) => membership.operationalStatus === "expiring").length,
    active: memberships.filter((membership) => membership.operationalStatus === "active").length,
    future: memberships.filter((membership) => membership.operationalStatus === "future").length,
  }), [memberships]);
  const filteredMemberships = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return memberships
      .filter((membership) =>
        filter === "all" ? membership.operationalStatus !== "cancelled" : membership.operationalStatus === filter,
      )
      .filter((membership) => {
        if (!normalizedSearch) {
          return true;
        }

        return normalizeSearch(`${membership.clientName} ${membership.planName}`).includes(normalizedSearch);
      })
      .sort((first, second) => {
        const statusPriority = getUrgencyPriority(first.operationalStatus) - getUrgencyPriority(second.operationalStatus);

        if (filter === "all" && statusPriority !== 0) {
          return statusPriority;
        }

        return first.endDate.localeCompare(second.endDate);
      });
  }, [filter, memberships, search]);
  const visibleMemberships = filteredMemberships.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMemberships.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, search]);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div className="responsive-meta-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label={t("memberships.operations.stats.expired")} value={stats.expired} tone="danger" />
        <StatCard label={t("memberships.operations.stats.expiring")} value={stats.expiring} tone="warning" />
        <StatCard label={t("memberships.operations.stats.active")} value={stats.active} tone="success" />
        <StatCard label={t("memberships.operations.stats.future")} value={stats.future} tone="neutral" />
      </div>

      <div style={controlsStyles}>
        <label style={{ display: "grid", gap: 6, minWidth: 240, flex: "1 1 280px" }}>
          <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
            {t("memberships.operations.searchLabel")}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("memberships.operations.searchPlaceholder")}
            className={input}
          />
        </label>

        <div style={filterStyles}>
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            {t("memberships.operations.filters.all")}
          </FilterButton>
          <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
            {t("memberships.operations.filters.active")}
          </FilterButton>
          <FilterButton active={filter === "expired"} onClick={() => setFilter("expired")}>
            {t("memberships.operations.filters.expired")}
          </FilterButton>
          <FilterButton active={filter === "expiring"} onClick={() => setFilter("expiring")}>
            {t("memberships.operations.filters.expiring")}
          </FilterButton>
          <FilterButton active={filter === "future"} onClick={() => setFilter("future")}>
            {t("memberships.operations.filters.future")}
          </FilterButton>
        </div>
      </div>

      {filteredMemberships.length === 0 ? (
        <div style={emptyStyles}>{t("memberships.operations.empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
            {t("memberships.operations.showing", {
              visible: visibleMemberships.length,
              total: filteredMemberships.length,
            })}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {visibleMemberships.map((membership) => (
            <article
              key={membership.id}
              className={`${cardSubtle} membership-operations-card`}
              style={cardStyles}
            >
              {(() => {
                const siblings = (membershipsByClient.get(membership.clientId) ?? []).filter(
                  (sibling) => sibling.id !== membership.id,
                );
                const canPay = membership.remainingBalance > 0;
                const canRenew = canRenewMembership(membership, siblings, today);
                const canExtend = canExtendMembership(membership, today);
                const canCancel = membership.isCurrentActiveMembership;
                const isTemporallyCurrent =
                  membership.status !== "cancelled" &&
                  membership.startDate <= today &&
                  membership.endDate >= today;
                const hasFutureSibling = siblings.some(
                  (sibling) => sibling.status !== "cancelled" && sibling.startDate > today,
                );
                const renewBlockedByExistingNextPeriod = !canRenew && isTemporallyCurrent && hasFutureSibling;

                return (
                  <>
              <div style={{ minWidth: 0 }}>
                <Link href={`/dashboard/clients/${membership.clientId}`} style={{ fontWeight: 800, fontSize: 17 }}>
                  {membership.clientName}
                </Link>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {membership.planName} ·{" "}
                  {t("memberships.operations.expires", {
                    date: formatCivilDate(membership.endDate, formattingLocale),
                  })}
                </div>
              </div>

              <div className="membership-operations-card-meta">
                <StatusBadge status={membership.operationalStatus} />
                {!membership.isCurrentActiveMembership && membership.hasCurrentActiveMembership ? (
                  <span style={activeConflictStyles}>
                    {t("memberships.operations.currentMembershipConflict")}
                  </span>
                ) : null}
                <span style={balanceStyles}>
                  {t("memberships.operations.balance", {
                    amount: currencyFormatter.format(membership.remainingBalance),
                  })}
                </span>
              </div>

              <div style={actionsStyles}>
                <button type="button" className={buttonSecondary} disabled={!canPay} onClick={() => setAction({ type: "payment", membership })}>
                  <CircleDollarSign size={15} aria-hidden="true" />
                  {t("memberships.operations.actions.registerPayment")}
                </button>
                {canRenew ? (
                  <button type="button" className={buttonSecondary} onClick={() => setAction({ type: "renew", membership })}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {t("memberships.operations.actions.renew")}
                  </button>
                ) : null}
                {canExtend ? (
                  <button type="button" className={buttonSecondary} onClick={() => setAction({ type: "extend", membership })}>
                    <CalendarPlus size={15} aria-hidden="true" />
                    {t("memberships.operations.actions.extend")}
                  </button>
                ) : null}
                {canCancel ? (
                  <button type="button" className={buttonDanger} onClick={() => setAction({ type: "cancel", membership })}>
                    <Ban size={15} aria-hidden="true" />
                    {t("memberships.operations.actions.cancel")}
                  </button>
                ) : null}
                {!canRenew && membership.operationalStatus === "expired" && membership.hasCurrentActiveMembership ? (
                  <span style={helperStyles}>{t("memberships.operations.renewalBlocked")}</span>
                ) : null}
                {renewBlockedByExistingNextPeriod ? (
                  <span style={helperStyles}>{t("memberships.operations.nextPeriodExists")}</span>
                ) : null}
              </div>
                  </>
                );
              })()}
            </article>
            ))}
          </div>

          {hasMore ? (
            <button
              type="button"
              className={buttonSecondary}
              style={{ width: "fit-content" }}
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            >
              {t("memberships.operations.actions.loadMore")}
            </button>
          ) : null}
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
  const { t } = useAdminText();
  const actionFn =
    action.type === "payment"
      ? registerMembershipPayment
      : action.type === "renew"
        ? renewMembership
        : action.type === "extend"
          ? extendMembership
          : cancelMembershipFromDashboard;
  const [state, formAction, pending] = useActionState(actionFn, initialState);
  const toast = useToast();
  const router = useRouter();
  const title =
    action.type === "payment"
      ? t("memberships.operations.modal.paymentTitle")
      : action.type === "renew"
        ? t("memberships.operations.modal.renewTitle")
        : action.type === "extend"
          ? t("memberships.operations.modal.extendTitle")
          : t("memberships.operations.modal.cancelTitle");

  // Only used by action.type === "payment" (registerMembershipPayment is the
  // only one of the four actions wired for idempotency so far - renew,
  // extend and cancel are unchanged). Generated once when this modal
  // mounts, which happens on every open since the modal is conditionally
  // rendered by its parent - so "on mount" and "on open" are the same
  // event here. Reused as-is across retries within this same open (the
  // ref doesn't change between re-renders), and rotated only after a
  // success - which today is immediately followed by onClose() unmounting
  // this component anyway, so the rotation is defensive (correct even if
  // that close-on-success behavior ever changes) rather than load-bearing.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (!state.success) {
      return;
    }

    idempotencyKeyRef.current = crypto.randomUUID();
    toast.success(state.success);
    onClose();
    router.refresh();
  }, [state.success, toast, onClose, router]);

  return (
    <div role="dialog" aria-modal="true" style={overlayStyles}>
      <form action={formAction} style={modalStyles}>
        <input type="hidden" name="clientId" value={action.membership.clientId} />
        <input type="hidden" name="clientMembershipId" value={action.membership.id} />
        <input type="hidden" name="membershipId" value={action.membership.id} />
        {action.type === "payment" ? (
          <input type="hidden" name="idempotencyKey" value={idempotencyKeyRef.current} />
        ) : null}
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{title}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            {action.membership.clientName} · {action.membership.planName}
          </p>
        </div>

        {action.type === "payment" ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>{t("memberships.operations.modal.amount")}</span>
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
            <span style={{ fontWeight: 700 }}>{t("memberships.operations.modal.extensionDays")}</span>
            <input name="days" type="number" min="1" defaultValue="7" className={input} />
          </label>
        ) : null}

        {action.type === "renew" ? (
          <p style={noticeStyles}>
            {t("memberships.operations.modal.renewNotice")}
          </p>
        ) : null}

        {action.type === "cancel" ? (
          <p style={noticeStyles}>{t("memberships.operations.modal.cancelNotice")}</p>
        ) : null}

        {state.error ? <p className={formError}>{state.error}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={buttonSecondary} onClick={onClose} disabled={pending || Boolean(state.success)}>
            {t("memberships.operations.actions.close")}
          </button>
          <button
            type="submit"
            className={action.type === "cancel" ? buttonDanger : buttonSecondary}
            disabled={pending || Boolean(state.success)}
          >
            {pending
              ? t("memberships.operations.actions.processing")
              : t("memberships.operations.actions.confirm")}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "success" | "neutral" }) {
  const palette = getTonePalette(tone);

  return (
    <article style={{ ...statStyles, background: palette.background, color: palette.color }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <strong style={{ fontSize: 30 }}>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: MembershipOperationalStatus }) {
  const { t } = useAdminText();
  const tone =
    status === "expired"
      ? "danger"
      : status === "expiring"
        ? "warning"
        : status === "active"
          ? "success"
          : "neutral";
  const badgeClass = getToneClass(tone);
  return <span className={badgeClass}>{t(`memberships.operations.status.${status}`)}</span>;
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
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

function getToneClass(tone: "danger" | "warning" | "success" | "neutral") {
  if (tone === "danger") return statusDanger;
  if (tone === "warning") return statusWarning;
  if (tone === "success") return statusSuccess;
  return statusNeutral;
}

function getTonePalette(tone: "danger" | "warning" | "success" | "neutral") {
  if (tone === "danger") return { background: "var(--danger-bg)", color: "var(--danger-fg)" };
  if (tone === "warning") return { background: "var(--warning-bg)", color: "var(--warning-fg)" };
  if (tone === "success") return { background: "var(--success-bg)", color: "var(--success)" };
  return { background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)" };
}

function getUrgencyPriority(status: MembershipOperationalStatus) {
  if (status === "expired") return 0;
  if (status === "expiring") return 1;
  if (status === "active") return 2;
  if (status === "future") return 3;
  return 4;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const controlsStyles: CSSProperties = { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" };
const filterStyles: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const statStyles: CSSProperties = { display: "grid", gap: 6, padding: 16, borderRadius: 16, border: "1px solid var(--border)" };
const emptyStyles: CSSProperties = { padding: 18, borderRadius: 16, border: "1px dashed var(--border)", color: "var(--muted)" };
const cardStyles: CSSProperties = { padding: 16, borderRadius: 16 };
const actionsStyles: CSSProperties = { gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" };
const balanceStyles: CSSProperties = { padding: "5px 9px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, fontWeight: 700 };
const activeConflictStyles: CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)", fontSize: 12, fontWeight: 800 };
const helperStyles: CSSProperties = { alignSelf: "center", color: "var(--muted)", fontSize: 13, fontWeight: 600 };
const overlayStyles: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,0.58)" };
const modalStyles: CSSProperties = { width: "min(100%, 420px)", display: "grid", gap: 16, padding: 20, borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface)" };
const noticeStyles: CSSProperties = { margin: 0, color: "var(--muted)", lineHeight: 1.5 };
