import { StudentShell } from "@/components/student/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function StudentLayout({ children }: LayoutProps<"/student">) {
  return (
    <PortalGuard role="STUDENT">
      <StudentShell>{children}</StudentShell>
    </PortalGuard>
  );
}
