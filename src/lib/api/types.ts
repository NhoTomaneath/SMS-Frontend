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

// ─── Shared lookups (readable by Academic Affairs) ──────────────────────────

/** `GET /student-affairs/departments`. */
export interface DepartmentDTO {
  id: string;
  name: string;
  createdAt: string;
}

/** `GET /student-affairs/academic-years`. */
export interface AcademicYearDTO {
  id: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
}

// ─── Academic Affairs: curriculum ───────────────────────────────────────────

export interface ProgramDTO {
  id: string;
  name: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string };
}

export interface ProgramAcademicYearDTO {
  id: string;
  programId: string;
  academicYearId: string;
  createdAt: string;
  academicYear: {
    id: string;
    yearLabel: string;
    startDate: string;
    endDate: string;
  };
}

export interface MajorDTO {
  id: string;
  name: string;
  programId: string;
  createdAt: string;
  updatedAt: string;
  program: { id: string; name: string };
}

export interface SemesterDTO {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationOpen: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: { id: string; yearLabel: string };
}

export interface CreateProgramBody {
  name: string;
  departmentId: string;
}

export interface CreateMajorBody {
  name: string;
  programId: string;
}

export interface CreateSemesterBody {
  academicYearId: string;
  name: string;
  /** YYYY-MM-DD. */
  startDate: string;
  /** YYYY-MM-DD. */
  endDate: string;
  registrationOpen?: boolean;
}

// ─── Academic Affairs: scheduling ───────────────────────────────────────────

export type ClassStatusDTO = "SCHEDULED" | "ONGOING" | "COMPLETED";
export type RegistrationStatusDTO = "REGISTERED" | "DROPPED";

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type DayOfWeekDTO = (typeof DAYS_OF_WEEK)[number];

export interface CourseDTO {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string };
}

export interface ClassDTO {
  id: string;
  courseId: string;
  semesterId: string;
  teacherId: string;
  room: string | null;
  capacity: number;
  /** Students currently holding a REGISTERED seat. */
  enrolledCount: number;
  status: ClassStatusDTO;
  createdAt: string;
  updatedAt: string;
  course: { id: string; code: string; name: string };
  semester: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
}

export interface CourseRegistrationDTO {
  id: string;
  studentId: string;
  classId: string;
  semesterId: string;
  status: RegistrationStatusDTO;
  registeredAt: string;
  droppedAt: string | null;
  class: { id: string; course: { id: string; code: string; name: string } };
  semester: { id: string; name: string };
}

/** `GET /academic-affairs/teachers` — the class-creation teacher picker. */
export interface TeacherOptionDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
}

/** `GET /academic-affairs/timetables` — entries widened with class context. */
export interface TimetableEntryDTO {
  id: string;
  classId: string;
  dayOfWeek: DayOfWeekDTO;
  /** Full ISO timestamp on 1970-01-01; only the time part is meaningful. */
  startTime: string;
  endTime: string;
  room: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    semesterId: string;
    capacity: number;
    course: { id: string; code: string; name: string };
    teacher: { id: string; firstName: string; lastName: string };
  };
}

/** `GET /academic-affairs/schedule-conflicts`. */
export interface ScheduleConflictDTO {
  kind: "ROOM" | "TEACHER";
  dayOfWeek: DayOfWeekDTO;
  description: string;
  entries: [TimetableEntryDTO, TimetableEntryDTO];
}

/** `GET /academic-affairs/summary`. */
export interface AcademicSummaryDTO {
  semesterId: string | null;
  totalEnrolledStudents: number;
  totalCourses: number;
  totalClasses: number;
  registrationOpen: boolean;
  scheduleCoverage: { total: number; scheduled: number; percent: number };
  publishing: { total: number; published: number; percent: number };
  roomUtilization: Array<{ room: string; slots: number; percent: number }>;
  conflictCount: number;
}

export interface CreateCourseBody {
  code: string;
  name: string;
  departmentId: string;
  credits: number;
}

export interface CreateClassBody {
  courseId: string;
  semesterId: string;
  teacherId: string;
  room?: string;
  capacity: number;
}

export interface CreateTimetableBody {
  dayOfWeek: DayOfWeekDTO;
  /** HH:mm. */
  startTime: string;
  /** HH:mm. */
  endTime: string;
  room?: string;
}

/** `POST /academic-affairs/courses/import` — send exactly one of the two. */
export interface ImportCoursesBody {
  courses?: CreateCourseBody[];
  csv?: string;
}

export interface CourseImportResultDTO {
  createdCount: number;
  failedCount: number;
  created: CourseDTO[];
  errors: Array<{ row: number; message: string }>;
}

// ─── Student Affairs ────────────────────────────────────────────────────────

export type StudentStatusDTO =
  | "PENDING"
  | "ENROLLED"
  | "GRADUATED"
  | "WITHDRAWN"
  | "ON_LEAVE";

export type GenderDTO = "MALE" | "FEMALE" | "OTHER";

export type BloodGroupDTO =
  | "A_POS" | "A_NEG" | "B_POS" | "B_NEG"
  | "AB_POS" | "AB_NEG" | "O_POS" | "O_NEG";

export interface StudentDTO {
  id: string;
  userId: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: GenderDTO | null;
  guardianName: string | null;
  guardianContact: string | null;
  contactDetails: string | null;
  personalEmail: string | null;
  bloodGroup: BloodGroupDTO | null;
  enrollmentDate: string;
  status: StudentStatusDTO;
  departmentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string } | null;
}

/** `GET /student-affairs/students/summary`. */
export interface StudentSummaryDTO {
  total: number;
  byStatus: Record<StudentStatusDTO, number>;
  currentAcademicYear: { id: string; yearLabel: string } | null;
}

export interface CreateStudentBody {
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: GenderDTO;
  guardianName?: string;
  guardianContact?: string;
  contactDetails?: string;
  personalEmail?: string;
  bloodGroup?: BloodGroupDTO;
  enrollmentDate?: string;
  status?: StudentStatusDTO;
  departmentId?: string;
}

export interface StudentImportResultDTO {
  createdCount: number;
  failedCount: number;
  created: StudentDTO[];
  errors: Array<{ row: number; message: string }>;
}

export interface EnrollmentReportDTO {
  id: string;
  generatedById: string;
  academicYearId: string;
  departmentId: string | null;
  totalNewStudents: number;
  totalActiveStudents: number;
  fileUrl: string | null;
  sentToPrincipal: boolean;
  generatedAt: string;
  academicYear: { id: string; yearLabel: string };
  department: { id: string; name: string } | null;
}

// ─── Teacher ────────────────────────────────────────────────────────────────

export type AttendanceStatusDTO = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type CourseworkGradeStatusDTO = "DRAFT" | "SUBMITTED";
export type ExamTypeDTO = "MIDTERM" | "FINAL";
export type ExamStatusDTO = "CREATED" | "SCHEDULED" | "PUBLISHED" | "COMPLETED";
export type ExamPaperStatusDTO = "DRAFT" | "SUBMITTED" | "RECEIVED";

/** Student identity embedded in teacher/COE roster rows. */
export interface RosterStudentDTO {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
}

/** A class as the teacher workspace sees it — registrations counted, not listed. */
export interface TeacherClassDTO {
  id: string;
  courseId: string;
  semesterId: string;
  teacherId: string;
  room: string | null;
  capacity: number;
  status: ClassStatusDTO;
  createdAt: string;
  updatedAt: string;
  course: { id: string; code: string; name: string };
  semester: { id: string; name: string };
  _count: { registrations: number };
}

export interface TeacherScheduleEntryDTO {
  id: string;
  classId: string;
  dayOfWeek: DayOfWeekDTO;
  startTime: string;
  endTime: string;
  room: string | null;
  class: {
    id: string;
    room: string | null;
    status: ClassStatusDTO;
    course: { id: string; code: string; name: string };
    _count: { registrations: number };
  };
}

/** `GET /teacher/me/dashboard`. */
export interface TeacherDashboardDTO {
  classes: TeacherClassDTO[];
  schedule: TeacherScheduleEntryDTO[];
}

export interface AttendanceDTO {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatusDTO;
  recordedById: string;
  recordedAt: string;
  student: RosterStudentDTO;
}

export interface AssignmentDTO {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDTO {
  id: string;
  assignmentId: string;
  studentId: string;
  score: number | null;
  submittedAt: string;
  gradedById: string | null;
  gradedAt: string | null;
  student: RosterStudentDTO;
}

export interface CourseworkGradeDTO {
  id: string;
  studentId: string;
  classId: string;
  courseworkScore: number;
  status: CourseworkGradeStatusDTO;
  submittedById: string;
  submittedAt: string;
  updatedAt: string;
  student: RosterStudentDTO;
}

export interface TeacherExamPaperDTO {
  id: string;
  examId: string;
  teacherId: string;
  fileUrl: string;
  status: ExamPaperStatusDTO;
  submittedAt: string | null;
  receivedById: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  exam: { id: string; examType: ExamTypeDTO; examDate: string; classId: string };
}

export interface CreateAssignmentBody {
  title: string;
  description?: string;
  maxScore: number;
  /** ISO date-time. */
  dueDate: string;
}

// ─── Controller of Examination ──────────────────────────────────────────────

export interface ExamDTO {
  id: string;
  classId: string;
  semesterId: string;
  examType: ExamTypeDTO;
  examDate: string;
  startTime: string;
  endTime: string;
  status: ExamStatusDTO;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  class: { id: string; course: { id: string; code: string; name: string } };
  semester: { id: string; name: string };
}

export interface ExamRoomDTO {
  id: string;
  name: string;
  location: string;
  capacity: number;
  createdAt: string;
}

export interface ExamRoomAssignmentDTO {
  id: string;
  examId: string;
  examRoomId: string;
  assignedById: string;
  assignedAt: string;
  examRoom: { id: string; name: string; location: string; capacity: number };
}

export interface InvigilatorDTO {
  id: string;
  examId: string;
  teacherId: string;
  assignedById: string;
  assignedAt: string;
  teacher: { id: string; firstName: string; lastName: string; email: string };
}

/** COE's view of an exam paper — carries the submitting teacher. */
export interface CoeExamPaperDTO extends TeacherExamPaperDTO {
  teacher: { id: string; firstName: string; lastName: string; email: string };
}

export type FinalGradeStatusDTO = "PENDING" | "RECEIVED" | "APPROVED" | "PUBLISHED";
export type TranscriptStatusDTO = "REQUESTED" | "GENERATED";
export type GraduationRecordStatusDTO = "ELIGIBLE" | "GRADUATED" | "NOT_ELIGIBLE";

export interface ExamScoreDTO {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  correctedById: string;
  correctedAt: string;
  submittedAt: string;
  student: RosterStudentDTO;
}

export interface FinalGradeDTO {
  id: string;
  studentId: string;
  classId: string;
  courseworkScore: number;
  examScore: number;
  finalScore: number;
  letterGrade: string;
  gpaPoints: number;
  status: FinalGradeStatusDTO;
  approvedById: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  student: RosterStudentDTO;
}

export interface TranscriptDTO {
  id: string;
  studentId: string;
  requestedAt: string;
  generatedById: string | null;
  generatedAt: string | null;
  fileUrl: string | null;
  status: TranscriptStatusDTO;
  student: RosterStudentDTO;
}

export interface GraduationReportDTO {
  id: string;
  generatedById: string;
  academicYearId: string;
  fileUrl: string | null;
  sentToPrincipal: boolean;
  generatedAt: string;
  academicYear: { id: string; yearLabel: string };
}

export interface GraduationRecordDTO {
  id: string;
  studentId: string;
  graduationReportId: string | null;
  status: GraduationRecordStatusDTO;
  graduationDate: string | null;
  createdAt: string;
  student: RosterStudentDTO;
}

// ─── Student portal ─────────────────────────────────────────────────────────

export interface StudentProfileDTO {
  id: string;
  userId: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: GenderDTO | null;
  guardianName: string | null;
  guardianContact: string | null;
  contactDetails: string | null;
  personalEmail: string | null;
  bloodGroup: BloodGroupDTO | null;
  enrollmentDate: string;
  status: StudentStatusDTO;
  department: { id: string; name: string } | null;
}

export interface OwnTimetableEntryDTO {
  id: string;
  classId: string;
  dayOfWeek: DayOfWeekDTO;
  startTime: string;
  endTime: string;
  room: string | null;
  class: { id: string; course: { id: string; code: string; name: string } };
}

export interface OwnExamDTO {
  id: string;
  classId: string;
  examType: ExamTypeDTO;
  examDate: string;
  startTime: string;
  endTime: string;
  status: ExamStatusDTO;
  class: { id: string; course: { id: string; code: string; name: string } };
  roomAssignments: Array<{
    examRoom: { id: string; name: string; location: string };
  }>;
}

export interface OwnResultDTO {
  id: string;
  classId: string;
  courseworkScore: number;
  examScore: number;
  finalScore: number;
  letterGrade: string;
  gpaPoints: number;
  status: FinalGradeStatusDTO;
  publishedAt: string | null;
  class: { id: string; course: { id: string; code: string; name: string } };
}

export interface OwnGraduationStatusDTO {
  id: string;
  status: GraduationRecordStatusDTO;
  graduationDate: string | null;
  createdAt: string;
  graduationReportId: string | null;
}

/** `GET /student/me/attendance-summary`. */
export interface OwnAttendanceSummaryDTO {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  /** Present + late, as a percentage of total, to one decimal place. */
  percent: number;
  label: "Excellent" | "On Track" | "At Risk";
}

/** `GET /student/me/academic-standing`. */
export interface OwnAcademicStandingDTO {
  cumulativeGpa: number | null;
  completedCourses: number;
  semesterCount: number;
  yearLevel: "FR" | "SO" | "JR" | "SR";
}

export type OwnAssignmentStatusDTO =
  | "URGENT"
  | "IN_PROGRESS"
  | "UPCOMING"
  | "SUBMITTED"
  | "GRADED"
  | "OVERDUE";

/** `GET /student/me/assignments`. */
export interface OwnAssignmentDTO {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string;
  class: { id: string; course: { id: string; code: string; name: string } };
  submission: {
    id: string;
    score: number | null;
    submittedAt: string;
    gradedAt: string | null;
  } | null;
  status: OwnAssignmentStatusDTO;
}

/** `GET /student/me/dashboard`. */
export interface StudentDashboardDTO {
  profile: StudentProfileDTO;
  attendance: OwnAttendanceSummaryDTO;
  /** The five soonest assignments; the full list is at /student/me/assignments. */
  assignments: OwnAssignmentDTO[];
  academicStanding: OwnAcademicStandingDTO;
  timetable: OwnTimetableEntryDTO[];
}

// ─── Principal ──────────────────────────────────────────────────────────────

export interface EnrollmentAnalyticsDTO {
  academicYearId: string | null;
  totalStudents: number;
  byStatus: Array<{ status: string; count: number }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
  }>;
  newEnrollments: number | null;
}

export interface AcademicPerformanceDTO {
  academicYearId: string;
  totalGradedStudents: number;
  avgFinalScore: number | null;
  avgGpa: number | null;
  passRate: number | null;
  gradeDistribution: Array<{ letterGrade: string; count: number }>;
}

export interface FacultyPerformanceDTO {
  academicYearId: string;
  teachers: Array<{
    teacherId: string;
    firstName: string;
    lastName: string;
    classCount: number;
    studentCount: number;
    avgFinalScore: number | null;
  }>;
  overallFacultyPerformance: number | null;
}

export interface GraduationAnalyticsDTO {
  academicYearId: string;
  eligible: number;
  graduated: number;
  notEligible: number;
  totalEvaluated: number;
  graduationRate: number | null;
}

export type PerformanceMetricNameDTO =
  | "AVG_GPA"
  | "PASS_RATE"
  | "ENROLLMENT_GROWTH"
  | "FACULTY_PERFORMANCE";

export interface PerformanceDashboardDTO {
  id: string;
  academicYearId: string;
  metricName: PerformanceMetricNameDTO;
  metricValue: number;
  generatedAt: string;
  academicYear: { id: string; yearLabel: string };
}

export interface FacultyProfileDTO {
  id: string;
  userId: string;
  departmentName: string;
  publicationIndex: number;
  studentRating: number;
  performanceLabel: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: BackendRole;
  };
}

/**
 * `GET /principal/institutional-metrics`.
 *
 * Returns a single record when `academicYearId` is supplied (404 if none
 * exists for that year) and an array of every year's record when it is not.
 */
export interface InstitutionalMetricDTO {
  id: string;
  academicYearId: string;
  researchFundingUsd: number;
  averageInstitutionalGpa: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  academicYear: { id: string; yearLabel: string };
}

// ─── Student documents ──────────────────────────────────────────────────────

export type DocumentTypeDTO = "ID_CARD" | "TRANSCRIPT" | "CERTIFICATE" | "OTHER";

/** `GET|POST /student-affairs/students/:studentId/documents`. */
export interface StudentDocumentDTO {
  id: string;
  studentId: string;
  documentType: DocumentTypeDTO;
  fileUrl: string;
  uploadedById: string;
  uploadedAt: string;
}

// ─── Academic Affairs lookups (writable) ────────────────────────────────────

/** `GET /academic-affairs/departments` — richer than the read-only SAO copy. */
export interface DepartmentDetailDTO {
  id: string;
  name: string;
  createdAt: string;
  /** Rows that would block a delete. */
  _count: { students: number; programs: number; courses: number };
}

/** `GET /academic-affairs/academic-years`. */
export interface AcademicYearDetailDTO {
  id: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  _count: { semesters: number; programAcademicYears: number };
}

// ─── Timetable generation & deadlines ───────────────────────────────────────

/** `POST /academic-affairs/timetables/generate`. */
export interface TimetableGenerationResultDTO {
  semesterId: string;
  scheduled: number;
  skipped: Array<{ classId: string; courseCode: string; reason: string }>;
  entries: TimetableEntryDTO[];
}

export type DeadlineKindDTO =
  | "REGISTRATION_CLOSE"
  | "SEMESTER_END"
  | "ASSIGNMENT_DUE"
  | "EXAM";

/** `GET /academic-affairs/deadlines` — derived from live records, not stored. */
export interface DeadlineDTO {
  id: string;
  kind: DeadlineKindDTO;
  title: string;
  description: string;
  date: string;
  daysAway: number;
}
