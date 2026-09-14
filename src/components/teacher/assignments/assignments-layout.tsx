"use client";

import { AssignmentsSidebar } from "./assignments-sidebar";
import { AssignmentStatsBar } from "./assignment-stats-bar";
import { SubmissionsTable } from "./submissions-table";
import type { AssignmentItem, SubmissionItem } from "../types";

interface AssignmentsLayoutProps {
  assignments: AssignmentItem[];
  activeAssignment: AssignmentItem | null;
  submissions: SubmissionItem[];
  assignmentsLoading: boolean;
  submissionsLoading: boolean;
  onSelectAssignment: (id: string) => void;
  onSaveGrade: (id: string, score: number) => Promise<void>;
}

export function AssignmentsLayout({
  assignments,
  activeAssignment,
  submissions,
  assignmentsLoading,
  submissionsLoading,
  onSelectAssignment,
  onSaveGrade,
}: AssignmentsLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      <AssignmentsSidebar
        assignments={assignments}
        selectedId={activeAssignment?.id || null}
        isLoading={assignmentsLoading}
        onSelect={onSelectAssignment}
      />
      <div className="space-y-6">
        {activeAssignment ? (
          <>
            <AssignmentStatsBar submissions={submissions} maxScore={activeAssignment.maxScore} />
            <SubmissionsTable
              assignment={activeAssignment}
              submissions={submissions}
              isLoading={submissionsLoading}
              onSaveGrade={onSaveGrade}
            />
          </>
        ) : !assignmentsLoading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-400">
            <p className="font-semibold text-stone-600">No assignment selected</p>
            <p className="mt-1 text-sm">Select or create an assignment to view submissions and grading.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
