"use client";

import { DownloadIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { EmptyRow, ErrorRow, LoadingRow } from "@/components/query-states";
import type { StudentDTO } from "@/lib/api/types";

interface AuditTableProps {
  students: StudentDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onExportCsv: () => void;
}

export function EnrolledAuditTable({
  students,
  isLoading,
  isError,
  onRetry,
  page,
  totalPages,
  onPageChange,
  onExportCsv,
}: AuditTableProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-stone-900 text-sm">Enrolled Students Audit Registry</h3>
        <button
          type="button"
          onClick={onExportCsv}
          className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          <DownloadIcon className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50/75 text-[10px] font-bold uppercase text-stone-500">
            <tr>
              <th className="py-2.5 px-3">Student</th>
              <th className="py-2.5 px-3">Student ID</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && <LoadingRow colSpan={4} label="Loading enrolled students…" />}
            {isError && <ErrorRow colSpan={4} message="Failed to load records." onRetry={onRetry} />}
            {!isLoading && !isError && students.length === 0 && <EmptyRow colSpan={4} label="No enrolled students." />}
            {students.map((st) => (
              <tr key={st.id} className="hover:bg-rose-50/20">
                <td className="py-2.5 px-3 font-semibold text-stone-900">{st.firstName} {st.lastName}</td>
                <td className="py-2.5 px-3 font-mono text-stone-500">{st.studentNumber}</td>
                <td className="py-2.5 px-3 text-stone-600">{st.department?.name || "General"}</td>
                <td className="py-2.5 px-3"><StatusBadge label="Enrolled" tone="green" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-1.5">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded border px-2 py-0.5 hover:bg-stone-50 disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded border px-2 py-0.5 hover:bg-stone-50 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
