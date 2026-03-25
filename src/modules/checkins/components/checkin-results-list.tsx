import type { CheckInClientResult } from "@/modules/checkins/types";
import { CheckInClientResultCard } from "@/modules/checkins/components/checkin-client-result-card";

export function CheckInResultsList({
  clients,
}: {
  clients: CheckInClientResult[];
}) {
  if (clients.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        No matching clients found.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {clients.map((client) => (
        <CheckInClientResultCard key={client.id} client={client} />
      ))}
    </div>
  );
}
