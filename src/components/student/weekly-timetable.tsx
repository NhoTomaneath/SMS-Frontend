"use client";

import { useMemo } from "react";
import {
  WEEK_DAYS,
  courseTint,
  hoursOf,
  todayName,
  type OwnClassSlot,
} from "@/lib/student/dashboard-data";

/** Pixels per hour on the grid. */
const HOUR_HEIGHT = 56;

const DAY_LABEL: Record<(typeof WEEK_DAYS)[number], string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

interface Placed {
  slot: OwnClassSlot;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

/**
 * Lays one day's slots side by side when they overlap, so two classes booked
 * over the same hour are both visible instead of one hiding the other.
 */
function placeDay(slots: OwnClassSlot[]): Placed[] {
  const items = slots
    .map((slot) => ({ slot, start: hoursOf(slot.startTime), end: hoursOf(slot.endTime) }))
    .sort((a, b) => a.start - b.start);

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];

  const closeCluster = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds.length = 0;
  };

  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.end;
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  closeCluster();

  return placed;
}

/**
 * The student's week as a real timeline: days across, hours down, and each
 * class drawn as a block at its actual time and length.
 */
export function WeeklyTimetable({ slots }: { slots: OwnClassSlot[] }) {
  const today = todayName();

  const { startHour, endHour, columns } = useMemo(() => {
    const starts = slots.map((s) => hoursOf(s.startTime));
    const ends = slots.map((s) => hoursOf(s.endTime));
    // Pad to whole hours and never draw less than a working day.
    const startHour = Math.min(8, Math.floor(Math.min(...starts)));
    const endHour = Math.max(17, Math.ceil(Math.max(...ends)));
    const columns = WEEK_DAYS.map((day) => ({
      day,
      placed: placeDay(slots.filter((s) => s.day === day)),
    }));
    return { startHour, endHour, columns };
  }, [slots]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const showNowLine = nowHour >= startHour && nowHour <= endHour;

  return (
    <div className="mt-5 overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-[3rem_repeat(5,1fr)] border-b border-stone-200 pb-2">
          <div />
          {WEEK_DAYS.map((day) => (
            <p
              key={day}
              className={`text-center text-xs font-bold uppercase tracking-wide ${
                day === today ? "text-rose-700" : "text-stone-400"
              }`}
            >
              {DAY_LABEL[day]}
              {day === today && <span className="ml-1 text-[10px] font-semibold">· Today</span>}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-[3rem_repeat(5,1fr)]">
          {/* Hour gutter */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-stone-400"
                style={{ top: (hour - startHour) * HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {/* Day columns */}
          {columns.map(({ day, placed }) => (
            <div
              key={day}
              className={`relative border-l border-stone-100 ${day === today ? "bg-rose-50/40" : ""}`}
              style={{ height: gridHeight }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-stone-100"
                  style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                />
              ))}

              {day === today && showNowLine && (
                <div
                  className="absolute inset-x-0 z-10 border-t-2 border-rose-600"
                  style={{ top: (nowHour - startHour) * HOUR_HEIGHT }}
                >
                  <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-600" />
                </div>
              )}

              {placed.map(({ slot, start, end, lane, lanes }) => (
                <div
                  key={slot.id}
                  className={`absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-xs shadow-sm ${courseTint(slot.code)}`}
                  style={{
                    top: (start - startHour) * HOUR_HEIGHT + 1,
                    height: (end - start) * HOUR_HEIGHT - 2,
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                  title={`${slot.code} — ${slot.name}\n${slot.startTime}–${slot.endTime} · ${slot.room}`}
                >
                  <p className="truncate font-bold">{slot.code}</p>
                  <p className="truncate opacity-80">{slot.room}</p>
                  <p className="truncate opacity-70">
                    {slot.startTime}–{slot.endTime}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
