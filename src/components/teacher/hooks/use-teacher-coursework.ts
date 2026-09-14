"use client";

import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { CourseworkGradeItem } from "../types";

export function useCourseworkGrades(classId?: string) {
  return useApiQuery<CourseworkGradeItem[]>(
    ["teacher", "coursework-grades", classId],
    classId ? `/teacher/classes/${classId}/coursework-grades` : "",
    { enabled: Boolean(classId) },
  );
}

export function useCreateCourseworkGrade(classId: string) {
  return useApiMutation<{ studentId: string; courseworkScore: number }, CourseworkGradeItem>(
    `/teacher/classes/${classId}/coursework-grades`,
    {
      method: "POST",
      invalidate: [["teacher", "coursework-grades", classId]],
    },
  );
}

export function useUpdateCourseworkGrade(classId?: string) {
  return useApiMutation<{ id: string; courseworkScore: number }, CourseworkGradeItem>(
    (body) => `/teacher/coursework-grades/${body.id}`,
    {
      method: "PATCH",
      invalidate: classId ? [["teacher", "coursework-grades", classId]] : undefined,
    },
  );
}

export function useSubmitCourseworkGrade(classId?: string) {
  return useApiMutation<{ id: string }, CourseworkGradeItem>(
    (body) => `/teacher/coursework-grades/${body.id}/submit`,
    {
      method: "PATCH",
      invalidate: classId ? [["teacher", "coursework-grades", classId]] : undefined,
    },
  );
}
