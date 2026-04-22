import Link from "next/link";

import { buttonPrimary } from "@/lib/ui";
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
    <div className="clients-page">
      <header className="clients-header">
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Clients</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Create, search and manage gym clients from one place.
          </p>
        </div>

        <Link href="/dashboard/clients/new" className={buttonPrimary} style={{ width: "fit-content" }}>
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
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
          }}
        >
          {error}
        </p>
      ) : null}

      <ClientList clients={clients} />
    </div>
  );
}
