"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { createClient } from "@/lib/supabase/client";

type SessionStatus = "checking" | "ready" | "invalid";

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function resolveRecoverySession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (sessionError || !data.session) {
          setSessionStatus("invalid");
          setError("El enlace no es válido o expiró. Solicita uno nuevo.");
          return;
        }

        setSessionStatus("ready");
        setError(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setSessionStatus("invalid");
        setError("El enlace no es válido o expiró. Solicita uno nuevo.");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      if (session) {
        setSessionStatus("ready");
        setError(null);
      }
    });

    void resolveRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (sessionStatus !== "ready") {
      setError("El enlace no es válido o expiró. Solicita uno nuevo.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setPending(false);
      setSessionStatus("invalid");
      setError("El enlace no es válido o expiró. Solicita uno nuevo.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (sessionStatus === "checking") {
    return <p style={messageStyles("info")}>Validando enlace...</p>;
  }

  if (sessionStatus === "invalid") {
    return (
      <p style={messageStyles("error")}>
        {error ?? "El enlace no es válido o expiró. Solicita uno nuevo."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Nueva contraseña</span>
        <input
          required
          disabled={sessionStatus !== "ready" || pending || success}
          minLength={8}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={input}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Confirmar contraseña</span>
        <input
          required
          disabled={sessionStatus !== "ready" || pending || success}
          minLength={8}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={input}
        />
      </label>

      {error ? <p style={messageStyles("error")}>{error}</p> : null}
      {success ? (
        <p style={messageStyles("success")}>Tu contraseña ha sido configurada correctamente</p>
      ) : null}

      <button type="submit" disabled={sessionStatus !== "ready" || pending || success} className={buttonPrimary}>
        {pending ? "Configurando..." : "Configurar contraseña"}
      </button>
    </form>
  );
}

function messageStyles(tone: "error" | "success" | "info") {
  return {
    margin: 0,
    padding: "12px 14px",
    borderRadius: 12,
    color:
      tone === "error"
        ? "var(--danger-fg)"
        : tone === "success"
          ? "var(--success)"
          : "var(--muted)",
    background:
      tone === "error"
        ? "var(--danger-bg)"
        : tone === "success"
          ? "var(--success-bg)"
          : "var(--surface-alt)",
  };
}
