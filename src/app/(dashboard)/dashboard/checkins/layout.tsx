import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type CheckInsLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function CheckInsLayout({ children }: CheckInsLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "checkins");
  }

  return children;
}
