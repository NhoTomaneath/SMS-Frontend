import { AccountGuard } from "@/components/account-guard";
import { AccountShell } from "@/components/account/account-shell";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <AccountGuard>
      <AccountShell>{children}</AccountShell>
    </AccountGuard>
  );
}
