"use client";

import { ExamPaperRow } from "./exam-paper-row";
import type { ExamPaperItem } from "../exam-types";

interface DraftPapersSectionProps {
  papers: ExamPaperItem[];
  isLoading: boolean;
  onSubmitToCoe: (id: string) => Promise<void>;
  onEdit: (paper: ExamPaperItem) => void;
}

export function DraftPapersSection({
  papers,
  isLoading,
  onSubmitToCoe,
  onEdit,
}: DraftPapersSectionProps) {
  const pendingCount = papers.filter((p) => p.status !== "RECEIVED").length;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-900">Exam Papers for COE Submission</h2>
        <p className="text-sm text-stone-500">{pendingCount} Pending Acceptance</p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-stone-400">Loading exam papers…</p>
      ) : papers.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">
          No exam paper submitted for this exam yet. Use Submit Paper above.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {papers.map((paper) => (
            <ExamPaperRow key={paper.id} paper={paper} onSubmitToCoe={onSubmitToCoe} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}
