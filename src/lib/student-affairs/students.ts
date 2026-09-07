/** View models for the Student Affairs portal. */

import type {
  EnrollmentReportDTO,
  StudentDTO,
  StudentStatusDTO,
} from "@/lib/api/types";
import type { StatusTone } from "@/components/status-badge";
import {
  avatarColor,
  formatDate,
  formatRelative,
  fullName,
  initialsOf,
  titleCase,
} from "@/lib/format";

// ─── Students ───────────────────────────────────────────────────────────────

export interface StudentRecord {
  id: string;
  name: string;
  initials: string;
  avatarColorClassName: string;
  email: string;
  studentNumber: string;
  department: string;
  status: StudentStatusDTO;
  statusLabel: string;
  enrolledOn: string;
  hasAccount: boolean;
}

export function fromApiStudent(dto: StudentDTO): StudentRecord {
  return {
    id: dto.id,
    name: fullName(dto.firstName, dto.lastName),
    initials: initialsOf(dto.firstName, dto.lastName),
    avatarColorClassName: avatarColor(dto.id),
    email: dto.personalEmail ?? "—",
    studentNumber: dto.studentNumber,
    department: dto.department?.name ?? "Unassigned",
    status: dto.status,
    statusLabel: titleCase(dto.status),
    enrolledOn: formatDate(dto.enrollmentDate),
    hasAccount: Boolean(dto.userId),
  };
}

export const STUDENT_STATUSES: StudentStatusDTO[] = [
  "PENDING",
  "ENROLLED",
  "GRADUATED",
  "WITHDRAWN",
  "ON_LEAVE",
];

export const STUDENT_STATUS_OPTIONS = STUDENT_STATUSES.map((value) => ({
  value,
  label: titleCase(value),
}));

export const studentStatusTone: Record<StudentStatusDTO, StatusTone> = {
  ENROLLED: "green",
  PENDING: "amber",
  GRADUATED: "sky",
  WITHDRAWN: "rose",
  ON_LEAVE: "amber",
};

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

export const BLOOD_GROUP_OPTIONS = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A−" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B−" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB−" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O−" },
] as const;

// ─── Enrollment reports ─────────────────────────────────────────────────────

export interface EnrollmentReportRow {
  id: string;
  title: string;
  academicYear: string;
  department: string;
  totalNewStudents: number;
  totalActiveStudents: number;
  sent: boolean;
  statusLabel: "Delivered" | "Draft";
  generatedAt: string;
  generatedRelative: string;
  fileUrl: string | null;
}

export function fromApiEnrollmentReport(dto: EnrollmentReportDTO): EnrollmentReportRow {
  const scope = dto.department?.name ?? "All departments";
  return {
    id: dto.id,
    title: `${scope} — ${dto.academicYear.yearLabel}`,
    academicYear: dto.academicYear.yearLabel,
    department: scope,
    totalNewStudents: dto.totalNewStudents,
    totalActiveStudents: dto.totalActiveStudents,
    sent: dto.sentToPrincipal,
    statusLabel: dto.sentToPrincipal ? "Delivered" : "Draft",
    generatedAt: formatDate(dto.generatedAt),
    generatedRelative: formatRelative(dto.generatedAt),
    fileUrl: dto.fileUrl,
  };
}
