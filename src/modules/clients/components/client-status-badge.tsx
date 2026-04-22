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
        background: isActive ? "var(--success-bg)" : "var(--neutral-badge-bg)",
        color: isActive ? "var(--success)" : "var(--neutral-badge-fg)",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
