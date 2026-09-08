"use client";

import Link from "next/link";
import { CheckCircleIcon } from "@/components/icons";

interface EnrollmentSuccessProps {
  assignedId: string;
  studentName: string;
  departmentName?: string;
  academicYearLabel?: string;
  onReset: () => void;
}

export function EnrollmentSuccess({
  assignedId,
  studentName,
  departmentName,
  academicYearLabel,
  onReset,
}: EnrollmentSuccessProps) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircleIcon className="h-8 w-8" />
      </div>
      <h2 className="mt-3 text-2xl font-extrabold text-stone-900">
        Student Enrolled Successfully!
      </h2>
      <p className="mt-1 text-xs text-stone-600">
        The official student profile has been registered in the database.
      </p>

      <div className="my-5 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Assigned Student Number
        </p>
        <p className="font-mono text-2xl font-black text-emerald-800 mt-0.5">
          {assignedId}
        </p>
        <p className="text-sm font-bold text-stone-800 mt-1">{studentName}</p>
        <p className="text-xs text-stone-500">
          {departmentName || "Faculty Assigned"} • {academicYearLabel || "Session"}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/student-affairs"
          className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
        >
          View in Student Directory
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-stone-300 bg-white px-5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          Enroll Another Student
        </button>
      </div>
    </div>
  );
}
