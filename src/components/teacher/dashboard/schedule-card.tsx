"use client";

import { MapPinIcon, UsersIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { formatTimeSlot } from "../format-time";
import type { TimetableScheduleItem } from "../types";

interface ScheduleCardProps {
  item: TimetableScheduleItem;
  onTakeAttendance: (item: TimetableScheduleItem) => void;
}

export function ScheduleCard({ item, onTakeAttendance }: ScheduleCardProps) {
  const registeredCount = item.class._count?.registrations ?? 0;
  const courseTitle = `${item.class.course.code}: ${item.class.course.name}`;

  return (
    <li className="flex flex-wrap items-center gap-5 p-6 hover:bg-stone-50/50">
      <div className="w-24 shrink-0 rounded-lg bg-rose-50 px-2.5 py-2 text-center text-xs font-bold text-stone-700">
        <p className="truncate" title={item.startTime}>{formatTimeSlot(item.startTime)}</p>
        <div className="my-1 h-px bg-rose-200" />
        <p className="truncate" title={item.endTime}>{formatTimeSlot(item.endTime)}</p>
      </div>

      <div className="min-w-[220px] flex-1">
        <p className="text-lg font-semibold text-stone-900">{courseTitle}</p>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-stone-500">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4" />
            {item.room || item.class.room || "TBD"}
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="h-4 w-4" />
            {registeredCount} Students Enrolled
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge label={item.class.status || "ACTIVE"} tone="rose" />
        <button
          type="button"
          onClick={() => onTakeAttendance(item)}
          className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
        >
          Take Attendance
        </button>
      </div>
    </li>
  );
}
