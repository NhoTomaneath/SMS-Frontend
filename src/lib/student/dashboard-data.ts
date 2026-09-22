/** View models for the Student self-service portal. */

import type { StatusTone } from "@/components/status-badge";
import type {
  DayOfWeekDTO,
  ExamStatusDTO,
  FinalGradeStatusDTO,
  GraduationRecordStatusDTO,
  OwnAssignmentDTO,
  OwnAssignmentStatusDTO,
  OwnAssignmentSubmissionDTO,
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

/** "08:00" → 8, "13:30" → 13.5. */
export function hoursOf(clock: string): number {
  const [h = "0", m = "0"] = clock.split(":");
  return Number(h) + Number(m) / 60;
}

/** Same course, same tint — on every day of the week grid. Full class names so Tailwind keeps them. */
const COURSE_TINTS = [
  "border-rose-500 bg-rose-50 text-rose-900",
  "border-sky-500 bg-sky-50 text-sky-900",
  "border-emerald-500 bg-emerald-50 text-emerald-900",
  "border-amber-500 bg-amber-50 text-amber-900",
  "border-violet-500 bg-violet-50 text-violet-900",
  "border-teal-500 bg-teal-50 text-teal-900",
];

export function courseTint(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) | 0;
  return COURSE_TINTS[Math.abs(hash) % COURSE_TINTS.length] as string;
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

/** What the backend's FR/SO/JR/SR year codes are called on screen, everywhere. */
export const YEAR_LABEL: Record<string, string> = {
  FR: "Freshman",
  SO: "Sophomore",
  JR: "Junior",
  SR: "Senior",
};

// ─── Coursework ─────────────────────────────────────────────────────────────

export interface CourseworkItem {
  id: string;
  title: string;
  description: string | null;
  courseLabel: string;
  dueLabel: string;
  dueIso: string;
  maxScore: number;
  score: number | null;
  status: OwnAssignmentStatusDTO;
  submission: OwnAssignmentSubmissionDTO | null;
}

export function fromApiOwnAssignment(dto: OwnAssignmentDTO): CourseworkItem {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    courseLabel: `${dto.class.course.code} — ${dto.class.course.name}`,
    dueLabel: formatDate(dto.dueDate),
    dueIso: dto.dueDate,
    maxScore: dto.maxScore,
    score: dto.submission?.score ?? null,
    status: dto.status,
    submission: dto.submission,
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
  /** Whole days from today to the exam (0 = today, negative = already held). */
  daysAway: number;
  time: string;
  rooms: string;
  status: ExamStatusDTO;
  /** File-submission exam flow: the finalized paper to download, once CoE has received it. */
  examPaperUrl: string | null;
  /** This student's own uploaded answer, if they have submitted one. */
  mySubmission: { fileUrl: string; submittedAt: string } | null;
  /** The real submission deadline (exam date + end time), for an open/closed check. */
  submissionDeadline: Date;
}

/**
 * Calendar days from today to an exam date. Compares plain dates (year, month,
 * day) so the viewer's timezone and the exam's time of day cannot shift it.
 */
export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(iso);
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((t - today) / 86400000);
}

export function countdownLabel(daysAway: number): string {
  if (daysAway < 0) return "Held";
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}

export function fromApiOwnExam(dto: OwnExamDTO): OwnExamRow {
  const deadline = new Date(dto.examDate);
  const endTime = new Date(dto.endTime);
  deadline.setUTCHours(endTime.getUTCHours(), endTime.getUTCMinutes(), endTime.getUTCSeconds(), 0);

  return {
    id: dto.id,
    code: dto.class.course.code,
    subject: dto.class.course.name,
    examType: dto.examType === "MIDTERM" ? "Midterm" : "Final",
    date: formatDate(dto.examDate),
    daysAway: daysUntil(dto.examDate),
    time: timeRange(dto.startTime, dto.endTime),
    rooms:
      dto.roomAssignments.map((r) => r.examRoom.name).join(", ") || "Room TBC",
    status: dto.status,
    examPaperUrl: dto.examPapers[0]?.fileUrl ?? null,
    mySubmission: dto.submissions[0] ?? null,
    submissionDeadline: deadline,
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
