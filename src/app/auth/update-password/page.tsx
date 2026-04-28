import { UpdatePasswordForm } from "@/modules/auth/components/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main style={{ padding: "72px 0" }}>
      <div
        style={{
          width: "min(460px, 100%)",
          margin: "0 auto",
          padding: 32,
          borderRadius: 24,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          <span style={{ fontWeight: 700, color: "var(--accent-strong)" }}>Portal</span>
          <h1 style={{ margin: 0 }}>Configura tu contraseña</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Ingresa una contraseña nueva para activar tu acceso.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
