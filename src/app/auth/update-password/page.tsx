import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/modules/auth/components/update-password-form";
import { passwordRecoverySessionCookie } from "@/modules/auth/constants/recovery";

type UpdatePasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const recoveryUserId = cookieStore.get(passwordRecoverySessionCookie)?.value ?? null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const expectedRecoveryUserId = recoveryUserId && user?.id === recoveryUserId ? recoveryUserId : null;
  const initialError = resolvedSearchParams?.error === "invalid_recovery"
    ? "El enlace no es válido o expiró. Solicita uno nuevo."
    : null;

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
        <UpdatePasswordForm
          expectedRecoveryUserId={expectedRecoveryUserId}
          initialError={initialError}
        />
      </div>
    </main>
  );
}
