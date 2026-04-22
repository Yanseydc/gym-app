import { getPortalText } from "@/lib/i18n/portal";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getProgressCheckInsForPage, getProgressCheckInForPage } from "@/modules/coaching/services/progress-checkin-service";

export default async function PortalProgressPage() {
  const t = getPortalText();
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const { data: progressCheckIns } = await getProgressCheckInsForPage(linkedClient.clientId);
  const detailedCheckIns = await Promise.all(
    progressCheckIns.map((checkIn) => getProgressCheckInForPage(checkIn.id)),
  );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "grid",
          gap: 10,
          padding: 22,
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(239, 229, 212, 0.42), rgba(255, 255, 255, 0.94))",
          border: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1 style={{ margin: 0 }}>{t.progress.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.progress.description}
        </p>
      </header>

      {detailedCheckIns.length === 0 ? (
        <article
          style={{
            padding: 28,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.88))",
            color: "var(--muted)",
          }}
        >
          {t.progress.empty}
        </article>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {detailedCheckIns.flatMap((result) =>
            result.data
              ? [
                  <article
                    key={result.data.id}
                    style={{
                      display: "grid",
                      gap: 18,
                      padding: 22,
                      borderRadius: 22,
                      border: "1px solid rgba(0, 0, 0, 0.06)",
                      background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.78))",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          Check-in
                        </span>
                        <strong style={{ fontSize: 20 }}>{result.data.checkinDate}</strong>
                      </div>
                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          background: "rgba(239, 229, 212, 0.75)",
                          color: "var(--accent-strong)",
                          fontWeight: 700,
                        }}
                      >
                        {t.progress.weight}: {result.data.weightKg ? `${result.data.weightKg} kg` : t.progress.notAvailable}
                      </span>
                    </div>

                    {result.data.clientNotes ? (
                      <NoteBlock label={t.progress.clientNotes} value={result.data.clientNotes} />
                    ) : null}

                    {result.data.coachNotes ? (
                      <NoteBlock label={t.progress.coachNotes} value={result.data.coachNotes} />
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      }}
                    >
                      {(["front", "side", "back"] as const).map((photoType) => {
                        const photo =
                          result.data?.photos.find((item) => item.photoType === photoType) ?? null;

                        return (
                          <div key={photoType} style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>
                              {t.progress.photoTypes[photoType]}
                            </span>
                            {photo?.signedUrl ? (
                              <img
                                src={photo.signedUrl}
                                alt={t.progress.photoAlt(t.progress.photoTypes[photoType])}
                                style={{
                                  width: "100%",
                                  aspectRatio: "3 / 4",
                                  objectFit: "cover",
                                  borderRadius: 14,
                                  border: "1px solid var(--border)",
                                  background: "#fff",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: "grid",
                                  placeItems: "center",
                                  minHeight: 180,
                                  borderRadius: 14,
                                  border: "1px dashed var(--border)",
                                  color: "var(--muted)",
                                  background: "#fff",
                                }}
                              >
                                {t.progress.noPhoto}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>,
                ]
              : [],
          )}
        </div>
      )}
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: 14,
        borderRadius: 16,
        background: "rgba(255, 250, 243, 0.88)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {value}
      </p>
    </div>
  );
}
