import { redirect } from "next/navigation";

import { getDefaultAuthenticatedRoute } from "@/config/routes";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type LoginPageProps = {
  searchParams?: Promise<{
    password_updated?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultAuthenticatedRoute(user.role));
  }

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
          <span style={{ fontWeight: 700, color: "var(--accent-strong)" }}>Acceso</span>
          <h1 style={{ margin: 0 }}>Inicia sesión</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Base inicial para autenticación con Supabase y asignación de roles.
          </p>
        </div>
        {resolvedSearchParams?.password_updated === "1" ? (
          <p
            style={{
              margin: "0 0 16px",
              padding: "12px 14px",
              borderRadius: 12,
              color: "var(--success)",
              background: "var(--success-bg)",
            }}
          >
            Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
