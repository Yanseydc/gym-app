import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { RoutineDetailCard } from "@/modules/coaching/components/routine-detail-card";
import { getRoutineForPage } from "@/modules/coaching/services/routine-service";

type RoutineDetailPageProps = {
  params: Promise<{
    routineId: string;
  }>;
};

export default async function RoutineDetailPage({ params }: RoutineDetailPageProps) {
  const { t } = await getAdminText();
  const { routineId } = await params;
  const { data: routine, error } = await getRoutineForPage(routineId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href="/dashboard/coaching/exercises" label={t("common.backToCoaching")} />
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
      <BackNavigation
        href={`/dashboard/clients/${routine.clientId}?tab=coaching`}
        label={t("common.backToCoaching")}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: t("nav.coaching") },
          { href: `/dashboard/clients/${routine.clientId}?tab=coaching`, label: routine.clientName },
          { label: routine.title },
        ]}
      />

      <RoutineDetailCard routine={routine} showEditLink />
    </div>
  );
}
