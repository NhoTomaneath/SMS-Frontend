"use client";

import { EmptyRow, ErrorRow, LoadingRow } from "@/components/query-states";
import { ManagementTableRow } from "./management-table-row";
import type { StudentDTO, StudentStatus } from "@/lib/api/types";

interface TableProps {
  students: StudentDTO[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry: () => void;
  actionMenuStudentId: string | null;
  onToggleAction: (id: string) => void;
  onViewProfile: (student: StudentDTO) => void;
  onEdit: (student: StudentDTO) => void;
  onStatusChange: (id: string, status: StudentStatus) => void;
}

export function ManagementTable({
  students,
  isLoading,
  isError,
  error,
  onRetry,
  actionMenuStudentId,
  onToggleAction,
  onViewProfile,
  onEdit,
  onStatusChange,
}: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-5 py-3">Student Name</th>
            <th className="px-5 py-3">Department</th>
            <th className="px-5 py-3">Email</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {isLoading && <LoadingRow colSpan={5} label="Loading students…" />}
          {isError && <ErrorRow colSpan={5} message={error?.message || "Failed to load students"} onRetry={onRetry} />}
          {!isLoading && !isError && students.length === 0 && <EmptyRow colSpan={5} label="No students match the selected filter." />}
          {!isLoading && !isError &&
            students.map((student) => (
              <ManagementTableRow
                key={student.id}
                student={student}
                isActionOpen={actionMenuStudentId === student.id}
                onToggleAction={() => onToggleAction(student.id)}
                onViewProfile={() => onViewProfile(student)}
                onEdit={() => onEdit(student)}
                onStatusChange={(st) => onStatusChange(student.id, st)}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
