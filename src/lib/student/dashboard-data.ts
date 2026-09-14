/** View models for the Student self-service portal. */

import type { StatusTone } from "@/components/status-badge";
import type {
  DayOfWeekDTO,
  ExamStatusDTO,
  FinalGradeStatusDTO,
  GraduationRecordStatusDTO,
  OwnAssignmentDTO,
  OwnAssignmentStatusDTO,
  OwnExamDTO,
  OwnResultDTO,
  OwnTimetableEntryDTO,
  TranscriptStatusDTO,
} from "@/lib/api/types";
import { clockTime, formatDate, timeRange } from "@/lib/format";

// ─── Timetable ──────────────────────────────────────────────────────────────

export const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const satisfies readonly DayOfWeekDTO[];

export interface OwnClassSlot {
  id: string;
  day: DayOfWeekDTO;
  startTime: string;
  endTime: string;
  code: string;
  name: string;
  room: string;
}

export function fromApiOwnTimetable(dto: OwnTimetableEntryDTO): OwnClassSlot {
  return {
    id: dto.id,
    day: dto.dayOfWeek,
    startTime: clockTime(dto.startTime),
    endTime: clockTime(dto.endTime),
    code: dto.class.course.code,
    name: dto.class.course.name,
    room: dto.room ?? "Room TBC",
  };
}

/** Maps a JS weekday index onto the backend enum. */
export function todayName(date = new Date()): DayOfWeekDTO {
  const names: DayOfWeekDTO[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return names[date.getDay()] as DayOfWeekDTO;
}

// ─── Coursework ─────────────────────────────────────────────────────────────

export interface CourseworkItem {
  id: string;
  title: string;
  courseLabel: string;
  dueLabel: string;
  maxScore: number;
  score: number | null;
  status: OwnAssignmentStatusDTO;
}

export function fromApiOwnAssignment(dto: OwnAssignmentDTO): CourseworkItem {
  return {
    id: dto.id,
    title: dto.title,
    courseLabel: `${dto.class.course.code} — ${dto.class.course.name}`,
    dueLabel: formatDate(dto.dueDate),
    maxScore: dto.maxScore,
    score: dto.submission?.score ?? null,
    status: dto.status,
  };
}

export const courseworkTone: Record<OwnAssignmentStatusDTO, StatusTone> = {
  URGENT: "rose",
  OVERDUE: "rose",
  IN_PROGRESS: "amber",
  UPCOMING: "sky",
  SUBMITTED: "sky",
  GRADED: "green",
};

export const courseworkLabel: Record<OwnAssignmentStatusDTO, string> = {
  URGENT: "Urgent",
  OVERDUE: "Overdue",
  IN_PROGRESS: "In Progress",
  UPCOMING: "Upcoming",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
};

// ─── Exams & results ────────────────────────────────────────────────────────

export interface OwnExamRow {
  id: string;
  code: string;
  subject: string;
  examType: string;
  date: string;
  time: string;
  rooms: string;
  status: ExamStatusDTO;
}

export function fromApiOwnExam(dto: OwnExamDTO): OwnExamRow {
  return {
    id: dto.id,
    code: dto.class.course.code,
    subject: dto.class.course.name,
    examType: dto.examType === "MIDTERM" ? "Midterm" : "Final",
    date: formatDate(dto.examDate),
    time: timeRange(dto.startTime, dto.endTime),
    rooms:
      dto.roomAssignments.map((r) => r.examRoom.name).join(", ") || "Room TBC",
    status: dto.status,
  };
}

export const examTone: Record<ExamStatusDTO, StatusTone> = {
  CREATED: "amber",
  SCHEDULED: "sky",
  PUBLISHED: "green",
  COMPLETED: "rose",
};

export interface OwnResultRow {
  id: string;
  code: string;
  subject: string;
  coursework: number;
  exam: number;
  finalScore: number;
  letterGrade: string;
  gpaPoints: number;
  status: FinalGradeStatusDTO;
  publishedAt: string;
}

export function fromApiOwnResult(dto: OwnResultDTO): OwnResultRow {
  return {
    id: dto.id,
    code: dto.class.course.code,
    subject: dto.class.course.name,
    coursework: dto.courseworkScore,
    exam: dto.examScore,
    finalScore: dto.finalScore,
    letterGrade: dto.letterGrade,
    gpaPoints: dto.gpaPoints,
    status: dto.status,
    publishedAt: formatDate(dto.publishedAt, "Not published"),
  };
}

/**
 * Buckets published grades into the four bands the results chart draws.
 * Only published results count — anything else is not the student's to see yet.
 */
export function gradeDistributionOf(results: OwnResultRow[]) {
  const published = results.filter((r) => r.status === "PUBLISHED");
  const bands = [
    { id: "a", label: "A / A− (Distinction)", min: 3.7, colorClassName: "bg-rose-900" },
    { id: "b", label: "B− to B+ (Merit)", min: 2.7, colorClassName: "bg-red-500" },
    { id: "c", label: "C to C+ (Pass)", min: 2.0, colorClassName: "bg-teal-700" },
    { id: "d", label: "D / F (Incomplete)", min: 0, colorClassName: "bg-stone-700" },
  ];

  return bands.map((band, index) => {
    const upper = index === 0 ? Infinity : (bands[index - 1]?.min ?? Infinity);
    const count = published.filter(
      (r) => r.gpaPoints >= band.min && r.gpaPoints < upper,
    ).length;
    return {
      ...band,
      count,
      percent: published.length === 0 ? 0 : Math.round((count / published.length) * 100),
    };
  });
}

// ─── Graduation ─────────────────────────────────────────────────────────────

export const graduationTone: Record<GraduationRecordStatusDTO, StatusTone> = {
  ELIGIBLE: "sky",
  GRADUATED: "green",
  NOT_ELIGIBLE: "rose",
};

export const transcriptTone: Record<TranscriptStatusDTO, StatusTone> = {
  REQUESTED: "amber",
  GENERATED: "green",
};
