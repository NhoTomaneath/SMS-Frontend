"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconStatCard } from "@/components/icon-stat-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  GraduationCapIcon,
  UsersIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AttendanceDTO,
  AttendanceStatusDTO,
  CourseRegistrationDTO,
  TeacherDashboardDTO,
} from "@/lib/api/types";
import {
  ATTENDANCE_OPTIONS,
  attendanceTone,
  fromApiScheduleEntry,
  fromApiTeacherClass,
  rosterRowOf,
  scheduleTone,
} from "@/lib/teacher/dashboard-data";
import { titleCase } from "@/lib/format";

const TEACHER_KEY = ["teacher"] as const;
const DASHBOARD_KEY = [...TEACHER_KEY, "dashboard"] as const;
const ATTENDANCE_KEY = [...TEACHER_KEY, "attendance"] as const;

/** Today's date as YYYY-MM-DD in the viewer's timezone, which is what the API takes. */
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function TeacherDashboard() {
  const queryClient = useQueryClient();

  const [pickedClassId, setPickedClassId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const dashboardQuery = useApiQuery<TeacherDashboardDTO>(
    DASHBOARD_KEY,
    "/teacher/me/dashboard",
  );

  const classes = useMemo(
    () => (dashboardQuery.data?.data.classes ?? []).map(fromApiTeacherClass),
    [dashboardQuery.data],
  );

  const schedule = useMemo(
    () => (dashboardQuery.data?.data.schedule ?? []).map((e) => fromApiScheduleEntry(e)),
    [dashboardQuery.data],
  );

  // Default to the class that is running now, else the first assigned class.
  const liveClassId = schedule.find((s) => s.status === "IN PROGRESS")?.classId;
  const classId = pickedClassId || liveClassId || classes[0]?.id || "";
  const selectedClass = classes.find((c) => c.id === classId);

  // The roster comes from registrations; attendance is layered on top of it.
  const rosterQuery = useApiQuery<CourseRegistrationDTO[]>(
    [...TEACHER_KEY, "roster", { classId }],
    "/academic-affairs/course-registrations",
    {
      query: { classId, status: "REGISTERED", limit: 100 },
      enabled: Boolean(classId),
    },
  );

  const attendanceQuery = useApiQuery<AttendanceDTO[]>(
    [...ATTENDANCE_KEY, { classId, date }],
    `/teacher/classes/${classId}/attendance`,
    {
      query: { dateFrom: date, dateTo: date, limit: 100 },
      enabled: Boolean(classId),
    },
  );

  /**
   * Attendance rows carry the student, but only for students already marked.
   * Merge them over the full registered roster so unmarked students still show.
   */
  const roster = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{
      key: string;
      studentId: string;
      studentNumber: string;
      name: string;
      initials: string;
      avatarColorClassName: string;
      status: AttendanceStatusDTO | null;
      attendanceId: string | null;
    }> = [];

    for (const record of attendanceQuery.data?.data ?? []) {
      seen.add(record.studentId);
      rows.push({
        key: record.studentId,
        ...rosterRowOf(record.student),
        status: record.status,
        attendanceId: record.id,
      });
    }

    // Registrations do not embed the student, so anyone not yet marked shows
    // by id until they are — the attendance row fills in the name.
    for (const reg of rosterQuery.data?.data ?? []) {
      if (seen.has(reg.studentId)) continue;
      rows.push({
        key: reg.studentId,
        studentId: reg.studentId,
        studentNumber: "—",
        name: `Student ${reg.studentId.slice(0, 8)}`,
        initials: "··",
        avatarColorClassName: "bg-stone-100 text-stone-500",
        status: null,
        attendanceId: null,
      });
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceQuery.data, rosterQuery.data]);

  const markedCount = roster.filter((r) => r.status !== null).length;
  const presentCount = roster.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE",
  ).length;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const markMutation = useMutation({
    mutationFn: ({
      studentId,
      status,
      attendanceId,
    }: {
      studentId: string;
      status: AttendanceStatusDTO;
      attendanceId: string | null;
    }) =>
      attendanceId
        ? // Already recorded for this date — the create route would 409.
          apiFetch<AttendanceDTO>(`/teacher/attendance/${attendanceId}`, {
            method: "PATCH",
            body: { status },
          })
        : apiFetch<AttendanceDTO>(`/teacher/classes/${classId}/attendance`, {
            method: "POST",
            body: { studentId, date, status },
          }),
    onMutate: () => setActionError(null),
    onSuccess: async (_res, { status }) => {
      await queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY });
      showToast(`Marked ${titleCase(status)}.`);
    },
    onError: (err) => setActionError(errorMessage(err, "Could not save attendance.")),
  });

  const totalStudents = classes.reduce((sum, c) => sum + c.enrolled, 0);

  return (
    <div>
      <PageHeader
        title="Teacher Workspace"
        description="Your assigned classes, today's schedule, and attendance."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IconStatCard
          icon={GraduationCapIcon}
          label="Assigned Classes"
          value={dashboardQuery.isLoading ? "—" : String(classes.length)}
        />
        <IconStatCard
          icon={UsersIcon}
          iconBgClassName="bg-sky-50 text-sky-600"
          label="Total Students"
          value={dashboardQuery.isLoading ? "—" : String(totalStudents)}
        />
        <IconStatCard
          icon={CalendarIcon}
          label="Classes Today"
          value={dashboardQuery.isLoading ? "—" : String(schedule.length)}
        />
        <IconStatCard
          icon={ClipboardIcon}
          label="Marked Today"
          value={classId ? `${markedCount}/${roster.length}` : "—"}
          {...(roster.length > 0 && markedCount < roster.length
            ? { trend: "attendance pending", trendTone: "warning" as const }
            : {})}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Take Attendance</h2>
                <p className="text-sm text-stone-500">
                  {selectedClass
                    ? `${selectedClass.code} — ${selectedClass.name}`
                    : "Select a class"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Class"
                  value={classId}
                  onChange={(e) => setPickedClassId(e.target.value)}
                  disabled={dashboardQuery.isLoading || classes.length === 0}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.semester}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Attendance date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-rose-400"
                />
              </div>
            </div>

            {actionError && (
              <p className="border-b border-stone-200 px-6 py-3 text-sm font-medium text-rose-600">
                {actionError}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Number</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(attendanceQuery.isLoading || rosterQuery.isLoading) && (
                    <LoadingRow colSpan={4} />
                  )}
                  {attendanceQuery.isError && (
                    <ErrorRow
                      colSpan={4}
                      message={attendanceQuery.error.message}
                      onRetry={() => attendanceQuery.refetch()}
                    />
                  )}
                  {!attendanceQuery.isLoading &&
                    !attendanceQuery.isError &&
                    roster.map((row) => (
                      <tr key={row.key}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${row.avatarColorClassName}`}
                            >
                              {row.initials}
                            </span>
                            <span className="font-medium text-stone-800">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-stone-500">
                          {row.studentNumber}
                        </td>
                        <td className="px-6 py-3">
                          {row.status ? (
                            <StatusBadge
                              label={titleCase(row.status)}
                              tone={attendanceTone[row.status]}
                            />
                          ) : (
                            <span className="text-xs text-stone-400">Not marked</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {ATTENDANCE_OPTIONS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                disabled={markMutation.isPending}
                                onClick={() =>
                                  markMutation.mutate({
                                    studentId: row.studentId,
                                    status: option,
                                    attendanceId: row.attendanceId,
                                  })
                                }
                                className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  row.status === option
                                    ? "border-rose-700 bg-rose-700 text-white"
                                    : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                {option.charAt(0) + option.slice(1, 3).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!attendanceQuery.isLoading &&
                    !attendanceQuery.isError &&
                    roster.length === 0 && (
                      <EmptyRow
                        colSpan={4}
                        label={
                          classId
                            ? "No students registered for this class."
                            : "No classes assigned to you."
                        }
                      />
                    )}
                </tbody>
              </table>
            </div>

            {roster.length > 0 && (
              <div className="border-t border-stone-200 px-6 py-4 text-sm text-stone-500">
                {presentCount} present or late · {markedCount} of {roster.length} marked
                for {date}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Assigned Courses</h2>
            {dashboardQuery.isLoading ? (
              <p className="mt-4 text-sm text-stone-400">Loading…</p>
            ) : classes.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                No classes are assigned to you yet.
              </p>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {classes.map((course) => (
                  <li
                    key={course.id}
                    className={`rounded-xl border-l-4 p-4 ${course.accentClassName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-stone-800">{course.code}</p>
                        <p className="truncate text-sm text-stone-600">{course.name}</p>
                      </div>
                      <StatusBadge label={titleCase(course.status)} tone="sky" />
                    </div>
                    <p className="mt-3 text-xs text-stone-500">
                      {course.semester} · {course.room} · {course.enrolled}/
                      {course.capacity} enrolled
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Today&apos;s Schedule</h3>
            {dashboardQuery.isLoading ? (
              <p className="mt-4 text-sm text-stone-400">Loading…</p>
            ) : schedule.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                Nothing published for today.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {schedule.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-stone-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-stone-800">
                        {item.courseCode}
                      </p>
                      <StatusBadge
                        label={item.status}
                        tone={scheduleTone[item.status]}
                      />
                    </div>
                    <p className="mt-1 truncate text-xs text-stone-500">{item.title}</p>
                    <p className="mt-2 text-xs text-stone-500">
                      {item.startTime}–{item.endTime} · {item.location} ·{" "}
                      {item.studentCount} students
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Quick Links
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/teacher/assignments"
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Assignments &amp; Grading
              </Link>
              <Link
                href="/teacher/exam-papers"
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Exam Papers
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-xl">
          <CheckCircleIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
