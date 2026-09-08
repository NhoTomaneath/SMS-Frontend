"use client";

import Link from "next/link";
import { CalendarIcon, EnvelopeIcon, GraduationCapIcon } from "@/components/icons";

interface QuickActionsBarProps {
  onOpenAnnouncements: () => void;
  onOpenTimetable: () => void;
}

export function QuickActionsBar({
  onOpenAnnouncements,
  onOpenTimetable,
}: QuickActionsBarProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link
        href="/teacher/assignments"
        className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left hover:border-stone-300"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-700 text-white">
          <GraduationCapIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold text-stone-800">Quick Grade</span>
          <span className="block text-sm text-stone-500">Assignments &amp; coursework</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenAnnouncements}
        className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left hover:border-stone-300"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
          <EnvelopeIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold text-stone-800">Announcements</span>
          <span className="block text-sm text-stone-500">Post &amp; view updates</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenTimetable}
        className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left hover:border-stone-300"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white">
          <CalendarIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold text-stone-800">Timetable</span>
          <span className="block text-sm text-stone-500">View daily schedule</span>
        </span>
      </button>
    </div>
  );
}
