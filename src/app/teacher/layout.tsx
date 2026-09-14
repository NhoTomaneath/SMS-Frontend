import { TeacherShell } from "@/components/teacher/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <PortalGuard role="TEACHER">
      <TeacherShell>{children}</TeacherShell>
    </PortalGuard>
  );
}
