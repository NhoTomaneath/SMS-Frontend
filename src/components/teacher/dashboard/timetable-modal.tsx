"use client";

import { XIcon } from "@/components/icons";
import { formatTimeSlot } from "../format-time";
import type { TimetableScheduleItem } from "../types";

interface TimetableModalProps {
  schedule: TimetableScheduleItem[];
  date: Date;
  onClose: () => void;
}

export function TimetableModal({ schedule, date, onClose }: TimetableModalProps) {
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Today&apos;s Timetable</h3>
            <p className="text-sm text-stone-500">{formattedDate}</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 flex-1 overflow-y-auto">
          {schedule.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No scheduled sessions for this day.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {schedule.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {item.class.course.code}: {item.class.course.name}
                    </p>
                    <p className="text-xs text-stone-500">Room: {item.room || item.class.room || "TBD"}</p>
                  </div>
                  <span className="rounded-lg bg-rose-50 px-3 py-1 font-mono text-xs font-bold text-rose-700 whitespace-nowrap">
                    {formatTimeSlot(item.startTime)} - {formatTimeSlot(item.endTime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
