"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  FileTextIcon,
  PlusIcon,
  SparkleIcon,
  UploadCloudIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicSummaryDTO,
  CourseDTO,
  TimetableGenerationResultDTO,
  CourseImportResultDTO,
  DepartmentDTO,
  ScheduleConflictDTO,
  SemesterDTO,
  TimetableEntryDTO,
} from "@/lib/api/types";
import {
  TIMETABLE_DAYS,
  TIMETABLE_TIME_SLOTS,
  fromApiConflict,
  fromApiCourse,
  fromApiSemester,
  fromApiTimetableEntry,
} from "@/lib/academic-affairs/data";

const AAO_KEY = ["academic-affairs"] as const;
const COURSES_KEY = [...AAO_KEY, "courses"] as const;
const TIMETABLES_KEY = [...AAO_KEY, "timetables"] as const;
const CONFLICTS_KEY = [...AAO_KEY, "conflicts"] as const;
const SUMMARY_KEY = [...AAO_KEY, "summary"] as const;
const DEPARTMENTS_KEY = ["lookups", "departments"] as const;
const SEMESTERS_KEY = [...AAO_KEY, "semesters"] as const;

const PAGE_SIZE = 10;
const LOOKUP_LIMIT = 100;

interface NewCourseForm {
  code: string;
  name: string;
  departmentId: string;
  credits: string;
}

const emptyCourseForm: NewCourseForm = {
  code: "",
  name: "",
  departmentId: "",
  credits: "3",
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function CourseRegistrationSchedulingPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  // Only the user's explicit pick is stored; the default is derived from the
  // summary response below, so no effect has to write it back into state.
  const [pickedSemesterId, setPickedSemesterId] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [courseForm, setCourseForm] = useState<NewCourseForm>(emptyCourseForm);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateNote, setGenerateNote] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

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

  // The backend falls back to the most recent semester when none is named.
  const semesterId = pickedSemesterId || summaryQuery.data?.data.semesterId || "";

  const coursesQuery = useApiQuery<CourseDTO[]>(
    [...COURSES_KEY, { page }],
    "/academic-affairs/courses",
    { query: { page, limit: PAGE_SIZE }, placeholderData: (prev) => prev },
  );

  const departmentsQuery = useApiQuery<DepartmentDTO[]>(
    DEPARTMENTS_KEY,
    "/student-affairs/departments",
  );

  const timetableQuery = useApiQuery<TimetableEntryDTO[]>(
    [...TIMETABLES_KEY, { semesterId }],
    "/academic-affairs/timetables",
    { query: { semesterId: semesterId || undefined } },
  );

  const conflictsQuery = useApiQuery<ScheduleConflictDTO[]>(
    [...CONFLICTS_KEY, { semesterId }],
    "/academic-affairs/schedule-conflicts",
    { query: { semesterId: semesterId || undefined } },
  );

  const semesters = useMemo(
    () => (semestersQuery.data?.data ?? []).map(fromApiSemester),
    [semestersQuery.data],
  );
  const summary = summaryQuery.data?.data;
  const departments = useMemo(
    () => departmentsQuery.data?.data ?? [],
    [departmentsQuery.data],
  );

  const courses = useMemo(
    () => (coursesQuery.data?.data ?? []).map(fromApiCourse),
    [coursesQuery.data],
  );

  const timetableEntries = useMemo(
    () => timetableQuery.data?.data ?? [],
    [timetableQuery.data],
  );
  const events = useMemo(
    () => timetableEntries.map(fromApiTimetableEntry),
    [timetableEntries],
  );

  const conflicts = useMemo(
    () => (conflictsQuery.data?.data ?? []).map(fromApiConflict),
    [conflictsQuery.data],
  );

  const total = coursesQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectedSemester = semesters.find((s) => s.id === semesterId);
  const unpublished = timetableEntries.filter((e) => !e.published);

  // The department picker falls back to the first option until the user picks.
  const departmentId = courseForm.departmentId || departments[0]?.id || "";

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function invalidateSchedule() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: TIMETABLES_KEY }),
      queryClient.invalidateQueries({ queryKey: CONFLICTS_KEY }),
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY }),
    ]);
  }

  const createCourseMutation = useMutation({
    mutationFn: (form: NewCourseForm) =>
      apiFetch<CourseDTO>("/academic-affairs/courses", {
        method: "POST",
        body: {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          departmentId: form.departmentId,
          credits: Number(form.credits),
        },
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      await queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      setShowRegisterModal(false);
      setCourseForm(emptyCourseForm);
      setRegisterError(null);
      showToast(`Course "${res.data.code}" has been registered.`);
    },
    onError: (err) => setRegisterError(errorMessage(err, "Could not register the course.")),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const csv = await file.text();
      return apiFetch<CourseImportResultDTO>("/academic-affairs/courses/import", {
        method: "POST",
        body: { csv },
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      await queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      const { createdCount, failedCount, errors } = res.data;
      setShowBulkUploadModal(false);
      setUploadFile(null);
      setUploadError(null);
      showToast(
        failedCount === 0
          ? `Imported ${createdCount} course${createdCount === 1 ? "" : "s"}.`
          : `Imported ${createdCount}, skipped ${failedCount} — first error: ${errors[0]?.message ?? "unknown"}`,
      );
    },
    onError: (err) => setUploadError(errorMessage(err, "Import failed.")),
  });

  /**
   * Auto-allocates conflict-free slots for classes that have none. Classes
   * already on the grid are untouched, so this is safe to re-run.
   */
  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<TimetableGenerationResultDTO>("/academic-affairs/timetables/generate", {
        method: "POST",
        body: { semesterId, sessionsPerClass: 2 },
      }),
    onMutate: () => setGenerateNote(null),
    onSuccess: async (res) => {
      await invalidateSchedule();
      const { scheduled, skipped } = res.data;
      if (scheduled === 0 && skipped.length === 0) {
        setGenerateNote("Every class already has a timetable.");
      } else if (skipped.length > 0) {
        setGenerateNote(
          `Scheduled ${scheduled}. Could not place: ${skipped
            .map((s) => s.courseCode)
            .join(", ")}.`,
        );
      } else {
        showToast(`Scheduled ${scheduled} timetable entr${scheduled === 1 ? "y" : "ies"}.`);
      }
    },
    onError: (err) => setGenerateNote(errorMessage(err, "Could not generate the timetable.")),
  });

  /**
   * The backend publishes one timetable entry at a time, so publishing a
   * schedule fans out over the semester's drafts. Failures are surfaced
   * together rather than aborting partway.
   */
  const publishMutation = useMutation({
    mutationFn: async (entries: TimetableEntryDTO[]) => {
      const results = await Promise.allSettled(
        entries.map((entry) =>
          apiFetch(`/academic-affairs/timetables/${entry.id}/publish`, {
            method: "PATCH",
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { published: results.length - failed, failed };
    },
    onSuccess: async ({ published, failed }) => {
      await invalidateSchedule();
      setPublishError(
        failed > 0 ? `${failed} entr${failed === 1 ? "y" : "ies"} could not be published.` : null,
      );
      if (published > 0) {
        showToast(`Published ${published} timetable entr${published === 1 ? "y" : "ies"}.`);
      }
    },
    onError: (err) => setPublishError(errorMessage(err, "Publish failed.")),
  });

  function selectUploadFile(file: File | undefined | null) {
    if (!file) return;
    // The import endpoint takes CSV text; spreadsheets would need parsing we
    // do not do client-side.
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setUploadError("Please upload a .csv file.");
      return;
    }
    setUploadError(null);
    setUploadFile(file);
  }

  function handleRegisterCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!courseForm.code.trim() || !courseForm.name.trim() || !departmentId) {
      setRegisterError("Course code, title, and department are required.");
      return;
    }
    createCourseMutation.mutate({ ...courseForm, departmentId });
  }

  const publishPercent = summary?.publishing.percent ?? 0;

  return (
    <div>
      <PageHeader
        title="Course Registration & Scheduling"
        description="Manage course offerings and optimize the institutional timetable."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setUploadFile(null);
                setUploadError(null);
                setShowBulkUploadModal(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              <UploadCloudIcon className="h-4 w-4" />
              Bulk Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setCourseForm(emptyCourseForm);
                setRegisterError(null);
                setShowRegisterModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <PlusIcon className="h-4 w-4" />
              Register New Course
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">Course Registry</h2>
              <StatusBadge label={`${total} Total Courses`} tone="rose" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Course Code</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coursesQuery.isLoading && <LoadingRow colSpan={4} />}
                  {coursesQuery.isError && (
                    <ErrorRow
                      colSpan={4}
                      message={coursesQuery.error.message}
                      onRetry={() => coursesQuery.refetch()}
                    />
                  )}
                  {!coursesQuery.isLoading &&
                    !coursesQuery.isError &&
                    courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-6 py-4 font-bold text-rose-700">
                          {course.code}
                        </td>
                        <td className="px-6 py-4 text-stone-800">{course.title}</td>
                        <td className="px-6 py-4 text-stone-600">
                          {course.department}
                        </td>
                        <td className="px-6 py-4 text-stone-600">{course.credits}</td>
                      </tr>
                    ))}
                  {!coursesQuery.isLoading &&
                    !coursesQuery.isError &&
                    courses.length === 0 && (
                      <EmptyRow colSpan={4} label="No courses registered yet." />
                    )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 text-sm">
              <p className="text-stone-500">
                Page {page} of {pageCount} · {total.toLocaleString()} courses
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

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Weekly Timetable</h2>
                <p className="text-sm text-stone-500">
                  {selectedSemester?.label ?? "Select a semester"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    aria-label="Semester"
                    value={semesterId}
                    onChange={(e) => setPickedSemesterId(e.target.value)}
                    disabled={semestersQuery.isLoading}
                    className="appearance-none rounded-lg border border-stone-300 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
                  >
                    <option value="">All semesters</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={!semesterId || generateMutation.isPending}
                  title="Fills empty slots for classes with no timetable yet."
                  className="flex items-center gap-2 rounded-lg bg-rose-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                >
                  <SparkleIcon className="h-4 w-4" />
                  {generateMutation.isPending ? "Generating…" : "Generate Timetable"}
                </button>
              </div>
            </div>

            {generateNote && (
              <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {generateNote}
              </p>
            )}

            {timetableQuery.isError && (
              <p className="mb-4 text-sm font-medium text-rose-600">
                {timetableQuery.error.message}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-20 border-b border-stone-200 bg-white py-3" />
                    {TIMETABLE_DAYS.map((day) => (
                      <th
                        key={day}
                        className="border-b border-l border-stone-200 bg-stone-50 px-3 py-3 text-xs font-bold uppercase tracking-wide text-stone-500"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMETABLE_TIME_SLOTS.map((time) => (
                    <tr key={time}>
                      <td className="border-b border-stone-200 px-2 py-4 align-top text-xs font-semibold text-stone-500">
                        {time}
                      </td>
                      {TIMETABLE_DAYS.map((day) => {
                        const slotEvents = events.filter(
                          (e) => e.day === day && e.slot === time,
                        );
                        return (
                          <td
                            key={day}
                            className="h-24 border-b border-l border-stone-200 p-1.5 align-top"
                          >
                            <div className="flex h-full flex-col gap-1">
                              {slotEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className={`min-h-0 flex-1 rounded-md border-l-4 px-2.5 py-1.5 text-xs ${event.colorClassName}`}
                                >
                                  <p className="truncate font-bold">
                                    {event.title}
                                    {!event.published && (
                                      <span className="ml-1 font-normal opacity-70">
                                        (draft)
                                      </span>
                                    )}
                                  </p>
                                  <p className="mt-0.5 truncate opacity-80">
                                    {event.startTime}–{event.endTime} · {event.location}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!timetableQuery.isLoading && events.length === 0 && (
              <p className="mt-4 text-center text-sm text-stone-400">
                No timetable entries for this semester yet.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">Publishing Workflow</h3>
              <StatusBadge
                label={
                  unpublished.length === 0 && timetableEntries.length > 0
                    ? "• Published"
                    : "• Draft"
                }
                tone={
                  unpublished.length === 0 && timetableEntries.length > 0
                    ? "green"
                    : "amber"
                }
              />
            </div>
            <p className="mt-5 text-sm text-stone-500">
              Published: {publishPercent}%
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-rose-700"
                style={{ width: `${publishPercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPublishError(null);
                publishMutation.mutate(unpublished);
              }}
              disabled={unpublished.length === 0 || publishMutation.isPending}
              className="mt-5 w-full rounded-lg bg-rose-800 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {publishMutation.isPending
                ? "Publishing…"
                : unpublished.length === 0
                  ? "Nothing to publish"
                  : `Publish ${unpublished.length} entr${unpublished.length === 1 ? "y" : "ies"}`}
            </button>
            {publishError && (
              <p className="mt-3 text-center text-xs font-medium text-rose-600">
                {publishError}
              </p>
            )}
            <p className="mt-3 text-center text-xs text-stone-400">
              {summary?.publishing.published ?? 0} of {summary?.publishing.total ?? 0}{" "}
              entries published
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Room Utilization</h3>
            {summaryQuery.isLoading ? (
              <p className="mt-4 text-sm text-stone-400">Loading…</p>
            ) : (summary?.roomUtilization.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                No rooms are booked for this semester.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {summary?.roomUtilization.slice(0, 6).map((room) => (
                  <li key={room.room}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{room.room}</span>
                      <span className="font-bold text-stone-900">
                        {room.slots} slot{room.slots === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-rose-700"
                        style={{ width: `${room.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 border-t border-stone-200 pt-4">
              {conflictsQuery.isLoading ? (
                <p className="text-sm text-stone-400">Checking for conflicts…</p>
              ) : conflicts.length > 0 ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-stone-800">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0 text-rose-600" />
                    {conflicts.length} Schedule Conflict
                    {conflicts.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-2">
                    {conflicts.map((conflict) => (
                      <li key={conflict.id} className="text-xs text-stone-500">
                        <span className="font-semibold text-stone-600">
                          {conflict.kind === "ROOM" ? "Room" : "Instructor"}:
                        </span>{" "}
                        {conflict.description}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-stone-400">
                    Resolve by editing the affected timetable entries — the backend
                    rejects new bookings that would clash.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-emerald-700">
                  No schedule conflicts detected.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Bulk Upload Courses
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Upload a CSV with a{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">
                    code,name,department,credits
                  </code>{" "}
                  header. Use <code className="rounded bg-stone-100 px-1 text-xs">
                    departmentId
                  </code>{" "}
                  instead of{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">department</code>{" "}
                  to match by id.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDraggingUpload
                  ? "border-rose-400 bg-rose-100/60"
                  : "border-rose-200 bg-rose-50/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingUpload(true);
              }}
              onDragLeave={() => setIsDraggingUpload(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingUpload(false);
                selectUploadFile(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <UploadCloudIcon className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-stone-800">
                Drag and drop your file here
              </p>
              <p className="mt-1 text-xs text-stone-500">Supports .csv files</p>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => selectUploadFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <UploadCloudIcon className="h-4 w-4" />
                Browse Files
              </button>

              {uploadFile && (
                <div className="mx-auto mt-4 flex max-w-xs items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-stone-700">
                    <FileTextIcon className="h-4 w-4 shrink-0 text-rose-600" />
                    <span className="truncate">{uploadFile.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    aria-label="Remove file"
                    className="shrink-0 text-stone-400 hover:text-rose-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{uploadError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!uploadFile) {
                    setUploadError("Please select a file to upload.");
                    return;
                  }
                  importMutation.mutate(uploadFile);
                }}
                disabled={importMutation.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {importMutation.isPending ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleRegisterCourse}
            noValidate
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Register New Course
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Add a course to the registry. Instructors are assigned later,
                  when a class is scheduled for this course.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="course-code"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Course Code
                  </label>
                  <input
                    id="course-code"
                    required
                    placeholder="e.g. CS101"
                    value={courseForm.code}
                    onChange={(e) =>
                      setCourseForm((f) => ({ ...f, code: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="course-credits"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Credits
                  </label>
                  <input
                    id="course-credits"
                    required
                    type="number"
                    min={1}
                    max={20}
                    value={courseForm.credits}
                    onChange={(e) =>
                      setCourseForm((f) => ({ ...f, credits: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="course-title"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Course Title
                </label>
                <input
                  id="course-title"
                  required
                  placeholder="e.g. Intro to Computer Science"
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                />
              </div>
              <div>
                <label
                  htmlFor="course-department"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Department
                </label>
                <div className="relative">
                  <select
                    id="course-department"
                    value={departmentId}
                    onChange={(e) =>
                      setCourseForm((f) => ({ ...f, departmentId: e.target.value }))
                    }
                    disabled={departmentsQuery.isLoading}
                    className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
                  >
                    {departmentsQuery.isLoading && <option>Loading…</option>}
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>
            </div>

            {registerError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{registerError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCourseMutation.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {createCourseMutation.isPending ? "Registering…" : "Register Course"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-xl">
          <CheckCircleIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
