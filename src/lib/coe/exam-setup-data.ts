/** View models for the Controller of Examination portal. */

import type { StatusTone } from "@/components/status-badge";
import type {
  ExamDTO,
  ExamPaperStatusDTO,
  ExamStatusDTO,
  FinalGradeDTO,
  FinalGradeStatusDTO,
  GraduationRecordStatusDTO,
  TranscriptStatusDTO,
} from "@/lib/api/types";
import { avatarColor, formatDate, fullName, initialsOf, timeRange } from "@/lib/format";

// ─── Exams ──────────────────────────────────────────────────────────────────

export interface ExamRow {
  id: string;
  classId: string;
  code: string;
  subject: string;
  examType: string;
  date: string;
  time: string;
  status: ExamStatusDTO;
  semester: string;
}

export function fromApiExam(dto: ExamDTO): ExamRow {
  return {
    id: dto.id,
    classId: dto.classId,
    code: dto.class.course.code,
    subject: dto.class.course.name,
    examType: dto.examType === "MIDTERM" ? "Midterm" : "Final",
    date: formatDate(dto.examDate),
    time: timeRange(dto.startTime, dto.endTime),
    status: dto.status,
    semester: dto.semester.name,
  };
}

export const examStatusTone: Record<ExamStatusDTO, StatusTone> = {
  CREATED: "amber",
  SCHEDULED: "sky",
  PUBLISHED: "green",
  COMPLETED: "rose",
};

export const EXAM_STATUS_FLOW: ExamStatusDTO[] = [
  "CREATED",
  "SCHEDULED",
  "PUBLISHED",
  "COMPLETED",
];

export const EXAM_TYPE_OPTIONS = [
  { value: "MIDTERM", label: "Midterm" },
  { value: "FINAL", label: "Final" },
] as const;

export const examPaperTone: Record<ExamPaperStatusDTO, StatusTone> = {
  DRAFT: "amber",
  SUBMITTED: "sky",
  RECEIVED: "green",
};

// ─── Grading oversight ──────────────────────────────────────────────────────

export interface GradeRow {
  id: string;
  studentId: string;
  studentNumber: string;
  name: string;
  initials: string;
  avatarColorClassName: string;
  coursework: number;
  exam: number;
  finalScore: number;
  letterGrade: string;
  gpaPoints: number;
  status: FinalGradeStatusDTO;
}

export function fromApiFinalGrade(dto: FinalGradeDTO): GradeRow {
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentNumber: dto.student.studentNumber,
    name: fullName(dto.student.firstName, dto.student.lastName),
    initials: initialsOf(dto.student.firstName, dto.student.lastName),
    avatarColorClassName: avatarColor(dto.studentId),
    coursework: dto.courseworkScore,
    exam: dto.examScore,
    finalScore: dto.finalScore,
    letterGrade: dto.letterGrade,
    gpaPoints: dto.gpaPoints,
    status: dto.status,
  };
}

export const finalGradeTone: Record<FinalGradeStatusDTO, StatusTone> = {
  PENDING: "amber",
  RECEIVED: "sky",
  APPROVED: "rose",
  PUBLISHED: "green",
};

// ─── Transcripts & graduation ───────────────────────────────────────────────

export const transcriptTone: Record<TranscriptStatusDTO, StatusTone> = {
  REQUESTED: "amber",
  GENERATED: "green",
};

export const graduationTone: Record<GraduationRecordStatusDTO, StatusTone> = {
  ELIGIBLE: "sky",
  GRADUATED: "green",
  NOT_ELIGIBLE: "rose",
};

export const GRADUATION_STATUS_OPTIONS = [
  { value: "ELIGIBLE", label: "Eligible" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "NOT_ELIGIBLE", label: "Not Eligible" },
] as const;
