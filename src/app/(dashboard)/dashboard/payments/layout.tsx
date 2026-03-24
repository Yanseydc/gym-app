import { ensureModuleAccess } from "@/lib/auth/guards";
import { getCurrentUser } from "@/modules/auth/services/auth-service";

type PaymentsLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PaymentsLayout({ children }: PaymentsLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    ensureModuleAccess(user.role, "payments");
  }

  return children;
}
