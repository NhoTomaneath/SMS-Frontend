"use client";

import Link from "next/link";
import { useMemo } from "react";
import { IconStatCard } from "@/components/icon-stat-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  BarChartIcon,
  CalendarIcon,
  ClipboardIcon,
  GraduationCapIcon,
} from "@/components/icons";
import { useApiQuery } from "@/lib/api/hooks";
import type { StudentDashboardDTO } from "@/lib/api/types";
import {
  WEEK_DAYS,
  courseworkLabel,
  courseworkTone,
  fromApiOwnAssignment,
  fromApiOwnTimetable,
  todayName,
} from "@/lib/student/dashboard-data";
import { percentOf } from "@/lib/format";

const STUDENT_KEY = ["student"] as const;

const YEAR_LABEL: Record<string, string> = {
  FR: "Freshman",
  SO: "Sophomore",
  JR: "Junior",
  SR: "Senior",
};

export default function StudentDashboard() {
  const dashboardQuery = useApiQuery<StudentDashboardDTO>(
    [...STUDENT_KEY, "dashboard"],
    "/student/me/dashboard",
  );

  const data = dashboardQuery.data?.data;

  const slots = useMemo(
    () => (data?.timetable ?? []).map(fromApiOwnTimetable),
    [data?.timetable],
  );

  const coursework = useMemo(
    () => (data?.assignments ?? []).map(fromApiOwnAssignment),
    [data?.assignments],
  );

  const today = todayName();
  const todaySlots = slots
    .filter((s) => s.day === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const attendance = data?.attendance;
  const standing = data?.academicStanding;

  if (dashboardQuery.isError) {
    return (
      <div>
        <PageHeader title="My Dashboard" description="Your timetable, attendance, and coursework." />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="font-semibold text-rose-800">
            {dashboardQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => dashboardQuery.refetch()}
            className="mt-4 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          data ? `Welcome back, ${data.profile.firstName}` : "My Dashboard"
        }
        description="Your timetable, attendance, and coursework at a glance."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IconStatCard
          icon={ClipboardIcon}
          label="Attendance"
          value={
            dashboardQuery.isLoading || !attendance ? "—" : `${attendance.percent}%`
          }
          {...(attendance
            ? {
                trend: attendance.label,
                trendTone:
                  attendance.label === "At Risk" ? ("warning" as const) : undefined,
              }
            : {})}
        />
        <IconStatCard
          icon={GraduationCapIcon}
          iconBgClassName="bg-sky-50 text-sky-600"
          label="Cumulative GPA"
          value={
            dashboardQuery.isLoading
              ? "—"
              : standing?.cumulativeGpa != null
                ? standing.cumulativeGpa.toFixed(2)
                : "No grades yet"
          }
          {...(standing ? { trend: `${standing.completedCourses} courses` } : {})}
        />
        <IconStatCard
          icon={BarChartIcon}
          label="Year Level"
          value={
            dashboardQuery.isLoading || !standing
              ? "—"
              : (YEAR_LABEL[standing.yearLevel] ?? standing.yearLevel)
          }
          {...(standing ? { trend: `${standing.semesterCount} semesters` } : {})}
        />
        <IconStatCard
          icon={CalendarIcon}
          label="Classes Today"
          value={dashboardQuery.isLoading ? "—" : String(todaySlots.length)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Weekly Timetable</h2>
            <p className="text-sm text-stone-500">
              Published classes for the courses you are registered in.
            </p>

            {dashboardQuery.isLoading ? (
              <p className="mt-6 text-sm text-stone-400">Loading…</p>
            ) : slots.length === 0 ? (
              <p className="mt-6 text-sm text-stone-400">
                No published timetable entries yet.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {WEEK_DAYS.map((day) => {
                  const daySlots = slots
                    .filter((s) => s.day === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  if (daySlots.length === 0) return null;
                  return (
                    <div key={day}>
                      <p
                        className={`text-xs font-bold uppercase tracking-wide ${
                          day === today ? "text-rose-700" : "text-stone-400"
                        }`}
                      >
                        {day}
                        {day === today && " · Today"}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {daySlots.map((slot) => (
                          <li
                            key={slot.id}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 p-3 ${
                              day === today
                                ? "border-rose-600 bg-rose-50"
                                : "border-stone-200 bg-stone-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-stone-800">{slot.code}</p>
                              <p className="truncate text-xs text-stone-500">
                                {slot.name}
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-stone-600">
                              {slot.startTime}–{slot.endTime} · {slot.room}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">
                Assigned Coursework
              </h2>
              <StatusBadge label={`${coursework.length} items`} tone="rose" />
            </div>
            {dashboardQuery.isLoading ? (
              <p className="p-6 text-sm text-stone-400">Loading…</p>
            ) : coursework.length === 0 ? (
              <p className="p-6 text-sm text-stone-400">
                Nothing assigned right now.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {coursework.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800">{item.title}</p>
                      <p className="truncate text-xs text-stone-500">
                        {item.courseLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-stone-500">Due {item.dueLabel}</p>
                        <p className="text-xs font-semibold text-stone-700">
                          {item.score === null
                            ? `${item.maxScore} marks`
                            : `${item.score}/${item.maxScore}`}
                        </p>
                      </div>
                      <StatusBadge
                        label={courseworkLabel[item.status]}
                        tone={courseworkTone[item.status]}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-stone-200 p-4 text-center">
              <Link
                href="/student/exams-results"
                className="text-sm font-semibold text-rose-700 hover:underline"
              >
                View exams &amp; results
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Attendance</h3>
            {attendance ? (
              <>
                <p className="mt-3 text-3xl font-extrabold text-stone-900">
                  {attendance.percent}%
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${
                      attendance.percent >= 85
                        ? "bg-emerald-600"
                        : attendance.percent >= 75
                          ? "bg-amber-500"
                          : "bg-rose-700"
                    }`}
                    style={{ width: `${attendance.percent}%` }}
                  />
                </div>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {[
                    ["Present", attendance.present],
                    ["Late", attendance.late],
                    ["Absent", attendance.absent],
                    ["Excused", attendance.excused],
                  ].map(([label, count]) => (
                    <div key={String(label)} className="flex justify-between">
                      <dt className="text-stone-500">{label}</dt>
                      <dd className="font-semibold text-stone-800">
                        {count}
                        <span className="ml-1.5 text-xs font-normal text-stone-400">
                          {percentOf(Number(count), attendance.total)}%
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-3 text-sm text-stone-400">
                {dashboardQuery.isLoading ? "Loading…" : "No attendance recorded."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              My Record
            </h3>
            {data ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Student number</dt>
                  <dd className="font-mono font-semibold text-stone-800">
                    {data.profile.studentNumber}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Department</dt>
                  <dd className="text-stone-700">
                    {data.profile.department?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Status</dt>
                  <dd>
                    <StatusBadge
                      label={data.profile.status.replace("_", " ")}
                      tone={data.profile.status === "ENROLLED" ? "green" : "amber"}
                    />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-stone-400">Loading…</p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Quick Links
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/student/exams-results"
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Exams &amp; Results
              </Link>
              <Link
                href="/student/graduation-status"
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Graduation Status
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
