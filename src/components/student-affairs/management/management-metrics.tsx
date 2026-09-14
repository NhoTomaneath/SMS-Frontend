"use client";

import { IconStatCard } from "@/components/icon-stat-card";
import { GraduationCapIcon, ShieldCheckIcon, UserPlusIcon, UsersIcon } from "@/components/icons";
import type { StudentSummaryDTO } from "@/lib/api/types";

interface ManagementMetricsProps {
  summary?: StudentSummaryDTO;
  isLoading: boolean;
}

export function ManagementMetrics({ summary, isLoading }: ManagementMetricsProps) {
  const byStatus = summary?.byStatus;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <IconStatCard
        icon={UsersIcon}
        iconBgClassName="bg-rose-50 text-rose-700"
        label="Total Students"
        value={isLoading ? "…" : (summary?.total ?? 0).toLocaleString()}
        trend={summary?.currentAcademicYear?.yearLabel ? `AY: ${summary.currentAcademicYear.yearLabel}` : undefined}
      />
      <IconStatCard
        icon={UserPlusIcon}
        iconBgClassName="bg-emerald-50 text-emerald-700"
        label="Active Enrolled"
        value={isLoading ? "…" : (byStatus?.ENROLLED ?? 0).toLocaleString()}
      />
      <IconStatCard
        icon={GraduationCapIcon}
        iconBgClassName="bg-sky-50 text-sky-700"
        label="Graduated"
        value={isLoading ? "…" : (byStatus?.GRADUATED ?? 0).toLocaleString()}
      />
      <IconStatCard
        icon={ShieldCheckIcon}
        iconBgClassName="bg-amber-50 text-amber-700"
        label="On Leave / Pending"
        value={isLoading ? "…" : ((byStatus?.ON_LEAVE ?? 0) + (byStatus?.PENDING ?? 0)).toLocaleString()}
      />
    </div>
  );
}
