export interface ExamItem {
  id: string;
  classId: string;
  semesterId: string;
  examType: "MIDTERM" | "FINAL" | "QUIZ";
  examDate: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  class?: {
    id: string;
    course: { id: string; code: string; name: string };
  };
}

export interface ExamPaperItem {
  id: string;
  examId: string;
  teacherId: string;
  fileUrl: string;
  status: "DRAFT" | "SUBMITTED" | "RECEIVED";
  submittedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  exam?: {
    id: string;
    examType: string;
    examDate: string;
    classId: string;
  };
}

export interface ExamScoreItem {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  submittedAt: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface FinalGradeItem {
  id: string;
  studentId: string;
  classId: string;
  courseworkScore: number;
  examScore: number;
  finalScore: number;
  letterGrade: string;
  gpaPoints: number;
  status: "DRAFT" | "APPROVED" | "PUBLISHED";
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface AnnouncementItem {
  id: string;
  authorId: string;
  title: string;
  body: string;
  audience: "ALL_STUDENTS" | "CLASS";
  classId: string | null;
  createdAt: string;
}
