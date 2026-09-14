"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { BarChartIcon, BriefcaseIcon, FileTextIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";
import { roleLabel } from "@/lib/auth/roles";

function isAnalyticsActive(pathname: string) {
  return pathname === "/principal";
}

function isStaffRecordsActive(pathname: string) {
  return pathname.startsWith("/principal/staff-records");
}

function isReportsActive(pathname: string) {
  return pathname.startsWith("/principal/institutional-reports");
}

export function PrincipalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      href: "/principal",
      label: "Analytics",
      icon: BarChartIcon,
      active: isAnalyticsActive(pathname),
    },
    {
      href: "/principal/staff-records",
      label: "Staff Records",
      icon: BriefcaseIcon,
      active: isStaffRecordsActive(pathname),
    },
    {
      href: "/principal/institutional-reports",
      label: "Institutional Reports",
      icon: FileTextIcon,
      active: isReportsActive(pathname),
    },
  ];

  return (
    <DashboardShell
      homeHref="/principal"
      navItems={navItems}
      userName={user ? `${user.firstName} ${user.lastName}` : "Principal"}
      userRole={user ? roleLabel(user.role) : "Principal"}
    >
      {children}
    </DashboardShell>
  );
}
