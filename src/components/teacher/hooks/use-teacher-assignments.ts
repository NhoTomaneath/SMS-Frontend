"use client";

import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { AssignmentItem, SubmissionItem } from "../types";

export function useClassAssignments(classId?: string) {
  return useApiQuery<AssignmentItem[]>(
    ["teacher", "assignments", classId],
    classId ? `/teacher/classes/${classId}/assignments` : "",
    { enabled: Boolean(classId) },
  );
}

export function useAssignmentSubmissions(assignmentId?: string) {
  return useApiQuery<SubmissionItem[]>(
    ["teacher", "submissions", assignmentId],
    assignmentId ? `/teacher/assignments/${assignmentId}/submissions` : "",
    { enabled: Boolean(assignmentId) },
  );
}

export interface CreateAssignmentBody {
  title: string;
  description?: string;
  maxScore: number;
  dueDate: string;
}

export function useCreateAssignment(classId: string) {
  return useApiMutation<CreateAssignmentBody, AssignmentItem>(
    `/teacher/classes/${classId}/assignments`,
    {
      method: "POST",
      invalidate: [["teacher", "assignments", classId]],
    },
  );
}

export function useGradeSubmission(assignmentId?: string) {
  return useApiMutation<{ id: string; score: number }>(
    (body) => `/teacher/submissions/${body.id}/grade`,
    {
      method: "PATCH",
      invalidate: assignmentId ? [["teacher", "submissions", assignmentId]] : undefined,
    },
  );
}

export function useCreateSubmission(assignmentId: string) {
  return useApiMutation<{ studentId: string; score?: number }>(
    `/teacher/assignments/${assignmentId}/submissions`,
    {
      method: "POST",
      invalidate: [["teacher", "submissions", assignmentId]],
    },
  );
}
