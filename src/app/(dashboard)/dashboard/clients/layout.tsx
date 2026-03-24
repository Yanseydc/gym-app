import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type ClientsLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ClientsLayout({ children }: ClientsLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "clients");
  }

  return children;
}
