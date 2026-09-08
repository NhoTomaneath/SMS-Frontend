"use client";

import { useState } from "react";
import { ChevronDownIcon, FileTextIcon, XIcon } from "@/components/icons";
import type { AcademicYearDTO, DepartmentDTO } from "@/lib/api/types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: AcademicYearDTO[];
  departments: DepartmentDTO[];
  isSubmitting: boolean;
  onSubmit: (academicYearId: string, departmentId?: string) => void;
}

export function GenerateReportModal({
  isOpen,
  onClose,
  academicYears,
  departments,
  isSubmitting,
  onSubmit,
}: ModalProps) {
  const [yearId, setYearId] = useState(academicYears[0]?.id || "");
  const [deptId, setDeptId] = useState<string>("ALL");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveYear = yearId || academicYears[0]?.id || "";
    if (!effectiveYear) return;
    onSubmit(effectiveYear, deptId === "ALL" ? undefined : deptId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <FileTextIcon className="h-4 w-4 text-rose-700" /> Generate Official Report
          </h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold uppercase text-stone-500 mb-1">Academic Year</label>
            <div className="relative">
              <select value={yearId || academicYears[0]?.id || ""} onChange={(e) => setYearId(e.target.value)} className="w-full appearance-none rounded-lg border bg-white px-3 py-2 outline-none">
                {academicYears.map((y) => <option key={y.id} value={y.id}>{y.yearLabel}</option>)}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-stone-500 mb-1">Faculty / Department</label>
            <div className="relative">
              <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="w-full appearance-none rounded-lg border bg-white px-3 py-2 outline-none">
                <option value="ALL">All Departments (University-wide)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 font-semibold hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-rose-800 px-4 py-1.5 font-semibold text-white hover:bg-rose-900 disabled:opacity-50">
              {isSubmitting ? "Generating…" : "Generate Snapshot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
