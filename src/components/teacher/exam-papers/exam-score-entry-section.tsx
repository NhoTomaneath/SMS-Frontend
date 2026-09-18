"use client";

import { useClassRegistrations } from "../hooks/use-teacher-attendance";
import { useExamScores, useCreateExamScore, useUpdateExamScore } from "../hooks/use-teacher-exams";
import { ExamScoreRow } from "./exam-score-row";

interface ExamScoreEntrySectionProps {
  classId: string;
  examId?: string;
}

export function ExamScoreEntrySection({ classId, examId }: ExamScoreEntrySectionProps) {
  const regsQuery = useClassRegistrations(classId);
  const scoresQuery = useExamScores(examId);

  const registrations = regsQuery.data?.data ?? [];
  const scores = scoresQuery.data?.data ?? [];
  const scoreMap = new Map(scores.map((s) => [s.studentId, s]));

  const createMutation = useCreateExamScore(examId);
  const updateMutation = useUpdateExamScore(examId);

  async function handleSave(studentId: string, score: number, scoreId?: string) {
    if (scoreId) {
      await updateMutation.mutateAsync({ id: scoreId, score });
    } else {
      await createMutation.mutateAsync({ studentId, score });
    }
  }

  const isLoading = regsQuery.isLoading || scoresQuery.isLoading;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-6">
        <h2 className="text-lg font-bold uppercase text-stone-900">Final Exam Scores (60%)</h2>
        <p className="mt-1 text-sm text-stone-500">
          Correct and submit each student&apos;s final exam score out of 100.
        </p>
      </div>

      {!examId ? (
        <p className="px-6 py-10 text-center text-sm text-stone-400">
          No final exam is scheduled for this class yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/50 text-xs font-bold uppercase text-stone-400">
                <th className="px-6 py-3">Student Number</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Score (0–100)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                    Loading roster…
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                    No students registered for this class.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <ExamScoreRow
                    key={reg.id}
                    registration={reg}
                    existingScore={scoreMap.get(reg.studentId)}
                    onSave={handleSave}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
