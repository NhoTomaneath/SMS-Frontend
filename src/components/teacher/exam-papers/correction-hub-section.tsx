"use client";

import { useState } from "react";
import { useClassRegistrations } from "../hooks/use-teacher-attendance";
import { useFinalGrades, useGenerateFinalGrade } from "../hooks/use-teacher-exams";
import { CorrectionStudentRow } from "./correction-student-row";
import { CalculateFinalScoreRow } from "./calculate-final-score-row";

interface CorrectionHubSectionProps {
  classId: string;
}

export function CorrectionHubSection({ classId }: CorrectionHubSectionProps) {
  const regsQuery = useClassRegistrations(classId);
  const gradesQuery = useFinalGrades(classId);
  const generateMutation = useGenerateFinalGrade(classId);
  const [error, setError] = useState<string | null>(null);

  const registrations = regsQuery.data?.data ?? [];
  const finalGrades = gradesQuery.data?.data ?? [];
  const gradedStudentIds = new Set(finalGrades.map((g) => g.studentId));
  const ungraded = registrations.filter((reg) => !gradedStudentIds.has(reg.studentId));

  const isLoading = regsQuery.isLoading || gradesQuery.isLoading;

  async function handleCalculate(studentId: string) {
    setError(null);
    try {
      await generateMutation.mutateAsync({ studentId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not calculate final score.");
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-900">Official Final Evaluation &amp; Scores</h2>
        <p className="text-sm text-stone-500">
          Calculate: 40% Coursework + 60% Final Exam. Coursework must be submitted and the
          final exam score recorded first.
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-400">
              <th className="py-3">Student</th>
              <th className="py-3">Coursework (40)</th>
              <th className="py-3">Exam (60)</th>
              <th className="py-3">Final Score</th>
              <th className="py-3">GPA</th>
              <th className="py-3">COE Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : registrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-stone-400">
                  No students registered for this class.
                </td>
              </tr>
            ) : (
              <>
                {finalGrades.map((grade) => (
                  <CorrectionStudentRow key={grade.id} grade={grade} />
                ))}
                {ungraded.map((reg) => (
                  <CalculateFinalScoreRow
                    key={reg.id}
                    registration={reg}
                    isPending={generateMutation.isPending}
                    onCalculate={handleCalculate}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
