"use client";

import { StatusBadge } from "@/components/status-badge";
import type { AssignmentItem } from "../types";

interface AssignmentCardProps {
  assignment: AssignmentItem;
  isActive: boolean;
  onSelect: () => void;
}

export function AssignmentCard({
  assignment,
  isActive,
  onSelect,
}: AssignmentCardProps) {
  const isPastDue = new Date(assignment.dueDate) < new Date();
  const dateFormatted = new Date(assignment.dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        isActive
          ? "border-rose-700 bg-rose-50/70"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-900 line-clamp-1">{assignment.title}</span>
        <StatusBadge
          label={isPastDue ? "CLOSED" : "ACTIVE"}
          tone={isPastDue ? "slate" : "rose"}
        />
      </div>
      <p className="mt-1 text-xs text-stone-500">Due: {dateFormatted}</p>
      <p className="mt-2 text-xs font-semibold text-stone-600">
        Max Score: {assignment.maxScore} pts
      </p>
    </button>
  );
}
