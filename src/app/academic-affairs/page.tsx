"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  AlertTriangleIcon,
  CalendarXIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DownloadIcon,
  GraduationCapIcon,
  UploadCloudIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicSummaryDTO,
  ClassDTO,
  DeadlineDTO,
  MajorDTO,
  ProgramDTO,
  SemesterDTO,
} from "@/lib/api/types";
import {
  fromApiClass,
  fromApiDeadline,
  fromApiSemester,
  type RegistrationMonitorRow,
} from "@/lib/academic-affairs/data";

const AAO_KEY = ["academic-affairs"] as const;
const PROGRAMS_KEY = [...AAO_KEY, "programs"] as const;
const MAJORS_KEY = [...AAO_KEY, "majors"] as const;
const SEMESTERS_KEY = [...AAO_KEY, "semesters"] as const;
const CLASSES_KEY = [...AAO_KEY, "classes"] as const;
const SUMMARY_KEY = [...AAO_KEY, "summary"] as const;

const PAGE_SIZE = 10;
const LOOKUP_LIMIT = 100;

const statusTone: Record<RegistrationMonitorRow["status"], StatusTone> = {
  OPEN: "green",
  FULL: "rose",
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

function downloadRegistrationCsv(rows: RegistrationMonitorRow[]) {
  const header = ["Course Code", "Course Title", "Instructor", "Enrolled", "Capacity", "Status"];
  const body = rows.map((r) => [
    r.code,
    r.title,
    r.instructor,
    String(r.enrolled),
    String(r.capacity),
    r.status,
  ]);
  const csv = [header, ...body].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "registration-monitoring.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AcademicAffairsDashboard() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Program Setup form state. Ids, not labels — every one of these is a FK.
  // Only the user's own choices are stored; defaults are derived below so no
  // effect has to write them back into state.
  const [programId, setProgramId] = useState("");
  const [pickedMajorId, setPickedMajorId] = useState("");
  const [pickedSemesterId, setPickedSemesterId] = useState("");
  /** Non-null once the user edits the session window; null means "follow the semester". */
  const [windowDraft, setWindowDraft] = useState<{ start: string; end: string } | null>(
    null,
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const programsQuery = useApiQuery<ProgramDTO[]>(
    [...PROGRAMS_KEY, { limit: LOOKUP_LIMIT }],
    "/academic-affairs/programs",
    { query: { limit: LOOKUP_LIMIT } },
  );

  // Majors belong to a program, so the picker narrows once one is chosen.
  const majorsQuery = useApiQuery<MajorDTO[]>(
    [...MAJORS_KEY, { programId }],
    "/academic-affairs/majors",
    { query: { limit: LOOKUP_LIMIT, programId: programId || undefined } },
  );

  const semestersQuery = useApiQuery<SemesterDTO[]>(
    [...SEMESTERS_KEY, { limit: LOOKUP_LIMIT }],
    "/academic-affairs/semesters",
    { query: { limit: LOOKUP_LIMIT } },
  );

  const summaryQuery = useApiQuery<AcademicSummaryDTO>(
    [...SUMMARY_KEY, { pickedSemesterId }],
    "/academic-affairs/summary",
    { query: { semesterId: pickedSemesterId || undefined } },
  );

  // The backend falls back to the most recent semester when none is named, so
  // its answer doubles as the page's default selection.
  const semesterId = pickedSemesterId || summaryQuery.data?.data.semesterId || "";

  const deadlinesQuery = useApiQuery<DeadlineDTO[]>(
    [...AAO_KEY, "deadlines", { semesterId: pickedSemesterId }],
    "/academic-affairs/deadlines",
    { query: { semesterId: pickedSemesterId || undefined, withinDays: 90, limit: 6 } },
  );

  const classesQuery = useApiQuery<ClassDTO[]>(
    [...CLASSES_KEY, { page, semesterId }],
    "/academic-affairs/classes",
    {
      query: {
        page,
        limit: PAGE_SIZE,
        semesterId: semesterId || undefined,
      },
      placeholderData: (prev) => prev,
    },
  );

  const programs = programsQuery.data?.data ?? [];
  const majors = majorsQuery.data?.data ?? [];
  const semesters = useMemo(
    () => (semestersQuery.data?.data ?? []).map(fromApiSemester),
    [semestersQuery.data],
  );
  const summary = summaryQuery.data?.data;

  const deadlines = useMemo(
    () => (deadlinesQuery.data?.data ?? []).map(fromApiDeadline),
    [deadlinesQuery.data],
  );

  const monitorRows = useMemo(
    () => (classesQuery.data?.data ?? []).map(fromApiClass),
    [classesQuery.data],
  );

  const total = classesQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectedSemester = semesters.find((s) => s.id === semesterId);

  // The window inputs show the semester's own dates until the user edits them.
  const enrollmentStart = windowDraft?.start ?? selectedSemester?.startDate ?? "";
  const enrollmentEnd = windowDraft?.end ?? selectedSemester?.endDate ?? "";

  // A major picked under one program must not survive a switch to another.
  const majorId = majors.some((m) => m.id === pickedMajorId) ? pickedMajorId : "";

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateSemesterMutation = useMutation({
    mutationFn: (body: { startDate: string; endDate: string }) =>
      apiFetch<SemesterDTO>(`/academic-affairs/semesters/${semesterId}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEMESTERS_KEY });
      await queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      setWindowDraft(null);
      setFormError(null);
      showToast("Academic structure updated.");
    },
    onError: (err) => setFormError(errorMessage(err, "Update failed.")),
  });

  const registrationMutation = useMutation({
    mutationFn: (registrationOpen: boolean) =>
      apiFetch<SemesterDTO>(
        `/academic-affairs/semesters/${semesterId}/registration`,
        { method: "PATCH", body: { registrationOpen } },
      ),
    onSuccess: async (_res, registrationOpen) => {
      await queryClient.invalidateQueries({ queryKey: SEMESTERS_KEY });
      await queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      setFormError(null);
      showToast(
        registrationOpen
          ? "Course registration is now open."
          : "Course registration is now closed.",
      );
    },
    onError: (err) => setFormError(errorMessage(err, "Could not change the registration window.")),
  });

  function handleUpdate() {
    if (!semesterId) {
      setFormError("Select a semester first.");
      return;
    }
    if (!enrollmentStart || !enrollmentEnd) {
      setFormError("Set both a start and an end date for the session window.");
      return;
    }
    if (enrollmentStart >= enrollmentEnd) {
      setFormError("The start date must fall before the end date.");
      return;
    }
    updateSemesterMutation.mutate({
      startDate: enrollmentStart,
      endDate: enrollmentEnd,
    });
  }

  function handleDiscard() {
    setProgramId("");
    setPickedMajorId("");
    setWindowDraft(null);
    setFormError(null);
  }

  const lookupsLoading =
    programsQuery.isLoading || semestersQuery.isLoading || summaryQuery.isLoading;

  return (
    <div>
      <PageHeader
        title="Academic Affairs"
        description="Configure programs, assign structures, and manage session timelines."
        actions={
          <button
            type="button"
            onClick={() => registrationMutation.mutate(!selectedSemester?.registrationOpen)}
            disabled={!semesterId || registrationMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            <UploadCloudIcon className="h-4 w-4 -rotate-90" />
            {selectedSemester?.registrationOpen
              ? "Close Registration"
              : "Open Registration"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-stone-900">
                Academic Program Setup
              </h2>
              {selectedSemester ? (
                <StatusBadge
                  label={`Active: ${selectedSemester.label}`}
                  tone={selectedSemester.registrationOpen ? "green" : "amber"}
                />
              ) : (
                <StatusBadge label="No semester selected" tone="amber" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="aao-program"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Program
                </label>
                <div className="relative">
                  <select
                    id="aao-program"
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    disabled={programsQuery.isLoading}
                    className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
                  >
                    <option value="">
                      {programsQuery.isLoading ? "Loading…" : "All programs"}
                    </option>
                    {programs.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.department.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="aao-major"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Major / Specialization
                </label>
                <div className="relative">
                  <select
                    id="aao-major"
                    value={majorId}
                    onChange={(e) => setPickedMajorId(e.target.value)}
                    disabled={majorsQuery.isLoading}
                    className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
                  >
                    <option value="">
                      {majorsQuery.isLoading ? "Loading…" : "All majors"}
                    </option>
                    {majors.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="aao-semester"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Semester
                </label>
                <div className="relative">
                  <select
                    id="aao-semester"
                    value={semesterId}
                    onChange={(e) => setPickedSemesterId(e.target.value)}
                    disabled={semestersQuery.isLoading}
                    className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
                  >
                    <option value="">
                      {semestersQuery.isLoading ? "Loading…" : "Select a semester"}
                    </option>
                    {semesters.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500">
                  Session Window
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    aria-label="Session start date"
                    value={enrollmentStart}
                    onChange={(e) =>
                      setWindowDraft({ start: e.target.value, end: enrollmentEnd })
                    }
                    disabled={!semesterId}
                    className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
                  />
                  <input
                    type="date"
                    aria-label="Session end date"
                    value={enrollmentEnd}
                    onChange={(e) =>
                      setWindowDraft({ start: enrollmentStart, end: e.target.value })
                    }
                    disabled={!semesterId}
                    className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
              <p className="text-sm font-medium text-rose-600">{formError}</p>
              <div className="ml-auto flex items-center gap-5">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="text-sm font-semibold text-rose-700 hover:underline"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!semesterId || updateSemesterMutation.isPending}
                  className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                >
                  {updateSemesterMutation.isPending
                    ? "Saving…"
                    : "Update Academic Structure"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">
                Registration Monitoring
              </h2>
              <button
                type="button"
                onClick={() => downloadRegistrationCsv(monitorRows)}
                disabled={monitorRows.length === 0}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
              >
                <DownloadIcon className="h-4 w-4" />
                Export Page
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Course Code</th>
                    <th className="px-6 py-3">Course Title</th>
                    <th className="px-6 py-3">Instructor</th>
                    <th className="px-6 py-3">Enrollment</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {classesQuery.isLoading && <LoadingRow colSpan={5} />}
                  {classesQuery.isError && (
                    <ErrorRow
                      colSpan={5}
                      message={classesQuery.error.message}
                      onRetry={() => classesQuery.refetch()}
                    />
                  )}
                  {!classesQuery.isLoading &&
                    !classesQuery.isError &&
                    monitorRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-6 py-4 font-bold text-rose-700">
                          {row.code}
                        </td>
                        <td className="px-6 py-4 text-stone-800">{row.title}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${row.instructorColorClassName}`}
                            >
                              {row.instructorInitials}
                            </span>
                            <span className="text-stone-700">{row.instructor}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className={`h-full rounded-full ${
                                  row.status === "FULL" ? "bg-amber-500" : "bg-rose-800"
                                }`}
                                style={{
                                  width: `${Math.min(100, (row.enrolled / Math.max(1, row.capacity)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-stone-500">
                              {row.enrolled}/{row.capacity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge label={row.status} tone={statusTone[row.status]} />
                        </td>
                      </tr>
                    ))}
                  {!classesQuery.isLoading &&
                    !classesQuery.isError &&
                    monitorRows.length === 0 && (
                      <EmptyRow colSpan={5} label="No classes scheduled for this semester." />
                    )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 text-sm">
              <p className="text-stone-500">
                Page {page} of {pageCount} · {total.toLocaleString()} classes
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-stone-200 px-4 py-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="rounded-lg border border-stone-200 px-4 py-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-rose-800 p-6 text-white">
            <GraduationCapIcon className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-rose-700/60" />
            <p className="relative text-xs font-bold uppercase tracking-wide text-rose-100">
              Registered Students
            </p>
            <p className="relative mt-2 text-4xl font-extrabold">
              {lookupsLoading
                ? "—"
                : (summary?.totalEnrolledStudents ?? 0).toLocaleString()}
            </p>
            <p className="relative mt-2 text-sm font-semibold text-rose-100">
              Across {summary?.totalClasses ?? 0} classes ·{" "}
              {summary?.totalCourses ?? 0} courses
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Schedule Coverage
            </h3>
            <p className="mt-3 text-2xl font-bold text-stone-900">
              {summary?.scheduleCoverage.percent ?? 0}%
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-rose-700"
                style={{ width: `${summary?.scheduleCoverage.percent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {summary?.scheduleCoverage.scheduled ?? 0} of{" "}
              {summary?.scheduleCoverage.total ?? 0} classes have timetable entries.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                Conflict Watch
              </h3>
              <AlertTriangleIcon
                className={`h-5 w-5 ${
                  summary?.conflictCount ? "text-rose-600" : "text-amber-500"
                }`}
              />
            </div>
            <span
              className={`mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                summary?.conflictCount
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CalendarXIcon className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-stone-800">
              {summaryQuery.isLoading
                ? "Checking…"
                : summary?.conflictCount
                  ? `${summary.conflictCount} schedule conflict${summary.conflictCount > 1 ? "s" : ""}`
                  : "No schedule conflicts"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Room and instructor double-bookings are detected across the
              selected semester.
            </p>
            <Link
              href="/academic-affairs/course-registration"
              className="mt-3 inline-block text-sm font-semibold text-rose-700 hover:underline"
            >
              View Global Timetable
            </Link>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Upcoming Deadlines
            </h3>
            {deadlinesQuery.isLoading ? (
              <p className="mt-4 text-sm text-stone-400">Loading…</p>
            ) : deadlines.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                Nothing due in the next 90 days.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {deadlines.map((deadline) => (
                  <li
                    key={deadline.id}
                    className={`flex items-start gap-4 rounded-lg border-l-4 p-3 ${deadline.accentClassName}`}
                  >
                    <div className="text-center leading-none">
                      <p className="text-lg font-extrabold">{deadline.day}</p>
                      <p className="text-[10px] font-bold uppercase">
                        {deadline.month}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">
                        {deadline.title}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {deadline.description}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold">
                        in {deadline.daysAway} day
                        {deadline.daysAway === 1 ? "" : "s"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
