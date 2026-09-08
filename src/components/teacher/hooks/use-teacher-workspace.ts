"use client";

import { useApiQuery } from "@/lib/api/hooks";
import type { TeacherClass, TimetableScheduleItem } from "../types";

export interface DashboardPayload {
  classes: TeacherClass[];
  schedule: TimetableScheduleItem[];
}

export function useTeacherDashboard() {
  return useApiQuery<DashboardPayload>(
    ["teacher", "dashboard"],
    "/teacher/me/dashboard",
  );
}

export function useTeacherClasses() {
  return useApiQuery<TeacherClass[]>(
    ["teacher", "classes"],
    "/teacher/me/classes",
  );
}

export function useTeacherSchedule(date?: Date) {
  const dateStr = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : undefined;

  return useApiQuery<TimetableScheduleItem[]>(
    ["teacher", "schedule", dateStr],
    "/teacher/me/schedule",
    { query: dateStr ? { date: dateStr } : undefined },
  );
}
