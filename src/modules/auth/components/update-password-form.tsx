"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { buttonPrimary, input } from "@/lib/ui";
import { createClient } from "@/lib/supabase/client";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

const invalidRecoveryMessage = "El enlace no es válido o expiró. Solicita uno nuevo.";

type UpdatePasswordFormProps = {
    expectedRecoveryUserId: string | null;
    initialError?: string | null;
};

export function UpdatePasswordForm({
    expectedRecoveryUserId,
    initialError,
}: UpdatePasswordFormProps) {
    const router = useRouter();
    const supabaseRef = useRef<SupabaseBrowserClient | null>(null);
    const isRecoverySessionRef = useRef(false);
    const recoveryUserIdRef = useRef<string | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(initialError ?? null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);
    const [checking, setChecking] = useState(true);
    const [isRecoverySession, setIsRecoverySession] = useState(false);

    useEffect(() => {
        let isMounted = true;

        function rejectRecovery(message = invalidRecoveryMessage) {
            if (!isMounted) {
                return;
            }

            isRecoverySessionRef.current = false;
            recoveryUserIdRef.current = null;
            setIsRecoverySession(false);
            setError(message);
            setChecking(false);
        }

        async function resolveRecoverySession() {
            try {
                const supabase = createClient();
                supabaseRef.current = supabase;

                const { data, error: sessionError } = await supabase.auth.getSession();

                if (!isMounted) {
                    return;
                }

                if (
                    sessionError ||
                    !data.session?.user ||
                    !expectedRecoveryUserId ||
                    data.session.user.id !== expectedRecoveryUserId
                ) {
                    await supabase.auth.signOut();
                    rejectRecovery();
                    return;
                }

                isRecoverySessionRef.current = true;
                recoveryUserIdRef.current = data.session.user.id;
                setIsRecoverySession(true);
                setError(null);
                setChecking(false);
            } catch {
                if (!isMounted) {
                    return;
                }

                rejectRecovery();
            }
        }

        void resolveRecoverySession();

        return () => {
            isMounted = false;
        };
    }, [expectedRecoveryUserId]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!isRecoverySession || !isRecoverySessionRef.current || !recoveryUserIdRef.current) {
            setError(invalidRecoveryMessage);
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
        const supabase = supabaseRef.current;

        if (!supabase) {
            setPending(false);
            setIsRecoverySession(false);
            setError(invalidRecoveryMessage);
            return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (
            sessionError ||
            !sessionData.session?.user ||
            sessionData.session.user.id !== recoveryUserIdRef.current ||
            !isRecoverySessionRef.current
        ) {
            setPending(false);
            await supabase.auth.signOut();
            isRecoverySessionRef.current = false;
            recoveryUserIdRef.current = null;
            setIsRecoverySession(false);
            setError(invalidRecoveryMessage);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        setPending(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        await supabase.auth.signOut();
        setSuccess(true);
        window.setTimeout(() => {
            router.replace("/login?password_updated=1");
        }, 1200);
    }

    if (checking) {
        return <p style={messageStyles("info")}>Validando enlace...</p>;
    }

    if (!isRecoverySession) {
        return (
            <div style={{ display: "grid", gap: 12 }}>
                <p style={messageStyles("error")}>
                    {error ?? invalidRecoveryMessage}
                </p>
                <Link href="/login" className={buttonPrimary} style={{ width: "fit-content" }}>
                    Volver a login
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 600 }}>Nueva contraseña</span>
                <input
                    required
                    disabled={pending || success}
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
                    disabled={pending || success}
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

            <button type="submit" disabled={pending || success} className={buttonPrimary}>
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
