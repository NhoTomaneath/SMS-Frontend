"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { BarChartIcon, GraduationCapIcon, GridIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";
import { roleLabel } from "@/lib/auth/roles";

function isDashboardActive(pathname: string) {
  return pathname === "/student";
}

function isExamsActive(pathname: string) {
  return pathname.startsWith("/student/exams-results");
}

function isGraduationActive(pathname: string) {
  return pathname.startsWith("/student/graduation-status");
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      href: "/student",
      label: "Dashboard",
      icon: GridIcon,
      active: isDashboardActive(pathname),
    },
    {
      href: "/student/exams-results",
      label: "Exams & Results",
      icon: BarChartIcon,
      active: isExamsActive(pathname),
    },
    {
      href: "/student/graduation-status",
      label: "Graduation Status",
      icon: GraduationCapIcon,
      active: isGraduationActive(pathname),
    },
  ];

  return (
    <DashboardShell
      homeHref="/student"
      navItems={navItems}
      userName={user ? `${user.firstName} ${user.lastName}` : "Student"}
      userRole={user ? roleLabel(user.role) : "Student"}
    >
      {children}
    </DashboardShell>
  );
}
