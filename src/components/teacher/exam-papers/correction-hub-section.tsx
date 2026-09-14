"use client";

import { useFinalGrades } from "../hooks/use-teacher-exams";
import { CorrectionStudentRow } from "./correction-student-row";

interface CorrectionHubSectionProps {
  classId: string;
}

export function CorrectionHubSection({ classId }: CorrectionHubSectionProps) {
  const query = useFinalGrades(classId);
  const finalGrades = query.data?.data ?? [];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-900">Official Final Evaluation &amp; Scores</h2>
        <p className="text-sm text-stone-500">
          Calculated by COE: 40% Coursework + 60% Final Exam
        </p>
      </div>

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
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-stone-400">
                  Loading final scores…
                </td>
              </tr>
            ) : finalGrades.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-stone-400">
                  No final grades published yet by COE for this class.
                </td>
              </tr>
            ) : (
              finalGrades.map((grade) => (
                <CorrectionStudentRow key={grade.id} grade={grade} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
