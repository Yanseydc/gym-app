import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import type { ClientOnboarding } from "@/modules/coaching/types";

export async function ClientOnboardingCard({
  clientId,
  onboarding,
}: {
  clientId: string;
  onboarding: ClientOnboarding | null;
}) {
  const { t } = await getAdminText();
  if (!onboarding) {
    return (
      <article
        style={{
          display: "grid",
          gap: 16,
          padding: 28,
          borderRadius: 24,
          border: "1px dashed var(--border)",
          background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.88))",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>{t("coaching.onboarding.title")}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("coaching.onboarding.empty")}
          </p>
        </div>

        <div>
          <Link
            href={`/dashboard/clients/${clientId}/onboarding/new`}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 14,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {t("coaching.onboarding.create")}
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article
      style={{
        display: "grid",
        gap: 20,
        padding: 26,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.7))",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {t("coaching.onboarding.latestSnapshot")}
          </span>
          <h2 style={{ margin: "0 0 8px" }}>{t("coaching.onboarding.title")}</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {t("coaching.onboarding.latestDescription")}
          </p>
        </div>

        <Link
          href={`/dashboard/clients/${clientId}/onboarding/edit`}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          {t("coaching.onboarding.edit")}
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <DetailItem label={t("coaching.onboarding.weight")} value={`${onboarding.weightKg} kg`} />
        <DetailItem label={t("coaching.onboarding.height")} value={`${onboarding.heightCm} cm`} />
        <DetailItem label={t("coaching.onboarding.availableDays")} value={`${onboarding.availableDays} / week`} />
        <DetailItem
          label={t("coaching.onboarding.experienceLevel")}
          value={onboarding.experienceLevel[0].toUpperCase() + onboarding.experienceLevel.slice(1)}
        />
        <DetailItem label={t("coaching.onboarding.goal")} value={onboarding.goal} fullWidth />
        <DetailItem label={t("coaching.onboarding.availableSchedule")} value={onboarding.availableSchedule} fullWidth />
        <DetailItem label={t("coaching.onboarding.injuriesNotes")} value={onboarding.injuriesNotes || t("coaching.onboarding.noInjuries")} fullWidth />
        <DetailItem label={t("coaching.onboarding.notes")} value={onboarding.notes || t("common.noNotes")} fullWidth />
      </div>
    </article>
  );
}

function DetailItem({
  fullWidth = false,
  label,
  value,
}: {
  fullWidth?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(239, 229, 212, 0.55)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}
