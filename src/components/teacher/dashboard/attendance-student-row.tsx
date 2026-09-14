"use client";

import type { StudentRegistration } from "../types";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface AttendanceStudentRowProps {
  registration: StudentRegistration;
  currentStatus: AttendanceStatus;
  onStatusChange: (status: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: "PRESENT", label: "Present", activeClass: "bg-emerald-600 text-white" },
  { value: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { value: "EXCUSED", label: "Excused", activeClass: "bg-sky-600 text-white" },
  { value: "ABSENT", label: "Absent", activeClass: "bg-rose-600 text-white" },
];

export function AttendanceStudentRow({
  registration,
  currentStatus,
  onStatusChange,
}: AttendanceStudentRowProps) {
  const { student } = registration;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
      <div>
        <p className="text-sm font-semibold text-stone-800">{fullName}</p>
        <p className="font-mono text-xs text-stone-400">{student.studentNumber}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onStatusChange(opt.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              currentStatus === opt.value
                ? opt.activeClass
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </li>
  );
}
