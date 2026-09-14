"use client";

import { useClassRegistrations } from "../hooks/use-teacher-attendance";
import {
  useCourseworkGrades,
  useCreateCourseworkGrade,
  useUpdateCourseworkGrade,
  useSubmitCourseworkGrade,
} from "../hooks/use-teacher-coursework";
import { CourseworkGradeRow } from "./coursework-grade-row";

interface CourseworkGradesPanelProps {
  classId: string;
  onSuccess: (msg: string) => void;
}

export function CourseworkGradesPanel({ classId, onSuccess }: CourseworkGradesPanelProps) {
  const regsQuery = useClassRegistrations(classId);
  const gradesQuery = useCourseworkGrades(classId);

  const registrations = regsQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];

  const createMutation = useCreateCourseworkGrade(classId);
  const updateMutation = useUpdateCourseworkGrade(classId);
  const submitMutation = useSubmitCourseworkGrade(classId);

  const gradeMap = new Map(grades.map((g) => [g.studentId, g]));

  async function handleSave(studentId: string, score: number, gradeId?: string) {
    if (gradeId) {
      await updateMutation.mutateAsync({ id: gradeId, courseworkScore: score });
    } else {
      await createMutation.mutateAsync({ studentId, courseworkScore: score });
    }
    onSuccess("Coursework grade saved.");
  }

  async function handleSubmitToCoe(gradeId: string) {
    await submitMutation.mutateAsync({ id: gradeId });
    onSuccess("Coursework grade submitted to COE.");
  }

  const isLoading = regsQuery.isLoading || gradesQuery.isLoading;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-6">
        <h2 className="text-lg font-bold uppercase text-stone-900">Coursework Final Marks (40%)</h2>
        <p className="mt-1 text-sm text-stone-500">
          Record overall coursework scores out of 100. Submit to COE before finals.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 text-xs font-bold uppercase text-stone-400">
              <th className="px-6 py-3">Student Number</th>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-6 py-3">COE Status</th>
              <th className="px-6 py-3">Coursework Score (0–100)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                  Loading coursework roster…
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
                <CourseworkGradeRow
                  key={reg.id}
                  registration={reg}
                  existingGrade={gradeMap.get(reg.studentId)}
                  onSave={handleSave}
                  onSubmitToCoe={handleSubmitToCoe}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
