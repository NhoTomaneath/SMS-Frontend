export interface TeacherClass {
  id: string;
  courseId: string;
  semesterId: string;
  teacherId: string;
  room: string;
  capacity: number;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  course: { id: string; code: string; name: string };
  semester?: { id: string; name: string };
  _count?: { registrations: number };
}

export interface TimetableScheduleItem {
  id: string;
  classId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  class: {
    id: string;
    room: string;
    status: string;
    course: { id: string; code: string; name: string };
    _count?: { registrations: number };
  };
}

export interface StudentRegistration {
  id: string;
  studentId: string;
  classId: string;
  status: "REGISTERED" | "DROPPED";
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  recordedAt: string;
  student?: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface AssignmentItem {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string;
  createdAt: string;
}

export interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  score: number | null;
  submittedAt: string;
  gradedAt: string | null;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface CourseworkGradeItem {
  id: string;
  studentId: string;
  classId: string;
  courseworkScore: number;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: string | null;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}
