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
  ExamDTO,
  TeacherDashboardDTO,
  TeacherExamPaperDTO,
} from "@/lib/api/types";
import { examPaperTone, fromApiTeacherClass } from "@/lib/teacher/dashboard-data";
import { DOCUMENT_UPLOAD_TYPES } from "@/lib/api/upload";
import { formatDate, timeRange, titleCase } from "@/lib/format";

const TEACHER_KEY = ["teacher"] as const;
const EXAMS_KEY = [...TEACHER_KEY, "exams"] as const;
const PAPERS_KEY = [...TEACHER_KEY, "exam-papers"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function TeacherExamPapersPage() {
  const queryClient = useQueryClient();

  const [pickedClassId, setPickedClassId] = useState("");
  const [pickedExamId, setPickedExamId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [pending, setPending] = useState<{ name: string; url: string; size: number | null } | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Class → exam → paper ──────────────────────────────────────────────────

  const dashboardQuery = useApiQuery<TeacherDashboardDTO>(
    [...TEACHER_KEY, "dashboard"],
    "/teacher/me/dashboard",
  );

  const classes = useMemo(
    () => (dashboardQuery.data?.data.classes ?? []).map(fromApiTeacherClass),
    [dashboardQuery.data],
  );

  const classId = pickedClassId || classes[0]?.id || "";
  const selectedClass = classes.find((c) => c.id === classId);

  // Teachers can read the COE's exam list; it is the only place exams live.
  const examsQuery = useApiQuery<ExamDTO[]>(
    [...EXAMS_KEY, { classId }],
    "/coe/exams",
    { query: { classId, limit: 100 }, enabled: Boolean(classId) },
  );

  const exams = useMemo(() => examsQuery.data?.data ?? [], [examsQuery.data]);

  const examId = exams.some((e) => e.id === pickedExamId)
    ? pickedExamId
    : exams[0]?.id ?? "";
  const selectedExam = exams.find((e) => e.id === examId);

  // Scoped to the caller by the backend, so this returns only their own papers.
  const papersQuery = useApiQuery<TeacherExamPaperDTO[]>(
    [...PAPERS_KEY, { examId }],
    `/teacher/exams/${examId}/exam-papers`,
    { query: { limit: 50 }, enabled: Boolean(examId) },
  );

  const papers = useMemo(() => papersQuery.data?.data ?? [], [papersQuery.data]);
  const existingPaper = papers[0] ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const savePaper = useMutation({
    mutationFn: (url: string) =>
      existingPaper
        ? apiFetch<TeacherExamPaperDTO>(`/teacher/exam-papers/${existingPaper.id}`, {
            method: "PATCH",
            body: { fileUrl: url },
          })
        : apiFetch<TeacherExamPaperDTO>(`/teacher/exams/${examId}/exam-papers`, {
            method: "POST",
            body: { fileUrl: url },
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PAPERS_KEY });
      setShowUpload(false);
      setPending(null);
      setFormError(null);
      showToast(existingPaper ? "Exam paper updated." : "Exam paper uploaded.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not save the paper.")),
  });

  const submitPaper = useMutation({
    mutationFn: (id: string) =>
      apiFetch<TeacherExamPaperDTO>(`/teacher/exam-papers/${id}/submit`, {
        method: "PATCH",
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PAPERS_KEY });
      showToast("Paper submitted to the Controller of Examination.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not submit the paper.")),
  });

  return (
    <div>
      <PageHeader
        title="Exam Papers"
        description="Draft, revise, and submit exam papers to the Controller of Examination."
        actions={
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setFormError(null);
              setShowUpload(true);
            }}
            disabled={!examId || existingPaper?.status === "RECEIVED"}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" />
            {existingPaper ? "Update Paper" : "Add Paper"}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Class"
          value={classId}
          onChange={(e) => {
            setPickedClassId(e.target.value);
            setPickedExamId("");
          }}
          disabled={dashboardQuery.isLoading || classes.length === 0}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
        >
          {classes.length === 0 && <option>No classes assigned</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Exam"
          value={examId}
          onChange={(e) => setPickedExamId(e.target.value)}
          disabled={examsQuery.isLoading || exams.length === 0}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
        >
          {exams.length === 0 && <option>No exams scheduled</option>}
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {titleCase(e.examType)} · {formatDate(e.examDate)}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p className="mb-4 text-sm font-medium text-rose-600">{actionError}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 p-6">
            <h2 className="text-xl font-bold text-stone-900">Your Papers</h2>
            <StatusBadge label={`${papers.length} for this exam`} tone="rose" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-6 py-3">Paper</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {papersQuery.isLoading && <LoadingRow colSpan={4} />}
                {papersQuery.isError && (
                  <ErrorRow
                    colSpan={4}
                    message={papersQuery.error.message}
                    onRetry={() => papersQuery.refetch()}
                  />
                )}
                {!papersQuery.isLoading &&
                  !papersQuery.isError &&
                  papers.map((paper) => (
                    <tr key={paper.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <FileTextIcon className="h-4 w-4 shrink-0 text-rose-600" />
                          <a
                            href={paper.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-medium text-stone-800 hover:text-rose-700 hover:underline"
                          >
                            {paper.fileUrl.split("/").pop()}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          label={titleCase(paper.status)}
                          tone={examPaperTone[paper.status]}
                        />
                      </td>
                      <td className="px-6 py-4 text-stone-600">
                        {formatDate(paper.submittedAt, "Not submitted")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {paper.status === "DRAFT" ? (
                          <button
                            type="button"
                            disabled={submitPaper.isPending}
                            onClick={() => submitPaper.mutate(paper.id)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline disabled:text-stone-300"
                          >
                            <SendIcon className="h-3.5 w-3.5" />
                            Submit
                          </button>
                        ) : paper.status === "SUBMITTED" ? (
                          <span className="text-xs text-stone-400">Awaiting COE</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">
                            Received
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                {!papersQuery.isLoading && !papersQuery.isError && papers.length === 0 && (
                  <EmptyRow
                    colSpan={4}
                    label={
                      examId
                        ? "You have not added a paper for this exam yet."
                        : "Select an exam to manage its paper."
                    }
                  />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Exam Details</h3>
            {selectedExam ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Course</dt>
                  <dd className="font-semibold text-stone-800">
                    {selectedExam.class.course.code}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Type</dt>
                  <dd className="text-stone-700">{titleCase(selectedExam.examType)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Date</dt>
                  <dd className="text-stone-700">{formatDate(selectedExam.examDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Time</dt>
                  <dd className="text-stone-700">
                    {timeRange(selectedExam.startTime, selectedExam.endTime)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Status</dt>
                  <dd>
                    <StatusBadge label={titleCase(selectedExam.status)} tone="sky" />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Semester</dt>
                  <dd className="text-stone-700">{selectedExam.semester.name}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-stone-400">
                {examsQuery.isLoading
                  ? "Loading…"
                  : "No exam scheduled for this class yet. The Controller of Examination creates exams."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Class
            </h3>
            <p className="mt-3 font-semibold text-stone-800">
              {selectedClass?.code ?? "—"}
            </p>
            <p className="text-sm text-stone-500">{selectedClass?.name ?? ""}</p>
            <p className="mt-2 text-xs text-stone-500">
              {selectedClass?.enrolled ?? 0} students enrolled
            </p>
          </div>
        </aside>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!pending) {
                setFormError("Upload a file first.");
                return;
              }
              savePaper.mutate(pending.url);
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {existingPaper ? "Update Exam Paper" : "Add Exam Paper"}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {selectedExam
                    ? `${titleCase(selectedExam.examType)} · ${selectedExam.class.course.code}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              {pending ? (
                <UploadedFileRow
                  name={pending.name}
                  url={pending.url}
                  size={pending.size}
                  onRemove={() => setPending(null)}
                />
              ) : (
                <FileDropzone
                  accept={DOCUMENT_UPLOAD_TYPES}
                  acceptLabel="PDF or spreadsheet, up to 5 MB"
                  onUploaded={(file, original) =>
                    setPending({ name: original.name, url: file.url, size: file.size })
                  }
                />
              )}
              {existingPaper && !pending && (
                <p className="mt-2 text-xs text-stone-500">
                  Uploading a new file replaces the current paper.
                </p>
              )}
            </div>

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savePaper.isPending || !pending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {savePaper.isPending ? "Saving…" : "Save Paper"}
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
