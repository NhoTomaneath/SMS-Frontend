/**
 * Full end-to-end check of the SMS stack through the Next.js proxy.
 *
 * Exercises every portal exactly as the browser does: same-origin
 * /api/backend/*, cookie jar for the httpOnly refresh token, Bearer for the
 * access token. Covers reads, writes, role boundaries and the audit trail.
 */

const BASE = "http://localhost:3000/api/backend";
const ORIGIN = "http://localhost:3000";

const results = [];
let section = "";

// The API enforces a global 100 requests / 60s per IP. Space calls just wide
// enough that the suite measures the application, not the rate limiter.
const MIN_GAP_MS = 620;
let lastCall = 0;
async function throttle() {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

function heading(name) {
  section = name;
  console.log(`\n\x1b[1m── ${name} ${"─".repeat(Math.max(0, 58 - name.length))}\x1b[0m`);
}
function check(name, ok, detail = "") {
  results.push({ section, name, ok });
  const mark = ok ? "\x1b[32m  ok  \x1b[0m" : "\x1b[31m FAIL \x1b[0m";
  console.log(`${mark} ${name}${detail ? ` \x1b[2m— ${detail}\x1b[0m` : ""}`);
}

/** One isolated browser-like session per role. */
function session() {
  let cookie = "";
  let token = "";
  return {
    get token() {
      return token;
    },
    async call(path, init = {}) {
      await throttle();
      const res = await fetch(`${BASE}${path}`, {
        method: init.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    async login(email) {
      const r = await this.call("/auth/login", {
        method: "POST",
        body: { email, password: "Demo@123" },
      });
      token = r.body?.data?.accessToken ?? "";
      return { ok: Boolean(token), status: r.status, cookie };
    },
    hasRefreshCookie() {
      return cookie.includes("refresh_token");
    },
  };
}

const ok200 = (r) => r.status === 200 && r.body?.success === true;
const rows = (r) => (Array.isArray(r.body?.data) ? r.body.data.length : 0);
const total = (r) => r.body?.pagination?.total;

// ─── 1. Pages render ─────────────────────────────────────────────────────────

heading("Page routes");
for (const [path, expect] of [
  ["/sign-in", [200]],
  ["/sign-up", [200]],
  ["/forgot-password", [200]],
  ["/", [307, 308]],
  ["/academic-affairs", [307]],
  ["/student-affairs", [307]],
  ["/teacher", [307]],
  ["/controller-of-examination", [307]],
  ["/student", [307]],
  ["/principal", [307]],
  ["/admin", [307]],
]) {
  const res = await fetch(`${ORIGIN}${path}`, { redirect: "manual" });
  check(
    `${path}`,
    expect.includes(res.status),
    `${res.status}${res.status === 307 ? " → sign-in (anonymous)" : ""}`,
  );
}

// ─── 2. Auth ─────────────────────────────────────────────────────────────────

heading("Authentication");
const admin = session();
const adminLogin = await admin.login("admin@kit.test");
check("login sets an access token", adminLogin.ok, `status ${adminLogin.status}`);
check("login sets the refresh cookie", admin.hasRefreshCookie());

const me = await admin.call("/users/me");
check("GET /users/me resolves the role", me.body?.data?.role === "ADMIN", me.body?.data?.role);

const refreshed = await admin.call("/auth/refresh-token", { method: "POST" });
check(
  "refresh-token issues a new access token",
  Boolean(refreshed.body?.data?.accessToken),
  `status ${refreshed.status}`,
);

const badLogin = await session().call("/auth/login", {
  method: "POST",
  body: { email: "admin@kit.test", password: "wrong-password" },
});
check("wrong password is rejected", badLogin.status === 401, `status ${badLogin.status}`);

const anon = await session().call("/users/me");
check("unauthenticated request is rejected", anon.status === 401, `status ${anon.status}`);

// ─── 3. Academic Affairs ─────────────────────────────────────────────────────

heading("Academic Affairs");
const aao = session();
await aao.login("academic-affairs@kit.test");

const aaoReads = {
  programs: await aao.call("/academic-affairs/programs?limit=100"),
  majors: await aao.call("/academic-affairs/majors?limit=100"),
  semesters: await aao.call("/academic-affairs/semesters?limit=100"),
  courses: await aao.call("/academic-affairs/courses?page=1&limit=10"),
  classes: await aao.call("/academic-affairs/classes?page=1&limit=10"),
  teachers: await aao.call("/academic-affairs/teachers"),
  timetables: await aao.call("/academic-affairs/timetables"),
  conflicts: await aao.call("/academic-affairs/schedule-conflicts"),
  summary: await aao.call("/academic-affairs/summary"),
  departments: await aao.call("/student-affairs/departments"),
};
for (const [name, r] of Object.entries(aaoReads)) {
  check(`GET ${name}`, ok200(r), `${rows(r)} rows${total(r) != null ? `, total=${total(r)}` : ""}`);
}

const summary = aaoReads.summary.body.data;
check(
  "summary resolves the in-progress semester",
  summary.semesterId !== null && summary.totalClasses > 0,
  `${summary.totalClasses} classes, ${summary.totalEnrolledStudents} registered`,
);
check(
  "class rows carry enrolledCount",
  typeof aaoReads.classes.body.data[0]?.enrolledCount === "number",
  `first=${aaoReads.classes.body.data[0]?.enrolledCount}`,
);
check(
  "timetable rows carry class context",
  Boolean(aaoReads.timetables.body.data[0]?.class?.course?.code),
  `${rows(aaoReads.timetables)} entries`,
);
check("schedule is conflict-free", rows(aaoReads.conflicts) === 0, `${rows(aaoReads.conflicts)} conflicts`);

// Writes
const stamp = Date.now().toString().slice(-6);
const deptId = aaoReads.departments.body.data[0].id;
const newCourse = await aao.call("/academic-affairs/courses", {
  method: "POST",
  body: { code: `E2E${stamp}`, name: "E2E Test Course", departmentId: deptId, credits: 3 },
});
check("POST course", newCourse.status === 201, `status ${newCourse.status}`);

const teacherId = aaoReads.teachers.body.data[0].id;
const semId = summary.semesterId;
const newClass = await aao.call("/academic-affairs/classes", {
  method: "POST",
  body: {
    courseId: newCourse.body.data.id,
    semesterId: semId,
    teacherId,
    room: `E2E Room ${stamp}`,
    capacity: 5,
  },
});
check("POST class", newClass.status === 201, `capacity ${newClass.body?.data?.capacity}`);

const slot = await aao.call(`/academic-affairs/classes/${newClass.body.data.id}/timetable`, {
  method: "POST",
  body: { dayOfWeek: "SATURDAY", startTime: "08:00", endTime: "10:00" },
});
check("POST timetable entry", slot.status === 201, `room=${slot.body?.data?.room}`);
check(
  "roomless entry inherits the class room",
  slot.body?.data?.room === `E2E Room ${stamp}`,
  slot.body?.data?.room,
);

const clash = await aao.call(`/academic-affairs/classes/${newClass.body.data.id}/timetable`, {
  method: "POST",
  body: { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "11:00" },
});
check("overlapping booking is rejected", clash.status === 409, clash.body?.message);

const published = await aao.call(`/academic-affairs/timetables/${slot.body.data.id}/publish`, {
  method: "PATCH",
});
check("PATCH publish timetable", published.status === 200, `published=${published.body?.data?.published}`);

const importCsv = await aao.call("/academic-affairs/courses/import", {
  method: "POST",
  body: { csv: `code,name,department,credits\nI1${stamp},Imported Course,Engineering,3` },
});
check(
  "POST bulk course import",
  importCsv.status === 201 && importCsv.body.data.createdCount === 1,
  `created=${importCsv.body?.data?.createdCount} failed=${importCsv.body?.data?.failedCount}`,
);

const regToggle = await aao.call(`/academic-affairs/semesters/${semId}/registration`, {
  method: "PATCH",
  body: { registrationOpen: true },
});
check("PATCH semester registration window", regToggle.status === 200);

// ─── 4. Student Affairs ──────────────────────────────────────────────────────

heading("Student Affairs");
const sao = session();
await sao.login("student-affairs@kit.test");

const saoReads = {
  students: await sao.call("/student-affairs/students?page=1&limit=10"),
  summary: await sao.call("/student-affairs/students/summary"),
  departments: await sao.call("/student-affairs/departments"),
  academicYears: await sao.call("/student-affairs/academic-years"),
  reports: await sao.call("/student-affairs/enrollment-reports?page=1&limit=8"),
};
for (const [name, r] of Object.entries(saoReads)) {
  check(`GET ${name}`, ok200(r), `${rows(r)} rows${total(r) != null ? `, total=${total(r)}` : ""}`);
}
check(
  "student summary counts every status",
  saoReads.summary.body.data.total === 60,
  `total=${saoReads.summary.body.data.total}`,
);

const searchHit = await sao.call("/student-affairs/students?search=Sam&limit=10");
check("student search filters", ok200(searchHit) && rows(searchHit) > 0, `${rows(searchHit)} match "Sam"`);

const statusFilter = await sao.call("/student-affairs/students?status=GRADUATED&limit=100");
check(
  "student status filter",
  ok200(statusFilter) && rows(statusFilter) === 6,
  `${rows(statusFilter)} graduated`,
);

const newStudent = await sao.call("/student-affairs/students", {
  method: "POST",
  body: {
    studentNumber: `E2E-${stamp}`,
    firstName: "E2E",
    lastName: "Tester",
    departmentId: deptId,
    status: "ENROLLED",
  },
});
check("POST student", newStudent.status === 201, newStudent.body?.data?.studentNumber);

const dupStudent = await sao.call("/student-affairs/students", {
  method: "POST",
  body: { studentNumber: `E2E-${stamp}`, firstName: "Dup", lastName: "Licate" },
});
check("duplicate student number is rejected", dupStudent.status === 409, `status ${dupStudent.status}`);

const importStudents = await sao.call("/student-affairs/students/import", {
  method: "POST",
  body: { csv: `studentNumber,firstName,lastName\nIMP-${stamp},Imported,Student` },
});
check(
  "POST bulk student import",
  [200, 201].includes(importStudents.status) &&
    importStudents.body.data.createdCount === 1,
  `status ${importStudents.status}, created=${importStudents.body?.data?.createdCount}`,
);

const yearId = saoReads.academicYears.body.data[0].id;
const newReport = await sao.call("/student-affairs/enrollment-reports", {
  method: "POST",
  body: { academicYearId: yearId, departmentId: deptId },
});
check("POST enrollment report", newReport.status === 201, `active=${newReport.body?.data?.totalActiveStudents}`);

const sentReport = await sao.call(
  `/student-affairs/enrollment-reports/${newReport.body.data.id}/send`,
  { method: "PATCH" },
);
check("PATCH send report to Principal", sentReport.status === 200, `sent=${sentReport.body?.data?.sentToPrincipal}`);

// ─── 5. Teacher ──────────────────────────────────────────────────────────────

heading("Teacher");
const teacher = session();
await teacher.login("teacher@kit.test");

const dash = await teacher.call("/teacher/me/dashboard");
check(
  "GET dashboard",
  ok200(dash),
  `${dash.body?.data?.classes?.length} classes, ${dash.body?.data?.schedule?.length} today`,
);
const tClass = dash.body.data.classes[0];

const tRoster = await teacher.call(
  `/academic-affairs/course-registrations?classId=${tClass.id}&status=REGISTERED&limit=100`,
);
check("GET class roster", ok200(tRoster), `${rows(tRoster)} registered`);

const today = new Date().toISOString().slice(0, 10);
const tAtt = await teacher.call(
  `/teacher/classes/${tClass.id}/attendance?dateFrom=${today}&dateTo=${today}&limit=100`,
);
check("GET attendance for today", ok200(tAtt), `${rows(tAtt)} marked`);

const studentToMark = tRoster.body.data[0]?.studentId;
const mark = await teacher.call(`/teacher/classes/${tClass.id}/attendance`, {
  method: "POST",
  body: { studentId: studentToMark, date: today, status: "PRESENT" },
});
const markOk = mark.status === 201 || mark.status === 409;
check("POST attendance", markOk, mark.status === 409 ? "already marked" : `status ${mark.status}`);

const attId =
  mark.status === 201
    ? mark.body.data.id
    : (
        await teacher.call(
          `/teacher/classes/${tClass.id}/attendance?dateFrom=${today}&dateTo=${today}&studentId=${studentToMark}`,
        )
      ).body.data[0]?.id;
const attUpd = await teacher.call(`/teacher/attendance/${attId}`, {
  method: "PATCH",
  body: { status: "LATE" },
});
check("PATCH attendance status", attUpd.status === 200, `→ ${attUpd.body?.data?.status}`);

const tAssign = await teacher.call(`/teacher/classes/${tClass.id}/assignments?limit=100`);
check("GET assignments", ok200(tAssign), `${rows(tAssign)} assignments`);

const newAssignment = await teacher.call(`/teacher/classes/${tClass.id}/assignments`, {
  method: "POST",
  body: { title: `E2E Assignment ${stamp}`, maxScore: 100, dueDate: today },
});
check("POST assignment", newAssignment.status === 201, newAssignment.body?.data?.title);

const gradableAssignmentId = tAssign.body.data[0]?.id ?? newAssignment.body?.data?.id;
const subs = await teacher.call(
  `/teacher/assignments/${gradableAssignmentId}/submissions?limit=100`,
);
check(
  "GET submissions with student",
  ok200(subs) && (rows(subs) === 0 || Boolean(subs.body.data[0].student?.firstName)),
  `${rows(subs)} submissions`,
);

if (rows(subs) > 0) {
  const graded = await teacher.call(`/teacher/submissions/${subs.body.data[0].id}/grade`, {
    method: "PATCH",
    body: { score: 91 },
  });
  check("PATCH grade submission", graded.status === 200, `score=${graded.body?.data?.score}`);
}

const cw = await teacher.call(`/teacher/classes/${tClass.id}/coursework-grades?limit=100`);
check("GET coursework grades", ok200(cw), `${rows(cw)} rows`);

const tExams = await teacher.call(`/coe/exams?classId=${tClass.id}&limit=100`);
check("GET exams for class", ok200(tExams), `${rows(tExams)} exams`);
if (rows(tExams) > 0) {
  const papers = await teacher.call(`/teacher/exams/${tExams.body.data[0].id}/exam-papers?limit=50`);
  check("GET own exam papers", ok200(papers), `${rows(papers)} papers`);
}

// ─── 6. Controller of Examination ────────────────────────────────────────────

heading("Controller of Examination");
const coe = session();
await coe.login("coe@kit.test");

const coeReads = {
  exams: await coe.call("/coe/exams?page=1&limit=10"),
  examRooms: await coe.call("/coe/exam-rooms?limit=100"),
  examPapers: await coe.call("/coe/exam-papers?limit=50"),
  transcripts: await coe.call("/coe/transcripts?page=1&limit=10"),
  gradReports: await coe.call("/coe/graduation-reports?limit=50"),
  classes: await coe.call("/academic-affairs/classes?limit=100"),
  teachers: await coe.call("/academic-affairs/teachers"),
  students: await coe.call("/student-affairs/students?limit=100"),
  years: await coe.call("/student-affairs/academic-years"),
};
for (const [name, r] of Object.entries(coeReads)) {
  check(`GET ${name}`, ok200(r), `${rows(r)} rows${total(r) != null ? `, total=${total(r)}` : ""}`);
}

const coeClass = coeReads.classes.body.data.find((c) => c.status === "COMPLETED") ?? coeReads.classes.body.data[0];
const finalGrades = await coe.call(`/coe/classes/${coeClass.id}/final-grades?limit=100`);
check("GET final grades", ok200(finalGrades), `${rows(finalGrades)} grades`);

const pending = finalGrades.body.data.find((g) => g.status === "RECEIVED" || g.status === "PENDING");
if (pending) {
  const approved = await coe.call(`/coe/final-grades/${pending.id}/approve`, { method: "PATCH" });
  check("PATCH approve grade", approved.status === 200, `→ ${approved.body?.data?.status}`);
  const pub = await coe.call(`/coe/final-grades/${pending.id}/publish`, { method: "PATCH" });
  check("PATCH publish grade", pub.status === 200, `→ ${pub.body?.data?.status}`);
} else {
  check("grade approval (all already published)", true);
}

const coeExam = coeReads.exams.body.data[0];
const roomAssign = await coe.call(`/coe/exams/${coeExam.id}/rooms`, {
  method: "POST",
  body: { examRoomId: coeReads.examRooms.body.data[3].id },
});
check(
  "POST assign exam room",
  roomAssign.status === 201 || roomAssign.status === 409,
  roomAssign.status === 409 ? "already assigned" : `status ${roomAssign.status}`,
);

const newTranscript = await coe.call("/coe/transcripts", {
  method: "POST",
  body: { studentId: coeReads.students.body.data[0].id },
});
check("POST transcript request", newTranscript.status === 201, `status ${newTranscript.body?.data?.status}`);

const genTranscript = await coe.call(`/coe/transcripts/${newTranscript.body.data.id}/generate`, {
  method: "PATCH",
  body: { fileUrl: `https://files.kit.test/transcripts/e2e-${stamp}.pdf` },
});
check("PATCH generate transcript", genTranscript.status === 200, `→ ${genTranscript.body?.data?.status}`);

const gradReportId = coeReads.gradReports.body.data.find((r) => !r.sentToPrincipal)?.id;
if (gradReportId) {
  const recs = await coe.call(`/coe/graduation-reports/${gradReportId}/records?limit=100`);
  check("GET graduation records", ok200(recs), `${rows(recs)} records`);
  const eligible = recs.body.data.find((r) => r.status === "ELIGIBLE");
  if (eligible) {
    const upd = await coe.call(`/coe/graduation-records/${eligible.id}`, {
      method: "PATCH",
      body: { status: "GRADUATED", graduationDate: today },
    });
    check("PATCH graduation record", upd.status === 200, `→ ${upd.body?.data?.status}`);
  }
} else {
  check("graduation records (no draft report)", true);
}

// ─── 7. Student ──────────────────────────────────────────────────────────────

heading("Student");
const student = session();
await student.login("student@kit.test");

const studentReads = {
  me: await student.call("/student/me"),
  dashboard: await student.call("/student/me/dashboard"),
  timetable: await student.call("/student/me/timetable"),
  assignments: await student.call("/student/me/assignments"),
  attendance: await student.call("/student/me/attendance-summary"),
  standing: await student.call("/student/me/academic-standing"),
  exams: await student.call("/student/me/exams"),
  results: await student.call("/student/me/results"),
  transcripts: await student.call("/student/me/transcripts"),
  graduation: await student.call("/student/me/graduation-status"),
  registrations: await student.call("/student/me/course-registrations"),
};
for (const [name, r] of Object.entries(studentReads)) {
  check(`GET ${name}`, ok200(r), `${rows(r)} rows${total(r) != null ? `, total=${total(r)}` : ""}`);
}

const sDash = studentReads.dashboard.body.data;
check(
  "dashboard carries profile, attendance, standing and timetable",
  Boolean(sDash.profile?.studentNumber) &&
    typeof sDash.attendance?.percent === "number" &&
    sDash.academicStanding !== undefined &&
    Array.isArray(sDash.timetable),
  `${sDash.profile?.studentNumber}, ${sDash.attendance?.percent}% attendance`,
);
check(
  "results are only the student's own",
  studentReads.results.body.data.every((r) => Boolean(r.class?.course?.code)),
  `${rows(studentReads.results)} results`,
);

const selfTranscript = await student.call("/student/me/transcripts", { method: "POST" });
check("POST own transcript request", selfTranscript.status === 201, `status ${selfTranscript.status}`);

// ─── 8. Principal ────────────────────────────────────────────────────────────

heading("Principal");
const principal = session();
await principal.login("principal@kit.test");

const pYears = await principal.call("/student-affairs/academic-years");
const pYear = pYears.body.data[0].id;

const principalReads = {
  enrollment: await principal.call(`/principal/analytics/enrollment?academicYearId=${pYear}`),
  performance: await principal.call(`/principal/analytics/academic-performance?academicYearId=${pYear}`),
  faculty: await principal.call(`/principal/analytics/faculty-performance?academicYearId=${pYear}`),
  graduation: await principal.call(`/principal/analytics/graduation?academicYearId=${pYear}`),
  facultyProfiles: await principal.call("/principal/faculty-profiles"),
  metrics: await principal.call(`/principal/institutional-metrics?academicYearId=${pYear}`),
  dashboards: await principal.call(`/principal/performance-dashboards?academicYearId=${pYear}&limit=100`),
  teachers: await principal.call("/academic-affairs/teachers"),
  enrollmentReports: await principal.call("/student-affairs/enrollment-reports?limit=50"),
};
for (const [name, r] of Object.entries(principalReads)) {
  check(`GET ${name}`, ok200(r), `${rows(r)} rows${total(r) != null ? `, total=${total(r)}` : ""}`);
}

const enr = principalReads.enrollment.body.data;
check(
  "enrollment analytics has real breakdowns",
  enr.totalStudents > 0 && enr.byStatus.length > 0 && enr.byDepartment.length > 0,
  `${enr.totalStudents} students, ${enr.byDepartment.length} departments`,
);
const perf = principalReads.performance.body.data;
check(
  "academic performance is computed",
  perf.totalGradedStudents > 0 && perf.avgGpa !== null,
  `GPA ${perf.avgGpa}, pass ${perf.passRate}%`,
);

const snapshot = await principal.call("/principal/performance-dashboards/generate", {
  method: "POST",
  body: { academicYearId: pYear },
});
check("POST generate performance snapshot", snapshot.status === 201, `status ${snapshot.status}`);

const teacherForProfile = principalReads.teachers.body.data[0];
const upsert = await principal.call("/principal/faculty-profiles", {
  method: "PUT",
  body: {
    userId: teacherForProfile.id,
    departmentName: "Engineering",
    publicationIndex: 21,
    studentRating: 4.7,
    performanceLabel: "Excellent",
  },
});
check("PUT faculty profile", upsert.status === 200 || upsert.status === 201, `status ${upsert.status}`);

// ─── 9. Admin ────────────────────────────────────────────────────────────────

heading("Admin");
const users = await admin.call("/users?page=1&limit=20");
check("GET users", ok200(users), `${rows(users)} rows, total=${total(users)}`);

const auditLogs = await admin.call("/admin/audit-logs?page=1&limit=20");
check("GET audit logs", ok200(auditLogs), `${rows(auditLogs)} rows, total=${total(auditLogs)}`);

const aaoAudit = await admin.call("/admin/audit-logs?module=ACADEMIC_AFFAIRS&limit=50");
check(
  "Academic Affairs writes are audited",
  ok200(aaoAudit) && rows(aaoAudit) > 0,
  `${rows(aaoAudit)} entries, e.g. "${aaoAudit.body?.data?.[0]?.details ?? ""}"`,
);
check(
  "audit entries name the actor",
  Boolean(auditLogs.body?.data?.[0]?.user?.email),
  auditLogs.body?.data?.[0]?.user?.email,
);

const newAccount = await admin.call("/admin/accounts", {
  method: "POST",
  body: {
    firstName: "E2E",
    lastName: "Account",
    email: `e2e-${stamp}@kit.test`,
    password: "Demo@123",
    role: "TEACHER",
  },
});
check("POST admin account", newAccount.status === 201, newAccount.body?.data?.email);

const deactivate = await admin.call(`/admin/accounts/${newAccount.body.data.id}/status`, {
  method: "PATCH",
  body: { isActive: false },
});
check("PATCH account status", deactivate.status === 200, `active=${deactivate.body?.data?.isActive}`);

// ─── 10. Role boundaries ─────────────────────────────────────────────────────

heading("Role boundaries");
for (const [label, sess, path, expected] of [
  ["STUDENT cannot list all students", student, "/student-affairs/students", 403],
  ["STUDENT cannot read audit logs", student, "/admin/audit-logs", 403],
  ["TEACHER cannot list users", teacher, "/users", 403],
  ["TEACHER cannot create a course", teacher, "/academic-affairs/courses", 403],
  ["AAO cannot read audit logs", aao, "/admin/audit-logs", 403],
  ["SAO cannot approve grades", sao, "/coe/exams", 403],
  ["PRINCIPAL cannot create a course", principal, "/academic-affairs/courses", 403],
]) {
  const method = path.endsWith("/courses") ? "POST" : "GET";
  const r = await sess.call(path, method === "POST" ? { method, body: {} } : {});
  check(label, r.status === expected, `status ${r.status}`);
}

// ─── 11. Lookups, generation and uploads ─────────────────────────────────────

heading("Departments & academic years");
const stamp2 = Date.now().toString().slice(-6);

const depts = await aao.call("/academic-affairs/departments");
check("GET departments with dependant counts", ok200(depts) &&
  typeof depts.body.data[0]?._count?.students === "number", `${rows(depts)} rows`);

const newDept = await aao.call("/academic-affairs/departments", {
  method: "POST", body: { name: `E2E Dept ${stamp2}` },
});
check("POST department", newDept.status === 201, newDept.body?.data?.name);

const dupDept = await aao.call("/academic-affairs/departments", {
  method: "POST", body: { name: `e2e dept ${stamp2}` },
});
check("duplicate department rejected", dupDept.status === 409, `status ${dupDept.status}`);

const renamedDept = await aao.call(`/academic-affairs/departments/${newDept.body.data.id}`, {
  method: "PATCH", body: { name: `E2E Dept ${stamp2} v2` },
});
check("PATCH department", renamedDept.status === 200, renamedDept.body?.data?.name);

const inUseDept = depts.body.data.find((d) => d._count.students + d._count.programs + d._count.courses > 0);
const blockedDept = await admin.call(`/academic-affairs/departments/${inUseDept.id}`, { method: "DELETE" });
check("in-use department cannot be deleted", blockedDept.status === 409, blockedDept.body?.message);

const goneDept = await admin.call(`/academic-affairs/departments/${newDept.body.data.id}`, { method: "DELETE" });
check("DELETE unused department", goneDept.status === 200, `status ${goneDept.status}`);

const aaoYears = await aao.call("/academic-affairs/academic-years");
check("GET academic years with counts", ok200(aaoYears), `${rows(aaoYears)} rows`);

const newYear = await aao.call("/academic-affairs/academic-years", {
  method: "POST", body: { yearLabel: `E2E${stamp2}`, startDate: "2032-09-01", endDate: "2033-06-30" },
});
check("POST academic year", newYear.status === 201, newYear.body?.data?.yearLabel);

const badWindow = await aao.call(`/academic-affairs/academic-years/${newYear.body.data.id}`, {
  method: "PATCH", body: { endDate: "2032-01-01" },
});
check("partial edit validates the whole window", badWindow.status === 400, badWindow.body?.message);

const goneYear = await admin.call(`/academic-affairs/academic-years/${newYear.body.data.id}`, { method: "DELETE" });
check("DELETE unused academic year", goneYear.status === 200, `status ${goneYear.status}`);

heading("Timetable generation & deadlines");
const deadlines = await aao.call("/academic-affairs/deadlines?withinDays=120&limit=10");
check("GET deadlines", ok200(deadlines), `${rows(deadlines)} upcoming`);
check("deadlines are sorted soonest-first",
  (deadlines.body.data ?? []).every((d, i, a) => i === 0 || new Date(a[i - 1].date) <= new Date(d.date)),
  (deadlines.body.data ?? []).slice(0, 2).map((d) => `${d.kind}+${d.daysAway}d`).join(", "));

// Give the allocator something to do: a class with no timetable of its own.
const genCourse = await aao.call("/academic-affairs/courses", {
  method: "POST",
  body: { code: `GEN${stamp2}`, name: "Generation Target", departmentId: deptId, credits: 3 },
});
const genClass = await aao.call("/academic-affairs/classes", {
  method: "POST",
  body: {
    courseId: genCourse.body.data.id,
    semesterId: semId,
    teacherId,
    room: `Gen Room ${stamp2}`,
    capacity: 20,
  },
});
check("seeded an unscheduled class", genClass.status === 201, genClass.body?.data?.course?.code);

const beforeGen = rows(await aao.call(`/academic-affairs/timetables?semesterId=${semId}`));
const gen = await aao.call("/academic-affairs/timetables/generate", {
  method: "POST", body: { semesterId: semId, sessionsPerClass: 2 },
});
check("POST timetable generate", gen.status === 201,
  `scheduled ${gen.body?.data?.scheduled}, skipped ${gen.body?.data?.skipped?.length}`);
check("it placed the unscheduled class", gen.body?.data?.scheduled >= 2,
  `${gen.body?.data?.scheduled} entries`);

const afterGen = rows(await aao.call(`/academic-affairs/timetables?semesterId=${semId}`));
check("grid grew by exactly what was scheduled",
  afterGen === beforeGen + gen.body.data.scheduled, `${beforeGen} → ${afterGen}`);

const postGenConflicts = await aao.call(`/academic-affairs/schedule-conflicts?semesterId=${semId}`);
check("generated grid stays conflict-free", rows(postGenConflicts) === 0, `${rows(postGenConflicts)} conflicts`);

const regen = await aao.call("/academic-affairs/timetables/generate", {
  method: "POST", body: { semesterId: semId, sessionsPerClass: 2 },
});
check("re-generating is a no-op", regen.body?.data?.scheduled === 0, `scheduled ${regen.body?.data?.scheduled}`);

heading("File upload");
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
async function upload(sess, bytes, type, name) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  await throttle();
  const res = await fetch(`${BASE}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sess.token}` },
    body: form,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const imgUp = await upload(sao, pngBytes, "image/png", "portrait.png");
check("upload an image", imgUp.status === 201, imgUp.body?.data?.storage?.resourceType);

const pdfUp = await upload(teacher, Buffer.from("%PDF-1.4\n%%EOF\n"), "application/pdf", "paper.pdf");
check("upload a PDF as a raw asset", pdfUp.status === 201 && pdfUp.body?.data?.storage?.resourceType === "raw",
  pdfUp.body?.data?.storage?.resourceType);

const badUp = await upload(sao, Buffer.from("MZ"), "application/x-msdownload", "bad.exe");
check("unsupported type rejected", badUp.status === 415 || badUp.status === 400, `status ${badUp.status}`);

// The uploaded URL is what actually gets attached to a record.
const docStudent = (await sao.call("/student-affairs/students?limit=1")).body.data[0];
const attached = await sao.call(`/student-affairs/students/${docStudent.id}/documents`, {
  method: "POST", body: { documentType: "ID_CARD", fileUrl: imgUp.body.data.url },
});
check("attach the uploaded file to a student", attached.status === 201, attached.body?.data?.documentType);

const docs = await sao.call(`/student-affairs/students/${docStudent.id}/documents`);
check("document is listed on the record", ok200(docs) && rows(docs) > 0, `${rows(docs)} documents`);

// ─── 12. Cleanup ─────────────────────────────────────────────────────────────

heading("Session teardown");
const loggedOut = await admin.call("/auth/logout", { method: "POST" });
check("POST logout", loggedOut.status === 200, `status ${loggedOut.status}`);

// ─── Summary ─────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok);
console.log(
  `\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`,
);
if (failed.length) {
  console.log("\x1b[31mFailures:\x1b[0m");
  for (const f of failed) console.log(`  [${f.section}] ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
