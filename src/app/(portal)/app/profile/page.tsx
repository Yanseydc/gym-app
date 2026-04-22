import { getPortalText } from "@/lib/i18n/portal";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getOnboardingForPage } from "@/modules/coaching/services/onboarding-service";

export default async function PortalProfilePage() {
  const t = getPortalText();
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const { data: onboarding } = await getOnboardingForPage(linkedClient.clientId);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "grid",
          gap: 12,
          padding: 20,
          borderRadius: 26,
          background:
            "linear-gradient(180deg, rgba(34, 41, 36, 0.98), rgba(24, 30, 26, 0.94))",
          border: "1px solid var(--border)",
          boxShadow: "0 14px 28px rgba(0, 0, 0, 0.14)",
        }}
      >
        <span
          style={{
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Perfil de coaching
        </span>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>{t.profile.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.profile.description}
        </p>
      </header>

      {!onboarding ? (
        <article
          style={{
            padding: 22,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "linear-gradient(180deg, rgba(26, 31, 27, 0.98), rgba(20, 24, 21, 0.94))",
            color: "var(--muted)",
          }}
        >
          {t.profile.empty}
        </article>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <section className="portal-summary-grid">
            <MetricCard label={t.profile.labels.weight} value={`${onboarding.weightKg} kg`} />
            <MetricCard label={t.profile.labels.height} value={`${onboarding.heightCm} cm`} />
            <MetricCard
              label={t.profile.labels.availableDays}
              value={`${onboarding.availableDays} ${t.profile.perWeek}`}
            />
            <MetricCard
              label={t.profile.labels.experienceLevel}
              value={t.profile.experienceLevels[onboarding.experienceLevel]}
            />
          </section>

          <section className="portal-two-column">
            <EditorialBlock
              eyebrow="Objetivo principal"
              title={onboarding.goal}
              body={
                onboarding.notes || "Este es el foco principal registrado para tu proceso actual."
              }
            />

            <section
              style={{
                display: "grid",
                gap: 14,
                padding: 22,
                borderRadius: 22,
                background: "linear-gradient(180deg, rgba(28, 33, 29, 0.98), rgba(21, 26, 23, 0.95))",
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Disponibilidad
              </span>
              <strong style={{ fontSize: 20, lineHeight: 1.3 }}>
                {onboarding.availableSchedule}
              </strong>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                Tus horarios disponibles ayudan a adaptar la planificación del entrenamiento.
              </p>
            </section>
          </section>

          <section
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
          >
            <DetailItem
              label={t.profile.labels.injuriesNotes}
              value={onboarding.injuriesNotes || t.profile.noInjuries}
            />
            <DetailItem
              label={t.profile.labels.notes}
              value={onboarding.notes || t.profile.noNotes}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      style={{
        display: "grid",
        gap: 8,
        padding: 18,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(28, 33, 29, 0.98), rgba(21, 26, 23, 0.95))",
        border: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong style={{ fontSize: 24, lineHeight: 1.2 }}>{value}</strong>
    </article>
  );
}

function EditorialBlock({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        padding: 24,
        borderRadius: 24,
        background:
          "linear-gradient(180deg, rgba(34, 41, 36, 0.98), rgba(24, 30, 26, 0.94))",
        border: "1px solid var(--border)",
        boxShadow: "0 14px 28px rgba(0, 0, 0, 0.14)",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </span>
      <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>{title}</h2>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>{body}</p>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(28, 33, 29, 0.98), rgba(21, 26, 23, 0.95))",
        border: "1px solid var(--border)",
      }}
    >
      <span style={{ display: "block", marginBottom: 8, color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}
