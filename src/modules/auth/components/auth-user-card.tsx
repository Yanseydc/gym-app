import type { AuthUser } from "@/modules/auth/types";

type AuthUserCardProps = {
  user: AuthUser;
};

export function AuthUserCard({ user }: AuthUserCardProps) {
  const fullName = [user.profile.firstName, user.profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>
        {fullName || user.email}
      </strong>
      <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>
        {user.role}
      </span>
    </div>
  );
}
