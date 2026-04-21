import Link from "next/link";

import { RoutineForm } from "@/modules/coaching/components/routine-form";
import { createRoutine } from "@/modules/coaching/services/create-routine";
import { getRoutineClientOptionsForPage } from "@/modules/coaching/services/routine-service";
import type { RoutineFormValues } from "@/modules/coaching/types";

type NewRoutinePageProps = {
  searchParams?: Promise<{
    clientId?: string;
  }>;
};

export default async function NewRoutinePage({ searchParams }: NewRoutinePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { data: clients, error } = await getRoutineClientOptionsForPage();

  const defaultValues: RoutineFormValues = {
    clientId: resolvedSearchParams.clientId ?? "",
    title: "",
    notes: "",
    status: "draft",
    startsOn: "",
    endsOn: "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link
          href={resolvedSearchParams.clientId ? `/dashboard/clients/${resolvedSearchParams.clientId}` : "/dashboard/coaching/exercises"}
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          Back
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create routine</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Create a client routine, then add days and exercises from the exercise library.
        </p>
      </header>

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

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <RoutineForm
          action={createRoutine}
          clients={clients}
          defaultValues={defaultValues}
          submitLabel="Create routine"
          lockClient={Boolean(resolvedSearchParams.clientId)}
        />
      </section>
    </div>
  );
}
