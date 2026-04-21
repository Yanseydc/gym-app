import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type CoachingLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function CoachingLayout({ children }: CoachingLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "coaching");
  }

  return children;
}
