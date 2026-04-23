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
  const formatPhotoCount = (count: number) =>
    t(count === 1 ? "coaching.progress.photoCountOne" : "coaching.progress.photoCountOther", { count });

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="responsive-inline-header">
        <h2 style={{ margin: 0 }}>{t("coaching.progress.title")}</h2>

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
                position: "relative",
                display: "grid",
                gap: 12,
                padding: 16,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.03)",
                overflow: "hidden",
              }}
            >
              <Link
                href={`/dashboard/clients/${clientId}/progress-checkins/${checkIn.id}/edit`}
                aria-label={`${t("coaching.progress.checkin")} ${checkIn.checkinDate}`}
                style={{ position: "absolute", inset: 0, zIndex: 1 }}
              />
              <div className="responsive-inline-header">
                <div style={{ display: "grid", gap: 4, position: "relative", zIndex: 2 }}>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {t("coaching.progress.checkin")}
                  </span>
                  <strong style={{ fontSize: 18 }}>{checkIn.checkinDate}</strong>
                </div>
                <Link
                  href={`/dashboard/clients/${clientId}/progress-checkins/${checkIn.id}/edit`}
                  className={buttonSecondary}
                  style={{ position: "relative", zIndex: 2 }}
                >
                  {t("coaching.progress.edit")}
                </Link>
              </div>

              <div className="responsive-meta-grid" style={{ position: "relative", zIndex: 2 }}>
                <MetaPill label={t("coaching.progress.weight")} value={checkIn.weightKg ? `${checkIn.weightKg} kg` : t("common.notAvailable")} />
                <MetaPill
                  label={t("coaching.progress.photos")}
                  value={checkIn.photoTypes.length > 0 ? formatPhotoCount(checkIn.photoTypes.length) : t("coaching.progress.none")}
                />
              </div>
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
