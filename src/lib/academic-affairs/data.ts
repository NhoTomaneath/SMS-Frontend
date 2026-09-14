/**
 * View models for the Academic Affairs portal.
 *
 * Everything here maps a backend DTO onto what the pages render. Presentation
 * constants (grid days, avatar palette) live here too so the pages stay layout.
 */

import type {
  ClassDTO,
  CourseDTO,
  DayOfWeekDTO,
  DeadlineDTO,
  DeadlineKindDTO,
  ScheduleConflictDTO,
  SemesterDTO,
  TimetableEntryDTO,
} from "@/lib/api/types";

// ─── Timetable grid ─────────────────────────────────────────────────────────

export const TIMETABLE_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const satisfies readonly DayOfWeekDTO[];

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

/** Row labels for the weekly grid. An entry lands in the last slot it starts at or after. */
export const TIMETABLE_TIME_SLOTS = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
];

// ─── Shared presentation helpers ────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "??";
}

/**
 * The backend stores `startTime`/`endTime` in a Postgres `time` column, which
 * Prisma serialises as a full ISO timestamp on 1970-01-01 UTC. Only the clock
 * face is meaningful, so read it off the string rather than going through a
 * Date — that would shift the value by the viewer's timezone.
 */
export function timeOf(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? iso.slice(0, 5);
}

// ─── Course registry ────────────────────────────────────────────────────────

export interface CourseRegistryItem {
  id: string;
  code: string;
  title: string;
  department: string;
  credits: number;
}

export function fromApiCourse(dto: CourseDTO): CourseRegistryItem {
  return {
    id: dto.id,
    code: dto.code,
    title: dto.name,
    department: dto.department.name,
    credits: dto.credits,
  };
}

// ─── Registration monitoring ────────────────────────────────────────────────

export interface RegistrationMonitorRow {
  id: string;
  code: string;
  title: string;
  instructor: string;
  instructorInitials: string;
  instructorColorClassName: string;
  enrolled: number;
  capacity: number;
  status: "OPEN" | "FULL";
}

export function fromApiClass(dto: ClassDTO): RegistrationMonitorRow {
  return {
    id: dto.id,
    code: dto.course.code,
    title: dto.course.name,
    instructor: `${dto.teacher.firstName} ${dto.teacher.lastName}`.trim(),
    instructorInitials: initialsOf(dto.teacher.firstName, dto.teacher.lastName),
    instructorColorClassName: avatarColor(dto.teacherId),
    enrolled: dto.enrolledCount,
    capacity: dto.capacity,
    status: dto.enrolledCount >= dto.capacity ? "FULL" : "OPEN",
  };
}

// ─── Weekly timetable ───────────────────────────────────────────────────────

export interface TimetableEvent {
  id: string;
  day: DayOfWeekDTO;
  /** The grid row this entry is drawn in. */
  slot: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  published: boolean;
  colorClassName: string;
}

const EVENT_COLORS = [
  "border-rose-600 bg-rose-50 text-rose-700",
  "border-sky-600 bg-sky-50 text-sky-800",
  "border-amber-500 bg-amber-50 text-amber-800",
  "border-teal-600 bg-teal-50 text-teal-800",
  "border-violet-600 bg-violet-50 text-violet-800",
];

function eventColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

/** The last grid slot that starts at or before this entry, so nothing is dropped. */
function slotFor(startTime: string): string {
  let slot = TIMETABLE_TIME_SLOTS[0] as string;
  for (const candidate of TIMETABLE_TIME_SLOTS) {
    if (candidate <= startTime) slot = candidate;
  }
  return slot;
}

export function fromApiTimetableEntry(dto: TimetableEntryDTO): TimetableEvent {
  const startTime = timeOf(dto.startTime);
  return {
    id: dto.id,
    day: dto.dayOfWeek,
    slot: slotFor(startTime),
    startTime,
    endTime: timeOf(dto.endTime),
    title: dto.class.course.code,
    location: dto.room ?? "Room TBC",
    published: dto.published,
    colorClassName: eventColor(dto.class.course.id),
  };
}

// ─── Conflicts ──────────────────────────────────────────────────────────────

export interface ScheduleConflict {
  id: string;
  kind: "ROOM" | "TEACHER";
  description: string;
}

export function fromApiConflict(dto: ScheduleConflictDTO): ScheduleConflict {
  return {
    // Conflicts are derived, not stored, so key on the pair they describe.
    id: `${dto.kind}-${dto.entries[0].id}-${dto.entries[1].id}`,
    kind: dto.kind,
    description: dto.description,
  };
}

// ─── Semesters ──────────────────────────────────────────────────────────────

export interface SemesterOption {
  id: string;
  label: string;
  registrationOpen: boolean;
  startDate: string;
  endDate: string;
}

export function fromApiSemester(dto: SemesterDTO): SemesterOption {
  return {
    id: dto.id,
    label: `${dto.name} (${dto.academicYear.yearLabel})`,
    registrationOpen: dto.registrationOpen,
    // The backend returns full ISO timestamps; <input type="date"> wants YYYY-MM-DD.
    startDate: dto.startDate.slice(0, 10),
    endDate: dto.endDate.slice(0, 10),
  };
}

// ─── Deadlines ──────────────────────────────────────────────────────────────

export interface DeadlineItem {
  id: string;
  day: string;
  month: string;
  title: string;
  description: string;
  daysAway: number;
  accentClassName: string;
}

/** Urgency drives the colour: this week is red, this fortnight amber. */
const DEADLINE_ACCENTS: Array<{ within: number; className: string }> = [
  { within: 7, className: "border-rose-600 bg-rose-50 text-rose-700" },
  { within: 21, className: "border-amber-500 bg-amber-50 text-amber-700" },
  { within: Infinity, className: "border-sky-500 bg-sky-50 text-sky-700" },
];

const KIND_LABELS: Record<DeadlineKindDTO, string> = {
  REGISTRATION_CLOSE: "Registration",
  SEMESTER_END: "Semester",
  ASSIGNMENT_DUE: "Coursework",
  EXAM: "Examination",
};

export function fromApiDeadline(dto: DeadlineDTO): DeadlineItem {
  const date = new Date(dto.date);
  const accent =
    DEADLINE_ACCENTS.find((a) => dto.daysAway <= a.within)?.className ??
    (DEADLINE_ACCENTS[DEADLINE_ACCENTS.length - 1]?.className as string);

  return {
    id: dto.id,
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleString(undefined, { month: "short" }).toUpperCase(),
    title: dto.title,
    description: `${KIND_LABELS[dto.kind]} · ${dto.description}`,
    daysAway: dto.daysAway,
    accentClassName: accent,
  };
}
