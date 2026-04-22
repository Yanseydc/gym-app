import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import type { ProgressCheckInSummary } from "@/modules/coaching/types";

export async function ProgressCheckInSection({
  checkIns,
  clientId,
}: {
  checkIns: ProgressCheckInSummary[];
  clientId: string;
}) {
  const { t } = await getAdminText();
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="responsive-inline-header">
        <div>
          <h2 style={{ margin: "0 0 8px" }}>{t("coaching.progress.title")}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {t("coaching.progress.description")}
          </p>
        </div>

        <Link href={`/dashboard/clients/${clientId}/progress-checkins/new`} className={buttonSecondary}>
          {t("coaching.progress.newCheckin")}
        </Link>
      </div>

      {checkIns.length === 0 ? (
        <article
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            borderRadius: 18,
            border: "1px dashed var(--border)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {t("coaching.progress.empty")}
          </p>
          <div>
            <Link href={`/dashboard/clients/${clientId}/progress-checkins/new`} className={buttonPrimary}>
              {t("coaching.progress.createFirst")}
            </Link>
          </div>
        </article>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {checkIns.map((checkIn) => (
            <article
              key={checkIn.id}
              style={{
                display: "grid",
                gap: 12,
                padding: 16,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <div className="responsive-inline-header">
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {t("coaching.progress.checkin")}
                  </span>
                  <strong style={{ fontSize: 18 }}>{checkIn.checkinDate}</strong>
                </div>
                <Link
                  href={`/dashboard/clients/${clientId}/progress-checkins/${checkIn.id}/edit`}
                  className={buttonSecondary}
                >
                  {t("coaching.progress.edit")}
                </Link>
              </div>

              <div className="responsive-meta-grid">
                <MetaPill label={t("coaching.progress.weight")} value={checkIn.weightKg ? `${checkIn.weightKg} kg` : t("common.notAvailable")} />
                <MetaPill
                  label={t("coaching.progress.photos")}
                  value={checkIn.photoTypes.length > 0 ? checkIn.photoTypes.join(", ") : t("coaching.progress.none")}
                />
              </div>

              {checkIn.clientNotes ? (
                <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                  {t("coaching.progress.client")}: {checkIn.clientNotes}
                </p>
              ) : null}
              {checkIn.coachNotes ? (
                <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                  {t("coaching.progress.coach")}: {checkIn.coachNotes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.04)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
