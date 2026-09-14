"use client";

import { StatusBadge } from "@/components/status-badge";
import { AssignmentCard } from "./assignment-card";
import type { AssignmentItem } from "../types";

interface AssignmentsSidebarProps {
  assignments: AssignmentItem[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

export function AssignmentsSidebar({
  assignments,
  selectedId,
  isLoading,
  onSelect,
}: AssignmentsSidebarProps) {
  return (
    <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Assignments</h2>
        <StatusBadge label={`${assignments.length} TOTAL`} tone="rose" />
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-stone-400">Loading assignments…</p>
      ) : assignments.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">
          No assignments found for this class. Create one above!
        </p>
      ) : (
        <ul className="space-y-3">
          {assignments.map((asg) => (
            <li key={asg.id}>
              <AssignmentCard
                assignment={asg}
                isActive={asg.id === selectedId}
                onSelect={() => onSelect(asg.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
