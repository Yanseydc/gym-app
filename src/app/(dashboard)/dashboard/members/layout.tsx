import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { ensureModuleAccess } from "@/lib/auth/guards";

type MembersLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function MembersLayout({ children }: MembersLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "clients");
  }

  return children;
}
