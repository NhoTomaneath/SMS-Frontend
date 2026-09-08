"use client";

import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { AttendanceRecord, StudentRegistration } from "../types";

export function useClassAttendance(classId?: string, date?: string) {
  return useApiQuery<AttendanceRecord[]>(
    ["teacher", "attendance", classId, date],
    classId ? `/teacher/classes/${classId}/attendance` : "",
    {
      query: date ? { dateFrom: date, dateTo: date } : undefined,
      enabled: Boolean(classId),
    },
  );
}

export function useClassRegistrations(classId?: string) {
  return useApiQuery<StudentRegistration[]>(
    ["academic-affairs", "registrations", classId],
    "/academic-affairs/course-registrations",
    {
      query: classId ? { classId, status: "REGISTERED" } : undefined,
      enabled: Boolean(classId),
    },
  );
}

export interface RecordAttendanceBody {
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
}

export function useRecordAttendance(classId: string) {
  return useApiMutation<RecordAttendanceBody, AttendanceRecord>(
    `/teacher/classes/${classId}/attendance`,
    {
      method: "POST",
      invalidate: [["teacher", "attendance", classId]],
    },
  );
}

export interface UpdateAttendanceBody {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
}

export function useUpdateAttendanceRecord(classId?: string) {
  return useApiMutation<UpdateAttendanceBody, AttendanceRecord>(
    (body) => `/teacher/attendance/${body.id}`,
    {
      method: "PATCH",
      invalidate: classId ? [["teacher", "attendance", classId]] : undefined,
    },
  );
}
