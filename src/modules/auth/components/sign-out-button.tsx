import { signOut } from "@/modules/auth/services/sign-out";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        style={{
          width: "100%",
          border: "1px solid var(--border)",
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(255, 255, 255, 0.02)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Cerrar sesión
      </button>
    </form>
  );
}
