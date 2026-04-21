import Link from "next/link";
import { notFound } from "next/navigation";

import { RoutineDetailCard } from "@/modules/coaching/components/routine-detail-card";
import { getRoutineForPage } from "@/modules/coaching/services/routine-service";

type RoutineDetailPageProps = {
  params: Promise<{
    routineId: string;
  }>;
};

export default async function RoutineDetailPage({ params }: RoutineDetailPageProps) {
  const { routineId } = await params;
  const { data: routine, error } = await getRoutineForPage(routineId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/coaching/exercises" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back
        </Link>
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
      </div>
    );
  }

  if (!routine) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href={`/dashboard/clients/${routine.clientId}`}
        style={{ color: "var(--muted)", fontWeight: 600 }}
      >
        Back to client
      </Link>

      <RoutineDetailCard routine={routine} showEditLink />
    </div>
  );
}
