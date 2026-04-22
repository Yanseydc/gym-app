"use client";

import { buttonPrimary, input } from "@/lib/ui";
import { useLoginForm } from "@/modules/auth/hooks/use-login-form";

export function LoginForm() {
  const { state, formAction, pending } = useLoginForm();

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Correo</span>
        <input
          required
          name="email"
          type="email"
          placeholder="admin@gymos.app"
          className={input}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Contraseña</span>
        <input
          required
          name="password"
          type="password"
          placeholder="••••••••"
          className={input}
        />
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            color: "var(--danger-fg)",
            background: "var(--danger-bg)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={buttonPrimary}
      >
        {pending ? "Ingresando..." : "Entrar"}
      </button>
    </form>
  );
}
