import { StudentAffairsShell } from "@/components/student-affairs/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function StudentAffairsLayout({
  children,
}: LayoutProps<"/student-affairs">) {
  return (
    <PortalGuard role="STUDENT_AFFAIRS">
      <StudentAffairsShell>{children}</StudentAffairsShell>
    </PortalGuard>
  );
}
