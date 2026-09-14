import { ControllerOfExaminationShell } from "@/components/coe/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function ControllerOfExaminationLayout({
  children,
}: LayoutProps<"/controller-of-examination">) {
  return (
    <PortalGuard role="CONTROLLER_OF_EXAMINATION">
      <ControllerOfExaminationShell>{children}</ControllerOfExaminationShell>
    </PortalGuard>
  );
}
