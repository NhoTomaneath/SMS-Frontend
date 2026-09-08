"use client";

import { StatusBadge } from "@/components/status-badge";
import type { FinalGradeItem } from "../exam-types";

interface CorrectionStudentRowProps {
  grade: FinalGradeItem;
}

export function CorrectionStudentRow({ grade }: CorrectionStudentRowProps) {
  const { student } = grade;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50">
      <td className="py-4">
        <div>
          <p className="font-semibold text-stone-800">{fullName}</p>
          <p className="font-mono text-xs text-stone-400">{student.studentNumber}</p>
        </div>
      </td>
      <td className="py-4 text-stone-700">{grade.courseworkScore.toFixed(1)}</td>
      <td className="py-4 text-stone-700">{grade.examScore.toFixed(1)}</td>
      <td className="py-4">
        <span className="rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-700">
          {grade.finalScore.toFixed(1)} ({grade.letterGrade})
        </span>
      </td>
      <td className="py-4 font-mono text-xs font-semibold text-stone-600">
        {grade.gpaPoints.toFixed(1)}
      </td>
      <td className="py-4">
        <StatusBadge
          label={grade.status}
          tone={grade.status === "PUBLISHED" ? "green" : grade.status === "APPROVED" ? "sky" : "amber"}
        />
      </td>
    </tr>
  );
}
