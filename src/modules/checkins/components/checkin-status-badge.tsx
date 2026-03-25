import type { ClientMembershipAccessStatus } from "@/modules/checkins/types";

export function CheckInStatusBadge({
  status,
}: {
  status: ClientMembershipAccessStatus;
}) {
  const palette =
    status === "active"
      ? { background: "#dff4e8", color: "#1f6b42" }
      : status === "expired"
        ? { background: "#efe3d3", color: "#7a5a2f" }
        : status === "cancelled"
          ? { background: "#f8dddd", color: "#8a1c1c" }
          : { background: "#ece8e1", color: "#6b6258" };

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
