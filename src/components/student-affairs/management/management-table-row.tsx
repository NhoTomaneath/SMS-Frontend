"use client";

import { MoreVerticalIcon } from "@/components/icons";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import type { StudentDTO, StudentStatus } from "@/lib/api/types";

const statusToneMap: Record<StudentStatus, StatusTone> = {
  ENROLLED: "green",
  PENDING: "amber",
  WITHDRAWN: "rose",
  GRADUATED: "sky",
  ON_LEAVE: "slate",
};

interface RowProps {
  student: StudentDTO;
  isActionOpen: boolean;
  onToggleAction: () => void;
  onViewProfile: () => void;
  onEdit: () => void;
  onStatusChange: (status: StudentStatus) => void;
}

export function ManagementTableRow({
  student,
  isActionOpen,
  onToggleAction,
  onViewProfile,
  onEdit,
  onStatusChange,
}: RowProps) {
  return (
    <tr className="hover:bg-stone-50/60 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 font-bold text-xs text-rose-800">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-stone-900 text-xs">{student.firstName} {student.lastName}</p>
            <p className="font-mono text-[11px] text-stone-400">{student.studentNumber}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-xs text-stone-600">{student.department?.name || "None"}</td>
      <td className="px-5 py-3.5 text-xs text-stone-600">{student.personalEmail || "N/A"}</td>
      <td className="px-5 py-3.5">
        <StatusBadge label={student.status} tone={statusToneMap[student.status] || "slate"} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="relative inline-flex items-center gap-2">
          <button type="button" onClick={onViewProfile} className="text-xs font-semibold text-rose-700 hover:underline">
            View
          </button>
          <button type="button" onClick={onToggleAction} className="rounded p-1 text-stone-400 hover:bg-stone-100">
            <MoreVerticalIcon className="h-3.5 w-3.5" />
          </button>

          {isActionOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-stone-200 bg-white py-1 shadow-lg text-left">
              <button
                type="button"
                onClick={onEdit}
                className="w-full px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 text-left"
              >
                Edit Details
              </button>
              <div className="my-1 border-t border-stone-100" />
              <p className="px-3 py-0.5 text-[10px] font-bold uppercase text-stone-400">Change Status</p>
              {(["ENROLLED", "PENDING", "ON_LEAVE", "GRADUATED"] as StudentStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={student.status === st}
                  onClick={() => onStatusChange(st)}
                  className={`w-full px-3 py-1 text-xs text-left ${student.status === st ? "bg-rose-50 font-bold text-rose-800" : "text-stone-700 hover:bg-stone-50"}`}
                >
                  Mark {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
