/** View models for the Teacher portal. */

import type { StatusTone } from "@/components/status-badge";
import type {
  AttendanceStatusDTO,
  CourseworkGradeStatusDTO,
  ExamPaperStatusDTO,
  TeacherClassDTO,
  TeacherScheduleEntryDTO,
} from "@/lib/api/types";
import { avatarColor, clockTime, initialsOf, fullName } from "@/lib/format";

// ─── Today's schedule ───────────────────────────────────────────────────────

export type ScheduleState = "COMPLETED" | "IN PROGRESS" | "UPCOMING";

export interface ScheduleItem {
  id: string;
  classId: string;
  startTime: string;
  endTime: string;
  title: string;
  courseCode: string;
  location: string;
  studentCount: number;
  status: ScheduleState;
}

export const scheduleTone: Record<ScheduleState, StatusTone> = {
  COMPLETED: "green",
  "IN PROGRESS": "amber",
  UPCOMING: "sky",
};

/**
 * Places a slot relative to the wall clock. The backend returns the day's
 * entries but not which one is running, so the comparison happens here against
 * the viewer's local time.
 */
function stateFor(start: string, end: string, now: Date): ScheduleState {
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  if (hhmm >= end) return "COMPLETED";
  if (hhmm >= start) return "IN PROGRESS";
  return "UPCOMING";
}

export function fromApiScheduleEntry(
  dto: TeacherScheduleEntryDTO,
  now = new Date(),
): ScheduleItem {
  const startTime = clockTime(dto.startTime);
  const endTime = clockTime(dto.endTime);
  return {
    id: dto.id,
    classId: dto.classId,
    startTime,
    endTime,
    title: dto.class.course.name,
    courseCode: dto.class.course.code,
    location: dto.room ?? dto.class.room ?? "Room TBC",
    studentCount: dto.class._count.registrations,
    status: stateFor(startTime, endTime, now),
  };
}

// ─── Assigned courses ───────────────────────────────────────────────────────

export interface AssignedCourse {
  id: string;
  code: string;
  name: string;
  semester: string;
  room: string;
  capacity: number;
  enrolled: number;
  status: TeacherClassDTO["status"];
  accentClassName: string;
}

const COURSE_ACCENTS = [
  "border-rose-600 bg-rose-50",
  "border-sky-600 bg-sky-50",
  "border-amber-500 bg-amber-50",
  "border-emerald-600 bg-emerald-50",
  "border-violet-600 bg-violet-50",
];

export function fromApiTeacherClass(dto: TeacherClassDTO, index: number): AssignedCourse {
  return {
    id: dto.id,
    code: dto.course.code,
    name: dto.course.name,
    semester: dto.semester.name,
    room: dto.room ?? "Room TBC",
    capacity: dto.capacity,
    enrolled: dto._count.registrations,
    status: dto.status,
    accentClassName: COURSE_ACCENTS[index % COURSE_ACCENTS.length],
  };
}

// ─── Roster rows shared by attendance and grading ───────────────────────────

export interface RosterRow {
  id: string;
  studentId: string;
  studentNumber: string;
  name: string;
  initials: string;
  avatarColorClassName: string;
}

export function rosterRowOf(student: {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
}): Omit<RosterRow, "id"> {
  return {
    studentId: student.id,
    studentNumber: student.studentNumber,
    name: fullName(student.firstName, student.lastName),
    initials: initialsOf(student.firstName, student.lastName),
    avatarColorClassName: avatarColor(student.id),
  };
}

// ─── Status tones ───────────────────────────────────────────────────────────

export const attendanceTone: Record<AttendanceStatusDTO, StatusTone> = {
  PRESENT: "green",
  LATE: "amber",
  ABSENT: "rose",
  EXCUSED: "sky",
};

export const ATTENDANCE_OPTIONS: AttendanceStatusDTO[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
];

export const courseworkTone: Record<CourseworkGradeStatusDTO, StatusTone> = {
  DRAFT: "amber",
  SUBMITTED: "green",
};

export const examPaperTone: Record<ExamPaperStatusDTO, StatusTone> = {
  DRAFT: "amber",
  SUBMITTED: "sky",
  RECEIVED: "green",
};
