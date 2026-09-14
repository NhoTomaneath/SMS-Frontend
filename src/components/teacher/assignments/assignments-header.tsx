"use client";

import { DownloadIcon, EditIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import type { TeacherClass } from "../types";

interface AssignmentsHeaderProps {
  classes: TeacherClass[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onOpenCreate: () => void;
  onExportCsv: () => void;
}

export function AssignmentsHeader({
  classes,
  selectedClassId,
  onSelectClass,
  onOpenCreate,
  onExportCsv,
}: AssignmentsHeaderProps) {
  return (
    <PageHeader
      title="Assignment & Grading"
      description="Manage coursework, track submissions, and submit official student grades."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassId}
            disabled={classes.length === 0}
            onChange={(e) => onSelectClass(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-rose-400 disabled:opacity-50"
          >
            {classes.length === 0 ? (
              <option value="">No classes assigned</option>
            ) : (
              classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.course.code}: {cls.course.name}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            disabled={classes.length === 0}
            onClick={onExportCsv}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            disabled={classes.length === 0}
            onClick={onOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            <EditIcon className="h-4 w-4" />
            Create Assignment
          </button>
        </div>
      }
    />
  );
}
