/**
 * Wire types for the SMS-Backend REST API.
 *
 * These are hand-written for the Admin slice. Once the backend's OpenAPI spec
 * (served at /docs.json) is stable, this file can be replaced by generated types.
 */

// ─── Response envelope ──────────────────────────────────────────────────────

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
}

/** Success shape: `{ success: true, data, message?, pagination? }`. */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  pagination?: ApiPagination;
}

/** Error shape: `{ success: false, message, errors? }` (zod fieldErrors). */
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  pagination: ApiPagination;
}

// ─── Roles ─────────────────────────────────────────────────────────────────

export const ROLES = [
  "STUDENT_AFFAIRS",
  "ACADEMIC_AFFAIRS",
  "TEACHER",
  "CONTROLLER_OF_EXAMINATION",
  "STUDENT",
  "PRINCIPAL",
  "ADMIN",
] as const;

export type BackendRole = (typeof ROLES)[number];

// ─── Auth / current user ───────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
}

export interface MeDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: BackendRole;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin: accounts (list = GET /users -> SafeUser) ────────────────────────

/** Row shape from `GET /users`. `POST /admin/accounts` returns the same minus
 *  `lastLoginAt`, which the page ignores (it refetches the list). */
export interface AccountDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: BackendRole;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: BackendRole;
}

export interface UpdateAccountStatusBody {
  isActive: boolean;
}

/** `GET /users` query params (user.validation.ts paginationSchema). */
export interface UsersQuery {
  page?: number;
  limit?: number;
  role?: BackendRole;
  status?: "VERIFIED" | "UNVERIFIED";
  accountStatus?: "ACTIVE" | "DEACTIVATED";
  search?: string;
}

// ─── Admin: audit log ──────────────────────────────────────────────────────

export type AuditActionDTO = "CREATE" | "UPDATE" | "PUBLISH" | "APPROVE" | "DELETE";
export type AuditModuleDTO =
  | "STUDENT_AFFAIRS"
  | "ACADEMIC_AFFAIRS"
  | "TEACHER"
  | "EXAM"
  | "ADMIN";

export interface AuditLogDTO {
  id: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  action: AuditActionDTO;
  module: AuditModuleDTO;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
}

// ─── Student Affairs ────────────────────────────────────────────────────────

export type StudentStatus =
  | "PENDING"
  | "ENROLLED"
  | "GRADUATED"
  | "WITHDRAWN"
  | "ON_LEAVE";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type BloodGroup =
  | "A_POS"
  | "A_NEG"
  | "B_POS"
  | "B_NEG"
  | "AB_POS"
  | "AB_NEG"
  | "O_POS"
  | "O_NEG";

export type DocumentType = "ID_CARD" | "TRANSCRIPT" | "CERTIFICATE" | "OTHER";

export interface DepartmentDTO {
  id: string;
  name: string;
  createdAt?: string;
}

export interface AcademicYearDTO {
  id: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
}

export interface StudentDTO {
  id: string;
  userId?: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  guardianName?: string | null;
  guardianContact?: string | null;
  contactDetails?: string | null;
  personalEmail?: string | null;
  bloodGroup?: BloodGroup | null;
  enrollmentDate?: string | null;
  status: StudentStatus;
  departmentId?: string | null;
  department?: DepartmentDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSummaryDTO {
  total: number;
  byStatus: Record<StudentStatus, number>;
  currentAcademicYear: { id: string; yearLabel: string } | null;
}

export interface StudentDocumentDTO {
  id: string;
  studentId: string;
  documentType: DocumentType;
  fileUrl: string;
  uploadedAt: string;
}

export interface CreateStudentBody {
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  guardianName?: string;
  guardianContact?: string;
  contactDetails?: string;
  personalEmail?: string;
  bloodGroup?: BloodGroup;
  enrollmentDate?: string;
  status?: StudentStatus;
  departmentId?: string;
}

export interface UpdateStudentBody {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  guardianName?: string;
  guardianContact?: string;
  contactDetails?: string;
  personalEmail?: string;
  bloodGroup?: BloodGroup | null;
  departmentId?: string;
}

export interface ImportStudentsBody {
  students?: CreateStudentBody[];
  csv?: string;
}

export interface ImportStudentsResultDTO {
  createdCount: number;
  failedCount: number;
  created: StudentDTO[];
  errors: Array<{ row: number; message: string }>;
}

export interface EnrollmentReportDTO {
  id: string;
  academicYearId: string;
  academicYear?: { id: string; yearLabel: string };
  departmentId?: string | null;
  department?: DepartmentDTO | null;
  totalActiveStudents: number;
  totalNewStudents: number;
  sentToPrincipal: boolean;
  fileUrl?: string | null;
  generatedAt: string;
}

export interface GenerateReportBody {
  academicYearId: string;
  departmentId?: string;
  fileUrl?: string;
}

export interface AddStudentDocumentBody {
  documentType: DocumentType;
  fileUrl: string;
}

export interface LinkStudentAccountBody {
  userId: string;
}

