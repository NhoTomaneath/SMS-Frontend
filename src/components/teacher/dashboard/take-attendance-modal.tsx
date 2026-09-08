"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { useClassRegistrations, useRecordAttendance } from "../hooks/use-teacher-attendance";
import { AttendanceStudentRow, type AttendanceStatus } from "./attendance-student-row";
import type { TimetableScheduleItem } from "../types";

interface TakeAttendanceModalProps {
  item: TimetableScheduleItem;
  date: Date;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function TakeAttendanceModal({
  item,
  date,
  onClose,
  onSuccess,
}: TakeAttendanceModalProps) {
  const classId = item.classId;
  const regQuery = useClassRegistrations(classId);
  const registrations = regQuery.data?.data ?? [];
  const recordMutation = useRecordAttendance(classId);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  async function handleSubmit() {
    if (registrations.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        registrations.map((r) =>
          recordMutation.mutateAsync({
            studentId: r.studentId,
            date: dateStr,
            status: statuses[r.studentId] || "PRESENT",
          }),
        ),
      );
      onSuccess(`Attendance recorded for ${item.class.course.code}`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-stone-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Take Attendance</h3>
            <p className="text-xs text-stone-500">{item.class.course.code}: {item.class.course.name} • {dateStr}</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-5 w-5" /></button>
        </div>

        <ul className="my-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {regQuery.isLoading ? (
            <li className="py-6 text-center text-xs text-stone-400">Loading students…</li>
          ) : registrations.length === 0 ? (
            <li className="py-6 text-center text-xs text-stone-400">No students registered in class.</li>
          ) : (
            registrations.map((reg) => (
              <AttendanceStudentRow
                key={reg.id}
                registration={reg}
                currentStatus={statuses[reg.studentId] || "PRESENT"}
                onStatusChange={(st) => setStatuses((p) => ({ ...p, [reg.studentId]: st }))}
              />
            ))
          )}
        </ul>

        {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-500">Cancel</button>
          <button
            type="button"
            disabled={isSubmitting || registrations.length === 0}
            onClick={handleSubmit}
            className="rounded-lg bg-rose-800 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Submit Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}
