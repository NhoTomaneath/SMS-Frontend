"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ClipboardIcon, GridIcon, LayersIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";
import { roleLabel } from "@/lib/auth/roles";

function isDashboardActive(pathname: string) {
  return pathname === "/academic-affairs";
}

function isProgramSetupActive(pathname: string) {
  return pathname.startsWith("/academic-affairs/program-setup");
}

function isSchedulingActive(pathname: string) {
  return pathname.startsWith("/academic-affairs/course-registration");
}

export function AcademicAffairsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      href: "/academic-affairs",
      label: "Dashboard",
      icon: GridIcon,
      active: isDashboardActive(pathname),
    },
    {
      href: "/academic-affairs/course-registration",
      label: "Course and Scheduling",
      icon: ClipboardIcon,
      active: isSchedulingActive(pathname),
    },
    {
      href: "/academic-affairs/program-setup",
      label: "Program Setup",
      icon: LayersIcon,
      active: isProgramSetupActive(pathname),
    },
  ];

  return (
    <DashboardShell
      homeHref="/academic-affairs"
      navItems={navItems}
      userName={user ? `${user.firstName} ${user.lastName}` : "Academic Affairs"}
      userRole={user ? roleLabel(user.role) : "Academic Affairs"}
    >
      {children}
    </DashboardShell>
  );
}
