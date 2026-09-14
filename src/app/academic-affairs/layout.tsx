import { AcademicAffairsShell } from "@/components/academic-affairs/shell";
import { PortalGuard } from "@/components/portal-guard";

export default function AcademicAffairsLayout({
  children,
}: LayoutProps<"/academic-affairs">) {
  return (
    <PortalGuard role="ACADEMIC_AFFAIRS">
      <AcademicAffairsShell>{children}</AcademicAffairsShell>
    </PortalGuard>
  );
}
