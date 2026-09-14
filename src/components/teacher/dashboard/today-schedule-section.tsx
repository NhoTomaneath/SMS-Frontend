"use client";

import { ScheduleCard } from "./schedule-card";
import type { TimetableScheduleItem } from "../types";

interface TodayScheduleSectionProps {
  schedule?: TimetableScheduleItem[];
  isLoading: boolean;
  onOpenTimetable: () => void;
  onTakeAttendance: (item: TimetableScheduleItem) => void;
}

export function TodayScheduleSection({
  schedule = [],
  isLoading,
  onOpenTimetable,
  onTakeAttendance,
}: TodayScheduleSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 p-6">
        <h2 className="text-xl font-bold text-stone-900">Today&apos;s Schedule</h2>
        <button
          type="button"
          onClick={onOpenTimetable}
          className="text-sm font-semibold text-rose-700 hover:underline"
        >
          View Timetable
        </button>
      </div>

      {isLoading ? (
        <p className="p-10 text-center text-sm text-stone-400">Loading today&apos;s schedule…</p>
      ) : schedule.length === 0 ? (
        <p className="p-10 text-center text-sm text-stone-400">
          No scheduled classes for this day.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {schedule.map((item) => (
            <ScheduleCard key={item.id} item={item} onTakeAttendance={onTakeAttendance} />
          ))}
        </ul>
      )}
    </section>
  );
}
