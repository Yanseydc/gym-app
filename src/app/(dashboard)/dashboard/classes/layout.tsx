import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type ClassesLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ClassesLayout({ children }: ClassesLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "classes");
  }

  return children;
}
