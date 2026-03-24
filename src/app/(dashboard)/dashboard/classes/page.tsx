import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ClassesPage() {
    return (
        <DashboardShell
            title="Clases"
            description="Placeholder inicial para programación, cupo y reservas."
        >
            <PlaceholderCard
                title="Próximo alcance"
                body="Catálogo de clases, sesiones programadas, reserva y control de asistencia."
            />
        </DashboardShell>
    );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
    return (
        <article
            style={{
                padding: 20,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
            }}
        >
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <p style={{ marginBottom: 0, color: "var(--muted)", lineHeight: 1.6 }}>{body}</p>
        </article>
    );
}
