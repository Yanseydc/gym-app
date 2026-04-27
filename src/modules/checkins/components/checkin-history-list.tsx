import Link from "next/link";

import { formatDateTimeMexico } from "@/lib/date-format";
import { getAdminText } from "@/lib/i18n/admin";
import type { ClientCheckIn } from "@/modules/checkins/types";

type CheckInHistoryListProps = {
  checkIns: ClientCheckIn[];
  showClient?: boolean;
};

export async function CheckInHistoryList({
  checkIns,
  showClient = true,
}: CheckInHistoryListProps) {
  const { t } = await getAdminText();
  if (checkIns.length === 0) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          border: "1px dashed var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
          color: "var(--muted)",
        }}
      >
        {t("checkins.empty")}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {checkIns.map((checkIn) => (
        <article
          key={checkIn.id}
        style={{
          display: "grid",
          gap: 8,
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
        >
          <div className="responsive-inline-header">
            <strong>
              {showClient ? (
                <Link href={`/dashboard/clients/${checkIn.clientId}`}>{checkIn.clientName}</Link>
              ) : (
                checkIn.clientName
              )}
            </strong>
            <span style={{ color: "var(--muted)" }}>
              {formatDateTimeMexico(checkIn.checkedInAt)}
            </span>
          </div>
          {checkIn.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {checkIn.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
