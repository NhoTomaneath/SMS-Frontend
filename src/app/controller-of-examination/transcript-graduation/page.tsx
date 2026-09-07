"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import { FileDropzone, UploadedFileRow } from "@/components/file-upload";
import {
  CheckCircleIcon,
  FileTextIcon,
  PlusIcon,
  SendIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicYearDTO,
  GraduationRecordDTO,
  GraduationRecordStatusDTO,
  GraduationReportDTO,
  StudentDTO,
  TranscriptDTO,
  TranscriptStatusDTO,
} from "@/lib/api/types";
import {
  GRADUATION_STATUS_OPTIONS,
  graduationTone,
  transcriptTone,
} from "@/lib/coe/exam-setup-data";
import { DOCUMENT_UPLOAD_TYPES } from "@/lib/api/upload";
import { avatarColor, formatDate, fullName, initialsOf, titleCase } from "@/lib/format";

const COE_KEY = ["coe"] as const;
const TRANSCRIPTS_KEY = [...COE_KEY, "transcripts"] as const;
const REPORTS_KEY = [...COE_KEY, "graduation-reports"] as const;
const RECORDS_KEY = [...COE_KEY, "graduation-records"] as const;

const PAGE_SIZE = 10;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function TranscriptGraduationPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"transcripts" | "graduation">("transcripts");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TranscriptStatusDTO>("ALL");
  const [pickedReportId, setPickedReportId] = useState("");

  const [showRequest, setShowRequest] = useState(false);
  const [requestStudentId, setRequestStudentId] = useState("");
  const [showNewReport, setShowNewReport] = useState(false);
  const [newReportYearId, setNewReportYearId] = useState("");

  // Generating a transcript means attaching the prepared PDF to the request.
  const [generateFor, setGenerateFor] = useState<TranscriptDTO | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<
    { name: string; url: string; size: number | null } | null
  >(null);
  const [reportFile, setReportFile] = useState<
    { name: string; url: string; size: number | null } | null
  >(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const transcriptsQuery = useApiQuery<TranscriptDTO[]>(
    [...TRANSCRIPTS_KEY, { page, statusFilter }],
    "/coe/transcripts",
    {
      query: {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      },
      placeholderData: (prev) => prev,
    },
  );

  const reportsQuery = useApiQuery<GraduationReportDTO[]>(
    REPORTS_KEY,
    "/coe/graduation-reports",
    { query: { limit: 50 } },
  );

  const yearsQuery = useApiQuery<AcademicYearDTO[]>(
    ["lookups", "academic-years"],
    "/student-affairs/academic-years",
  );

  // The COE cannot read /student-affairs/students, so the transcript request
  // picker is seeded from students who already have a graduation record.
  const studentsQuery = useApiQuery<StudentDTO[]>(
    [...COE_KEY, "students"],
    "/student-affairs/students",
    { query: { limit: 100 }, retry: false },
  );

  const reports = useMemo(() => reportsQuery.data?.data ?? [], [reportsQuery.data]);
  const reportId = reports.some((r) => r.id === pickedReportId)
    ? pickedReportId
    : reports[0]?.id ?? "";
  const selectedReport = reports.find((r) => r.id === reportId);

  const recordsQuery = useApiQuery<GraduationRecordDTO[]>(
    [...RECORDS_KEY, { reportId }],
    `/coe/graduation-reports/${reportId}/records`,
    { query: { limit: 100 }, enabled: Boolean(reportId) },
  );

  const transcripts = useMemo(
    () => transcriptsQuery.data?.data ?? [],
    [transcriptsQuery.data],
  );
  const records = useMemo(() => recordsQuery.data?.data ?? [], [recordsQuery.data]);
  const years = useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data]);
  const students = studentsQuery.data?.data ?? [];

  const total = transcriptsQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const yearId = newReportYearId || years[0]?.id || "";

  // ── Mutations ─────────────────────────────────────────────────────────────

  const requestTranscript = useMutation({
    mutationFn: () =>
      apiFetch<TranscriptDTO>("/coe/transcripts", {
        method: "POST",
        body: { studentId: requestStudentId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSCRIPTS_KEY });
      setShowRequest(false);
      setRequestStudentId("");
      setFormError(null);
      showToast("Transcript requested.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not request the transcript.")),
  });

  const generateTranscript = useMutation({
    mutationFn: ({ id, fileUrl }: { id: string; fileUrl: string }) =>
      apiFetch<TranscriptDTO>(`/coe/transcripts/${id}/generate`, {
        method: "PATCH",
        body: { fileUrl },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSCRIPTS_KEY });
      setGenerateFor(null);
      setTranscriptFile(null);
      showToast("Transcript generated and attached.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not generate the transcript.")),
  });

  const createReport = useMutation({
    mutationFn: () =>
      apiFetch<GraduationReportDTO>("/coe/graduation-reports", {
        method: "POST",
        body: {
          academicYearId: yearId,
          ...(reportFile ? { fileUrl: reportFile.url } : {}),
        },
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      setShowNewReport(false);
      setReportFile(null);
      setFormError(null);
      setPickedReportId(res.data.id);
      showToast("Graduation report created.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not create the report.")),
  });

  const sendReport = useMutation({
    mutationFn: (id: string) =>
      apiFetch<GraduationReportDTO>(`/coe/graduation-reports/${id}/send`, {
        method: "PATCH",
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      showToast("Report sent to the Principal.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not send the report.")),
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GraduationRecordStatusDTO }) =>
      apiFetch<GraduationRecordDTO>(`/coe/graduation-records/${id}`, {
        method: "PATCH",
        body: {
          status,
          ...(status === "GRADUATED"
            ? { graduationDate: new Date().toISOString().slice(0, 10) }
            : {}),
        },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RECORDS_KEY });
      showToast("Graduation record updated.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not update the record.")),
  });

  const recordCounts = useMemo(
    () => ({
      eligible: records.filter((r) => r.status === "ELIGIBLE").length,
      graduated: records.filter((r) => r.status === "GRADUATED").length,
      notEligible: records.filter((r) => r.status === "NOT_ELIGIBLE").length,
    }),
    [records],
  );

  return (
    <div>
      <PageHeader
        title="Transcripts & Graduation"
        description="Generate transcripts and compile graduation reports for the Principal."
        actions={
          tab === "transcripts" ? (
            <button
              type="button"
              onClick={() => {
                setRequestStudentId("");
                setFormError(null);
                setShowRequest(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <PlusIcon className="h-4 w-4" />
              Request Transcript
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowNewReport(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <PlusIcon className="h-4 w-4" />
              New Report
            </button>
          )
        }
      />

      <div className="mb-6 inline-flex items-center gap-1 rounded-lg bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setTab("transcripts")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            tab === "transcripts" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
          }`}
        >
          Transcripts
        </button>
        <button
          type="button"
          onClick={() => setTab("graduation")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            tab === "graduation" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
          }`}
        >
          Graduation
        </button>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      {tab === "transcripts" ? (
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-5">
            <h2 className="text-xl font-bold text-stone-900">Transcript Requests</h2>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "ALL" | TranscriptStatusDTO);
              }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400"
            >
              <option value="ALL">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="GENERATED">Generated</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Generated</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transcriptsQuery.isLoading && <LoadingRow colSpan={5} />}
                {transcriptsQuery.isError && (
                  <ErrorRow
                    colSpan={5}
                    message={transcriptsQuery.error.message}
                    onRetry={() => transcriptsQuery.refetch()}
                  />
                )}
                {!transcriptsQuery.isLoading &&
                  !transcriptsQuery.isError &&
                  transcripts.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(t.studentId)}`}
                          >
                            {initialsOf(t.student.firstName, t.student.lastName)}
                          </span>
                          <div>
                            <p className="font-medium text-stone-800">
                              {fullName(t.student.firstName, t.student.lastName)}
                            </p>
                            <p className="font-mono text-xs text-stone-400">
                              {t.student.studentNumber}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-stone-600">
                        {formatDate(t.requestedAt)}
                      </td>
                      <td className="px-5 py-3 text-stone-600">
                        {formatDate(t.generatedAt, "—")}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={titleCase(t.status)}
                          tone={transcriptTone[t.status]}
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {t.status === "GENERATED" ? (
                          t.fileUrl ? (
                            <a
                              href={t.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline"
                            >
                              <FileTextIcon className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-stone-400">No file</span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setGenerateFor(t);
                              setTranscriptFile(null);
                              setFormError(null);
                            }}
                            className="text-sm font-semibold text-rose-700 hover:underline"
                          >
                            Generate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                {!transcriptsQuery.isLoading &&
                  !transcriptsQuery.isError &&
                  transcripts.length === 0 && (
                    <EmptyRow colSpan={5} label="No transcript requests." />
                  )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm">
            <p className="text-stone-500">
              Page {page} of {pageCount} · {total} requests
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
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Graduation Records</h2>
                <p className="text-sm text-stone-500">
                  {selectedReport
                    ? `${selectedReport.academicYear.yearLabel} · ${records.length} students`
                    : "No report selected"}
                </p>
              </div>
              <select
                aria-label="Graduation report"
                value={reportId}
                onChange={(e) => setPickedReportId(e.target.value)}
                disabled={reports.length === 0}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
              >
                {reports.length === 0 && <option>No reports</option>}
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.academicYear.yearLabel} ·{" "}
                    {r.sentToPrincipal ? "Sent" : "Draft"}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Graduation Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Set Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recordsQuery.isLoading && <LoadingRow colSpan={4} />}
                  {recordsQuery.isError && (
                    <ErrorRow
                      colSpan={4}
                      message={recordsQuery.error.message}
                      onRetry={() => recordsQuery.refetch()}
                    />
                  )}
                  {!recordsQuery.isLoading &&
                    !recordsQuery.isError &&
                    records.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(r.studentId)}`}
                            >
                              {initialsOf(r.student.firstName, r.student.lastName)}
                            </span>
                            <div>
                              <p className="font-medium text-stone-800">
                                {fullName(r.student.firstName, r.student.lastName)}
                              </p>
                              <p className="font-mono text-xs text-stone-400">
                                {r.student.studentNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-stone-600">
                          {formatDate(r.graduationDate, "—")}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge
                            label={titleCase(r.status)}
                            tone={graduationTone[r.status]}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {GRADUATION_STATUS_OPTIONS.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                disabled={updateRecord.isPending || r.status === o.value}
                                onClick={() =>
                                  updateRecord.mutate({ id: r.id, status: o.value })
                                }
                                className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-40 ${
                                  r.status === o.value
                                    ? "border-rose-700 bg-rose-700 text-white"
                                    : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!recordsQuery.isLoading &&
                    !recordsQuery.isError &&
                    records.length === 0 && (
                      <EmptyRow colSpan={4} label="No records in this report." />
                    )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="text-lg font-bold text-stone-900">Report Status</h3>
              {selectedReport ? (
                <>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-stone-500">Academic year</dt>
                      <dd className="font-semibold text-stone-800">
                        {selectedReport.academicYear.yearLabel}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500">Generated</dt>
                      <dd className="text-stone-700">
                        {formatDate(selectedReport.generatedAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500">Delivered</dt>
                      <dd>
                        <StatusBadge
                          label={selectedReport.sentToPrincipal ? "Sent" : "Draft"}
                          tone={selectedReport.sentToPrincipal ? "green" : "amber"}
                        />
                      </dd>
                    </div>
                  </dl>
                  {!selectedReport.sentToPrincipal && (
                    <button
                      type="button"
                      disabled={sendReport.isPending}
                      onClick={() => sendReport.mutate(selectedReport.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-800 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      <SendIcon className="h-4 w-4" />
                      Send to Principal
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-stone-400">
                  Create a report to start compiling graduation records.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                Breakdown
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-stone-600">Eligible</span>
                  <span className="font-bold text-stone-900">
                    {recordCounts.eligible}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-stone-600">Graduated</span>
                  <span className="font-bold text-stone-900">
                    {recordCounts.graduated}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-stone-600">Not eligible</span>
                  <span className="font-bold text-stone-900">
                    {recordCounts.notEligible}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!requestStudentId) {
                setFormError("Select a student.");
                return;
              }
              requestTranscript.mutate();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900">Request Transcript</h3>
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="t-student"
              className="mt-5 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Student
            </label>
            {studentsQuery.isError ? (
              <input
                id="t-student"
                required
                placeholder="Student UUID"
                value={requestStudentId}
                onChange={(e) => setRequestStudentId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 font-mono text-xs outline-none focus:border-rose-400"
              />
            ) : (
              <select
                id="t-student"
                value={requestStudentId}
                onChange={(e) => setRequestStudentId(e.target.value)}
                disabled={studentsQuery.isLoading}
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentNumber} — {fullName(s.firstName, s.lastName)}
                  </option>
                ))}
              </select>
            )}
            {studentsQuery.isError && (
              <p className="mt-1.5 text-xs text-stone-500">
                The student directory is Student Affairs–only, so paste the record
                id here.
              </p>
            )}

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestTranscript.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {requestTranscript.isPending ? "Requesting…" : "Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showNewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!yearId) {
                setFormError("Select an academic year.");
                return;
              }
              createReport.mutate();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                New Graduation Report
              </h3>
              <button
                type="button"
                onClick={() => setShowNewReport(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="r-year"
              className="mt-5 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Academic Year
            </label>
            <select
              id="r-year"
              value={yearId}
              onChange={(e) => setNewReportYearId(e.target.value)}
              disabled={yearsQuery.isLoading}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.yearLabel}
                </option>
              ))}
            </select>

            <p className="mt-4 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
              Report File (optional)
            </p>
            {reportFile ? (
              <UploadedFileRow
                name={reportFile.name}
                url={reportFile.url}
                size={reportFile.size}
                onRemove={() => setReportFile(null)}
              />
            ) : (
              <FileDropzone
                compact
                accept={DOCUMENT_UPLOAD_TYPES}
                acceptLabel="PDF or spreadsheet, up to 5 MB"
                onUploaded={(file, original) =>
                  setReportFile({ name: original.name, url: file.url, size: file.size })
                }
              />
            )}

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowNewReport(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createReport.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {createReport.isPending ? "Creating…" : "Create Report"}
              </button>
            </div>
          </form>
        </div>
      )}

      {generateFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!transcriptFile) {
                setFormError("Upload the prepared transcript first.");
                return;
              }
              generateTranscript.mutate({
                id: generateFor.id,
                fileUrl: transcriptFile.url,
              });
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Generate Transcript
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {fullName(
                    generateFor.student.firstName,
                    generateFor.student.lastName,
                  )}{" "}
                  · {generateFor.student.studentNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGenerateFor(null)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              {transcriptFile ? (
                <UploadedFileRow
                  name={transcriptFile.name}
                  url={transcriptFile.url}
                  size={transcriptFile.size}
                  onRemove={() => setTranscriptFile(null)}
                />
              ) : (
                <FileDropzone
                  accept={DOCUMENT_UPLOAD_TYPES}
                  acceptLabel="PDF or spreadsheet, up to 5 MB"
                  onUploaded={(file, original) =>
                    setTranscriptFile({
                      name: original.name,
                      url: file.url,
                      size: file.size,
                    })
                  }
                />
              )}
              <p className="mt-2 text-xs text-stone-500">
                The API stores the document and marks the request generated;
                there is no server-side transcript renderer, so attach the
                prepared file.
              </p>
            </div>

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setGenerateFor(null)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generateTranscript.isPending || !transcriptFile}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {generateTranscript.isPending ? "Generating…" : "Generate"}
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
