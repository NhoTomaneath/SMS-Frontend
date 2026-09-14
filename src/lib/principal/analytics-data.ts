/** View models for the Principal analytics portal. */

import type { StatusTone } from "@/components/status-badge";
import type {
  FacultyProfileDTO,
  PerformanceMetricNameDTO,
} from "@/lib/api/types";
import { avatarColor, fullName, initialsOf } from "@/lib/format";

// ─── Performance metrics ────────────────────────────────────────────────────

export const METRIC_LABELS: Record<PerformanceMetricNameDTO, string> = {
  AVG_GPA: "Average GPA",
  PASS_RATE: "Pass Rate",
  ENROLLMENT_GROWTH: "Enrollment Growth",
  FACULTY_PERFORMANCE: "Faculty Performance",
};

/** How each metric reads: a GPA is out of 4, the others are percentages or ratings. */
export const METRIC_UNITS: Record<PerformanceMetricNameDTO, "gpa" | "percent" | "rating"> = {
  AVG_GPA: "gpa",
  PASS_RATE: "percent",
  ENROLLMENT_GROWTH: "percent",
  FACULTY_PERFORMANCE: "rating",
};

export function formatMetric(name: PerformanceMetricNameDTO, value: number): string {
  switch (METRIC_UNITS[name]) {
    case "gpa":
      return value.toFixed(2);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "rating":
      return `${value.toFixed(1)} / 5`;
  }
}

/** Normalises a metric onto 0–100 so different units share one bar scale. */
export function metricProgress(name: PerformanceMetricNameDTO, value: number): number {
  switch (METRIC_UNITS[name]) {
    case "gpa":
      return Math.min(100, Math.round((value / 4) * 100));
    case "rating":
      return Math.min(100, Math.round((value / 5) * 100));
    case "percent":
      return Math.min(100, Math.max(0, Math.round(value)));
  }
}

// ─── Faculty ────────────────────────────────────────────────────────────────

export interface FacultyRow {
  id: string;
  userId: string;
  name: string;
  initials: string;
  avatarColorClassName: string;
  email: string;
  department: string;
  publicationIndex: number;
  studentRating: number;
  performanceLabel: string;
}

export function fromApiFacultyProfile(dto: FacultyProfileDTO): FacultyRow {
  return {
    id: dto.id,
    userId: dto.userId,
    name: fullName(dto.user.firstName, dto.user.lastName),
    initials: initialsOf(dto.user.firstName, dto.user.lastName),
    avatarColorClassName: avatarColor(dto.userId),
    email: dto.user.email,
    department: dto.departmentName,
    publicationIndex: dto.publicationIndex,
    studentRating: dto.studentRating,
    performanceLabel: dto.performanceLabel,
  };
}

export function performanceTone(label: string): StatusTone {
  const normalised = label.toLowerCase();
  if (normalised.includes("excellent")) return "green";
  if (normalised.includes("strong")) return "sky";
  if (normalised.includes("satisfactory")) return "amber";
  return "rose";
}

// ─── Status colours for the enrollment mix ──────────────────────────────────

export const STATUS_BAR_COLORS: Record<string, string> = {
  ENROLLED: "bg-rose-700",
  PENDING: "bg-amber-500",
  GRADUATED: "bg-emerald-600",
  WITHDRAWN: "bg-stone-500",
  ON_LEAVE: "bg-sky-600",
};

/** Palette for the grade-distribution bars, ordered best to worst. */
export const GRADE_BAR_COLORS = [
  "bg-rose-900",
  "bg-rose-700",
  "bg-red-500",
  "bg-amber-500",
  "bg-teal-700",
  "bg-stone-500",
  "bg-stone-700",
];
