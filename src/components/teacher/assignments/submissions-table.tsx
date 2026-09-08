"use client";

import { SubmissionRow } from "./submission-row";
import type { AssignmentItem, SubmissionItem } from "../types";

interface SubmissionsTableProps {
  assignment: AssignmentItem;
  submissions: SubmissionItem[];
  isLoading: boolean;
  onSaveGrade: (submissionId: string, score: number) => Promise<void>;
}

export function SubmissionsTable({
  assignment,
  submissions,
  isLoading,
  onSaveGrade,
}: SubmissionsTableProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-6">
        <h2 className="text-lg font-bold uppercase text-stone-900">{assignment.title}</h2>
        <p className="mt-1 text-sm text-stone-500">
          {assignment.description || "Enter student scores and submit evaluations."} • Max:{" "}
          {assignment.maxScore} pts
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/50 text-xs font-bold uppercase text-stone-400">
              <th className="px-6 py-3">Student Number</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Score / {assignment.maxScore}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                  Loading submissions…
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                  No submissions recorded for this assignment yet.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <SubmissionRow
                  key={sub.id}
                  submission={sub}
                  maxScore={assignment.maxScore}
                  onSaveGrade={onSaveGrade}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
