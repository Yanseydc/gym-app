"use client";

import type { CSSProperties } from "react";

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
          style={inputStyles}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Contraseña</span>
        <input
          required
          name="password"
          type="password"
          placeholder="••••••••"
          style={inputStyles}
        />
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            color: "#8a1c1c",
            background: "#fbe4e4",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        style={{
          border: 0,
          padding: "14px 18px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {pending ? "Ingresando..." : "Entrar"}
      </button>
    </form>
  );
}

const inputStyles: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  font: "inherit",
};
