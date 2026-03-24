import Link from "next/link";

import { ClientList } from "@/modules/clients/components/client-list";
import { ClientSearchForm } from "@/modules/clients/components/client-search-form";
import { getClientsForPage } from "@/modules/clients/services/client-service";
import { clientSearchSchema } from "@/modules/clients/validators/client";

type ClientsPageProps = {
  searchParams?: Promise<{
    search?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = clientSearchSchema.parse({
    search: resolvedSearchParams.search,
  });
  const { data: clients, error } = await getClientsForPage({
    search: filters.search ?? "",
  });

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Clients</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Create, search and manage gym clients from one place.
          </p>
        </div>

        <Link
          href="/dashboard/clients/new"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          New client
        </Link>
      </header>

      <ClientSearchForm defaultValue={filters.search ?? ""} />

      {error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      ) : null}

      <ClientList clients={clients} />
    </div>
  );
}
