import { redirect } from "next/navigation";

import { PortalShell } from "@/modules/portal/components/portal-shell";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";

type PortalLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const [user, linkedClientResult] = await Promise.all([
    getCurrentUser(),
    getLinkedClientForCurrentUser(),
  ]);

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "member") {
    redirect("/dashboard");
  }

  if (linkedClientResult.error || !linkedClientResult.data) {
    return (
      <main style={{ padding: "56px 0 72px", width: "min(1120px, calc(100% - 32px))", margin: "0 auto" }}>
        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 32,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            borderRadius: 24,
          }}
        >
          <h1 style={{ margin: 0 }}>Client portal unavailable</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {linkedClientResult.error ??
              "Your account is not linked to a client record yet. Please contact the gym staff."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <PortalShell client={linkedClientResult.data} user={user}>
      {children}
    </PortalShell>
  );
}
