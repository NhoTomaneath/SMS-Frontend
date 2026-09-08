"use client";

import { CheckCircleIcon, FileTextIcon, SendIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { EnrollmentReportDTO } from "@/lib/api/types";

interface ReportsListProps {
  reports: EnrollmentReportDTO[];
  isLoading: boolean;
  onOpenGenerate: () => void;
  onSendReport: (id: string) => void;
  isSending: boolean;
}

export function ReportsListCard({
  reports,
  isLoading,
  onOpenGenerate,
  onSendReport,
  isSending,
}: ReportsListProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-stone-900 text-sm">Official Reports</h3>
        <span className="text-[11px] font-medium text-stone-400">Principal Dispatch</span>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="py-6 text-center text-xs text-stone-400">Loading reports…</p>}
        {!isLoading && reports.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center">
            <FileTextIcon className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-2 text-xs font-medium text-stone-500">No reports generated yet.</p>
            <button type="button" onClick={onOpenGenerate} className="mt-2 text-xs font-bold text-rose-700 hover:underline">
              Generate First Report →
            </button>
          </div>
        )}
        {reports.map((report) => (
          <div key={report.id} className="rounded-xl border border-stone-200 p-3 hover:border-rose-200 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-stone-900">{report.academicYear?.yearLabel || "Academic Year"}</h4>
                <p className="text-[11px] text-stone-400">{report.department?.name || "All Departments"} • {new Date(report.generatedAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge label={report.sentToPrincipal ? "Delivered" : "Draft"} tone={report.sentToPrincipal ? "green" : "amber"} />
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 text-stone-600">
              <span>Active: <b>{report.totalActiveStudents}</b> • New: <b>{report.totalNewStudents}</b></span>
              {!report.sentToPrincipal ? (
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => onSendReport(report.id)}
                  className="flex items-center gap-1 font-bold text-rose-700 hover:underline disabled:opacity-50"
                >
                  <SendIcon className="h-3 w-3" /> Send
                </button>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Sent
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
