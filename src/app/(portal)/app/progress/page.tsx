import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getProgressCheckInsForPage, getProgressCheckInForPage } from "@/modules/coaching/services/progress-checkin-service";

export default async function PortalProgressPage() {
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
      <header>
        <h1 style={{ margin: "0 0 8px" }}>My progress</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Review your progress check-ins, notes, and photos.
        </p>
      </header>

      {detailedCheckIns.length === 0 ? (
        <article
          style={{
            padding: 24,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          No progress check-ins yet.
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
                      gap: 16,
                      padding: 20,
                      borderRadius: 20,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
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
                      <strong>{result.data.checkinDate}</strong>
                      <span style={{ color: "var(--muted)" }}>
                        Weight: {result.data.weightKg ? `${result.data.weightKg} kg` : "N/A"}
                      </span>
                    </div>

                    {result.data.clientNotes ? (
                      <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                        Client notes: {result.data.clientNotes}
                      </p>
                    ) : null}

                    {result.data.coachNotes ? (
                      <p style={{ margin: 0, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                        Coach notes: {result.data.coachNotes}
                      </p>
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
                              {photoType[0].toUpperCase() + photoType.slice(1)}
                            </span>
                            {photo?.signedUrl ? (
                              <img
                                src={photo.signedUrl}
                                alt={`${photoType} progress photo`}
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
                                No photo
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
