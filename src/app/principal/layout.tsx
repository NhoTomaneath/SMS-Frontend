import { PrincipalShell } from "@/components/principal/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function PrincipalLayout({ children }: LayoutProps<"/principal">) {
  return (
    <PortalGuard role="PRINCIPAL">
      <PrincipalShell>{children}</PrincipalShell>
    </PortalGuard>
  );
}
