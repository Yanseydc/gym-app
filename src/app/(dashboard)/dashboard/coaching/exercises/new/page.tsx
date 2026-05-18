import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { getText } from "@/lib/i18n";
import { ExerciseForm } from "@/modules/coaching/components/exercise-form";
import { createExercise } from "@/modules/coaching/services/create-exercise";

export default async function NewExercisePage() {
  const { t: adminT } = await getAdminText();
  const t = await getText("exercises");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation
        href="/dashboard/coaching/exercises"
        label={t.backToExerciseLibrary}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: adminT("nav.coaching") },
          { label: t.createExercise },
        ]}
      />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t.createExercise}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.createDescription}
        </p>
      </header>

      <section
        className="premium-panel feature-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        <ExerciseForm action={createExercise} submitLabel={t.createExercise} />
      </section>
    </div>
  );
}
