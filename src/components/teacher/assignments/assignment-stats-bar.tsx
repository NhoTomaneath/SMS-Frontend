"use client";

import type { SubmissionItem } from "../types";

interface AssignmentStatsBarProps {
  submissions: SubmissionItem[];
  maxScore: number;
}

export function AssignmentStatsBar({ submissions, maxScore }: AssignmentStatsBarProps) {
  const graded = submissions.filter((s): s is SubmissionItem & { score: number } => s.score !== null);
  const gradedCount = graded.length;
  const scores = graded.map((s) => s.score);

  const avg = gradedCount > 0 ? (scores.reduce((a, b) => a + b, 0) / gradedCount).toFixed(1) : "—";
  const high = gradedCount > 0 ? Math.max(...scores) : "—";
  const low = gradedCount > 0 ? Math.min(...scores) : "—";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-stone-500">Graded Submissions</p>
        <p className="mt-1 text-2xl font-bold text-rose-700">
          {gradedCount} / {submissions.length}
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-stone-500">Average Score</p>
        <p className="mt-1 text-2xl font-bold text-stone-800">
          {avg !== "—" ? `${avg} / ${maxScore}` : "—"}
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-stone-500">High Score</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600">
          {high !== "—" ? `${high} / ${maxScore}` : "—"}
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-stone-500">Low Score</p>
        <p className="mt-1 text-2xl font-bold text-amber-600">
          {low !== "—" ? `${low} / ${maxScore}` : "—"}
        </p>
      </div>
    </div>
  );
}
