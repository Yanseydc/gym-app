import { CheckInHistoryList } from "@/modules/checkins/components/checkin-history-list";
import { CheckInResultsList } from "@/modules/checkins/components/checkin-results-list";
import { CheckInSearchForm } from "@/modules/checkins/components/checkin-search-form";
import {
  getCheckInSearchResultsForPage,
  getRecentCheckInsForPage,
} from "@/modules/checkins/services/checkin-service";
import { checkInSearchSchema } from "@/modules/checkins/validators/checkin";

type CheckInsPageProps = {
  searchParams?: Promise<{
    search?: string;
  }>;
};

export default async function CheckInsPage({ searchParams }: CheckInsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = checkInSearchSchema.parse({
    search: resolvedSearchParams.search,
  });
  const search = filters.search ?? "";
  const [{ data: clients, error: searchError }, { data: recentCheckIns, error: recentError }] =
    await Promise.all([
      getCheckInSearchResultsForPage(search),
      getRecentCheckInsForPage(),
    ]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: "0 0 8px" }}>Check-ins</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Reception flow for finding clients, validating membership access and registering entry.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Search client</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Search by first name or last name to check membership access.
          </p>
        </div>

        <CheckInSearchForm defaultValue={search} />

        {searchError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {searchError}
          </p>
        ) : null}

        {search ? <CheckInResultsList clients={clients} /> : null}
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Recent check-ins</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Latest entries registered by reception staff.
          </p>
        </div>

        {recentError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {recentError}
          </p>
        ) : (
          <CheckInHistoryList checkIns={recentCheckIns} />
        )}
      </section>
    </div>
  );
}
