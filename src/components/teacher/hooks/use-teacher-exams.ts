"use client";

import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type {
  ExamItem,
  ExamPaperItem,
  ExamScoreItem,
  FinalGradeItem,
} from "../exam-types";

export function useExamsList(classId?: string) {
  return useApiQuery<ExamItem[]>(
    ["coe", "exams", classId],
    "/coe/exams",
    {
      query: classId ? { classId } : undefined,
    },
  );
}

export function useExamPapers(examId?: string) {
  return useApiQuery<ExamPaperItem[]>(
    ["teacher", "exam-papers", examId],
    examId ? `/teacher/exams/${examId}/exam-papers` : "",
    { enabled: Boolean(examId) },
  );
}

export function useCreateExamPaper(examId: string) {
  return useApiMutation<{ fileUrl: string }, ExamPaperItem>(
    `/teacher/exams/${examId}/exam-papers`,
    {
      method: "POST",
      invalidate: [["teacher", "exam-papers", examId]],
    },
  );
}

export function useSubmitExamPaper(examId?: string) {
  return useApiMutation<{ id: string }, ExamPaperItem>(
    (body) => `/teacher/exam-papers/${body.id}/submit`,
    {
      method: "PATCH",
      invalidate: examId ? [["teacher", "exam-papers", examId]] : undefined,
    },
  );
}

export function useExamScores(examId?: string) {
  return useApiQuery<ExamScoreItem[]>(
    ["coe", "exam-scores", examId],
    examId ? `/coe/exams/${examId}/scores` : "",
    { enabled: Boolean(examId) },
  );
}

/** Correct/submit a score for a student on this exam (SRS 4.3/4.6 — teacher-accessible for their own class). */
export function useCreateExamScore(examId?: string) {
  return useApiMutation<{ studentId: string; score: number }, ExamScoreItem>(
    examId ? `/coe/exams/${examId}/scores` : "",
    {
      invalidate: examId ? [["coe", "exam-scores", examId]] : undefined,
    },
  );
}

export function useUpdateExamScore(examId?: string) {
  return useApiMutation<{ id: string; score: number }, ExamScoreItem>(
    (body) => `/coe/exam-scores/${body.id}`,
    {
      method: "PATCH",
      invalidate: examId ? [["coe", "exam-scores", examId]] : undefined,
    },
  );
}

export function useFinalGrades(classId?: string) {
  return useApiQuery<FinalGradeItem[]>(
    ["coe", "final-grades", classId],
    classId ? `/coe/classes/${classId}/final-grades` : "",
    { enabled: Boolean(classId) },
  );
}

/** Calculate a student's final score (40% coursework + 60% final exam) — SRS 4.3/4.6. */
export function useGenerateFinalGrade(classId?: string) {
  return useApiMutation<{ studentId: string }, FinalGradeItem>(
    classId ? `/coe/classes/${classId}/final-grades` : "",
    {
      invalidate: classId ? [["coe", "final-grades", classId]] : undefined,
    },
  );
}
