"use client";

import { StatusBadge } from "@/components/status-badge";
import type { StudentRegistration } from "../types";

interface CalculateFinalScoreRowProps {
  registration: StudentRegistration;
  isPending: boolean;
  onCalculate: (studentId: string) => Promise<void>;
}

export function CalculateFinalScoreRow({
  registration,
  isPending,
  onCalculate,
}: CalculateFinalScoreRowProps) {
  const { student } = registration;

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50">
      <td className="py-4">
        <div>
          <p className="font-semibold text-stone-800">
            {student.firstName} {student.lastName}
          </p>
          <p className="font-mono text-xs text-stone-400">{student.studentNumber}</p>
        </div>
      </td>
      <td className="py-4 text-stone-400" colSpan={3}>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onCalculate(registration.studentId)}
          className="rounded-md bg-rose-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-40"
        >
          Calculate Final Score
        </button>
      </td>
      <td className="py-4 text-stone-400">—</td>
      <td className="py-4">
        <StatusBadge label="NOT CALCULATED" tone="slate" />
      </td>
    </tr>
  );
}
