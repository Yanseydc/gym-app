import type { MembershipStatus } from "@/modules/memberships/types";

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const palette =
    status === "active"
      ? { background: "var(--success-bg)", color: "var(--success)" }
      : status === "pending_payment"
        ? { background: "var(--warning-bg)", color: "var(--warning-fg)" }
        : status === "partial"
          ? { background: "var(--warning-bg)", color: "var(--warning-fg)" }
      : status === "expired"
        ? { background: "var(--neutral-badge-bg)", color: "var(--neutral-badge-fg)" }
        : { background: "var(--danger-bg)", color: "var(--danger-fg)" };

  return (
    <span
      style={{
        display: "inline-flex",
        width: "fit-content",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        textTransform: "capitalize",
        ...palette,
      }}
    >
      {status}
    </span>
  );
}
