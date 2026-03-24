import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type MembershipsLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function MembershipsLayout({
  children,
}: MembershipsLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "memberships");
  }

  return children;
}
