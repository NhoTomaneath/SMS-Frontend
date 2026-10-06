"use client";

import { EditIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import type { TeacherClass } from "../types";

interface ExamPapersHeaderProps {
  classes: TeacherClass[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onOpenCreate: () => void;
  /** Why submitting is unavailable right now; the button is disabled when set. */
  submitBlockedReason?: string | null;
}

export function ExamPapersHeader({
  classes,
  selectedClassId,
  onSelectClass,
  onOpenCreate,
  submitBlockedReason,
}: ExamPapersHeaderProps) {
  return (
    <PageHeader
      breadcrumb={[
        { label: "Exams", href: "/teacher/exam-papers" },
        { label: "Assessment Manager" },
      ]}
      separator=">"
      title="Exam Paper Control Panel"
      description="Manage exam paper submissions to the Controller of Examination (COE) and review finals."
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
            disabled={classes.length === 0 || Boolean(submitBlockedReason)}
            title={submitBlockedReason ?? undefined}
            onClick={onOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            <EditIcon className="h-4 w-4" />
            Submit Paper
          </button>
        </div>
      }
    />
  );
}
