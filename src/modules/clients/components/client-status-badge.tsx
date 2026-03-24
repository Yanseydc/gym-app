import type { ClientStatus } from "@/modules/clients/types";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const isActive = status === "active";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        padding: "6px 10px",
        borderRadius: 999,
        background: isActive ? "#dff4e8" : "#efe3d3",
        color: isActive ? "#1f6b42" : "#7a5a2f",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
