import type { MembershipStatus } from "@/modules/memberships/types";

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const palette =
    status === "active"
      ? { background: "#dff4e8", color: "#1f6b42" }
      : status === "pending_payment"
        ? { background: "#fff0d6", color: "#9a5a00" }
      : status === "expired"
        ? { background: "#efe3d3", color: "#7a5a2f" }
        : { background: "#f8dddd", color: "#8a1c1c" };

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
