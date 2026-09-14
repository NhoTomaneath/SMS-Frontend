"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  FileTextIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  ClassDTO,
  CoeExamPaperDTO,
  ExamDTO,
  ExamRoomAssignmentDTO,
  ExamRoomDTO,
  ExamStatusDTO,
  InvigilatorDTO,
  TeacherOptionDTO,
} from "@/lib/api/types";
import {
  EXAM_STATUS_FLOW,
  EXAM_TYPE_OPTIONS,
  examPaperTone,
  examStatusTone,
  fromApiExam,
} from "@/lib/coe/exam-setup-data";
import { fullName, titleCase } from "@/lib/format";

const COE_KEY = ["coe"] as const;
const EXAMS_KEY = [...COE_KEY, "exams"] as const;
const ROOMS_KEY = [...COE_KEY, "exam-rooms"] as const;
const PAPERS_KEY = [...COE_KEY, "exam-papers"] as const;
const LOGISTICS_KEY = [...COE_KEY, "logistics"] as const;

const PAGE_SIZE = 10;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

const emptyExamForm = {
  classId: "",
  examType: "MIDTERM",
  examDate: "",
  startTime: "09:00",
  endTime: "11:00",
};

export default function ExamSetupPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExamStatusDTO>("ALL");
  const [pickedExamId, setPickedExamId] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyExamForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [roomToAssign, setRoomToAssign] = useState("");
  const [invigilatorToAssign, setInvigilatorToAssign] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const examsQuery = useApiQuery<ExamDTO[]>(
    [...EXAMS_KEY, { page, statusFilter }],
    "/coe/exams",
    {
      query: {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      },
      placeholderData: (prev) => prev,
    },
  );

  const roomsQuery = useApiQuery<ExamRoomDTO[]>(ROOMS_KEY, "/coe/exam-rooms", {
    query: { limit: 100 },
  });

  const classesQuery = useApiQuery<ClassDTO[]>(
    [...COE_KEY, "classes"],
    "/academic-affairs/classes",
    { query: { limit: 100 } },
  );

  const teachersQuery = useApiQuery<TeacherOptionDTO[]>(
    [...COE_KEY, "teachers"],
    "/academic-affairs/teachers",
  );

  const exams = useMemo(
    () => (examsQuery.data?.data ?? []).map(fromApiExam),
    [examsQuery.data],
  );

  const examId = exams.some((e) => e.id === pickedExamId)
    ? pickedExamId
    : exams[0]?.id ?? "";
  const selectedExam = exams.find((e) => e.id === examId);

  const papersQuery = useApiQuery<CoeExamPaperDTO[]>(
    [...PAPERS_KEY, { examId }],
    "/coe/exam-papers",
    { query: { examId, limit: 50 }, enabled: Boolean(examId) },
  );

  const roomAssignmentsQuery = useApiQuery<ExamRoomAssignmentDTO[]>(
    [...LOGISTICS_KEY, "rooms", { examId }],
    `/coe/exams/${examId}/rooms`,
    { enabled: Boolean(examId) },
  );

  const invigilatorsQuery = useApiQuery<InvigilatorDTO[]>(
    [...LOGISTICS_KEY, "invigilators", { examId }],
    `/coe/exams/${examId}/invigilators`,
    { enabled: Boolean(examId) },
  );

  const rooms = roomsQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];
  const teachers = teachersQuery.data?.data ?? [];
  const papers = papersQuery.data?.data ?? [];
  const assignedRooms = roomAssignmentsQuery.data?.data ?? [];
  const invigilators = invigilatorsQuery.data?.data ?? [];

  const total = examsQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The exam's semester follows its class — the API needs both.
  const selectedClass = classes.find((c) => c.id === form.classId);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function invalidateExam() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: EXAMS_KEY }),
      queryClient.invalidateQueries({ queryKey: LOGISTICS_KEY }),
      queryClient.invalidateQueries({ queryKey: PAPERS_KEY }),
    ]);
  }

  const createExam = useMutation({
    mutationFn: () =>
      apiFetch<ExamDTO>("/coe/exams", {
        method: "POST",
        body: {
          classId: form.classId,
          semesterId: selectedClass?.semesterId,
          examType: form.examType,
          examDate: form.examDate,
          startTime: form.startTime,
          endTime: form.endTime,
        },
      }),
    onSuccess: async (res) => {
      await invalidateExam();
      setShowCreate(false);
      setForm(emptyExamForm);
      setFormError(null);
      setPickedExamId(res.data.id);
      showToast("Exam created.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not create the exam.")),
  });

  const advanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExamStatusDTO }) =>
      apiFetch<ExamDTO>(`/coe/exams/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async (_res, { status }) => {
      await invalidateExam();
      showToast(`Exam marked ${titleCase(status)}.`);
    },
    onError: (err) => setActionError(errorMessage(err, "Could not update the status.")),
  });

  const receivePaper = useMutation({
    mutationFn: (id: string) =>
      apiFetch<CoeExamPaperDTO>(`/coe/exam-papers/${id}/receive`, { method: "PATCH" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateExam();
      showToast("Exam paper marked received.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not receive the paper.")),
  });

  const assignRoom = useMutation({
    mutationFn: () =>
      apiFetch<ExamRoomAssignmentDTO>(`/coe/exams/${examId}/rooms`, {
        method: "POST",
        body: { examRoomId: roomToAssign },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateExam();
      setRoomToAssign("");
      showToast("Room assigned.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not assign the room.")),
  });

  const unassignRoom = useMutation({
    mutationFn: (examRoomId: string) =>
      apiFetch(`/coe/exams/${examId}/rooms/${examRoomId}`, { method: "DELETE" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateExam();
      showToast("Room unassigned.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not unassign the room.")),
  });

  const assignInvigilator = useMutation({
    mutationFn: () =>
      apiFetch<InvigilatorDTO>(`/coe/exams/${examId}/invigilators`, {
        method: "POST",
        body: { teacherId: invigilatorToAssign },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateExam();
      setInvigilatorToAssign("");
      showToast("Invigilator assigned.");
    },
    onError: (err) =>
      setActionError(errorMessage(err, "Could not assign the invigilator.")),
  });

  const unassignInvigilator = useMutation({
    mutationFn: (teacherId: string) =>
      apiFetch(`/coe/exams/${examId}/invigilators/${teacherId}`, { method: "DELETE" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateExam();
      showToast("Invigilator removed.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not remove the invigilator.")),
  });

  const nextStatus = selectedExam
    ? EXAM_STATUS_FLOW[EXAM_STATUS_FLOW.indexOf(selectedExam.status) + 1]
    : undefined;

  return (
    <div>
      <PageHeader
        title="Exam Setup & Logistics"
        description="Schedule exams, receive papers, and assign rooms and invigilators."
        actions={
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyExamForm, classId: classes[0]?.id ?? "" });
              setFormError(null);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            <PlusIcon className="h-4 w-4" />
            Create Exam
          </button>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-5">
            <h2 className="text-xl font-bold text-stone-900">Exam Schedule</h2>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "ALL" | ExamStatusDTO);
              }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400"
            >
              <option value="ALL">All statuses</option>
              {EXAM_STATUS_FLOW.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Date &amp; Time</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {examsQuery.isLoading && <LoadingRow colSpan={4} />}
                {examsQuery.isError && (
                  <ErrorRow
                    colSpan={4}
                    message={examsQuery.error.message}
                    onRetry={() => examsQuery.refetch()}
                  />
                )}
                {!examsQuery.isLoading &&
                  !examsQuery.isError &&
                  exams.map((exam) => (
                    <tr
                      key={exam.id}
                      onClick={() => setPickedExamId(exam.id)}
                      className={`cursor-pointer ${
                        exam.id === examId ? "bg-rose-50" : "hover:bg-stone-50"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-rose-700">{exam.code}</p>
                        <p className="text-xs text-stone-500">{exam.subject}</p>
                      </td>
                      <td className="px-5 py-4 text-stone-600">{exam.examType}</td>
                      <td className="px-5 py-4">
                        <p className="text-stone-700">{exam.date}</p>
                        <p className="text-xs text-stone-400">{exam.time}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          label={titleCase(exam.status)}
                          tone={examStatusTone[exam.status]}
                        />
                      </td>
                    </tr>
                  ))}
                {!examsQuery.isLoading && !examsQuery.isError && exams.length === 0 && (
                  <EmptyRow colSpan={4} label="No exams match this filter." />
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm">
            <p className="text-stone-500">
              Page {page} of {pageCount} · {total} exams
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

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">
              {selectedExam ? selectedExam.code : "Select an exam"}
            </h3>
            <p className="text-sm text-stone-500">
              {selectedExam ? `${selectedExam.examType} · ${selectedExam.date}` : ""}
            </p>

            {selectedExam && nextStatus && (
              <button
                type="button"
                disabled={advanceStatus.isPending}
                onClick={() =>
                  advanceStatus.mutate({ id: selectedExam.id, status: nextStatus })
                }
                className="mt-4 w-full rounded-lg bg-rose-800 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                Mark {titleCase(nextStatus)}
              </button>
            )}
            {selectedExam && !nextStatus && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                Exam completed
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Exam Papers
            </h3>
            {papersQuery.isLoading ? (
              <p className="mt-3 text-sm text-stone-400">Loading…</p>
            ) : papers.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">
                No paper submitted for this exam yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {papers.map((paper) => (
                  <li
                    key={paper.id}
                    className="rounded-lg border border-stone-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-800">
                          {fullName(paper.teacher.firstName, paper.teacher.lastName)}
                        </p>
                        <a
                          href={paper.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 truncate text-xs text-rose-700 hover:underline"
                        >
                          <FileTextIcon className="h-3 w-3 shrink-0" />
                          {paper.fileUrl.split("/").pop()}
                        </a>
                      </div>
                      <StatusBadge
                        label={titleCase(paper.status)}
                        tone={examPaperTone[paper.status]}
                      />
                    </div>
                    {paper.status === "SUBMITTED" && (
                      <button
                        type="button"
                        disabled={receivePaper.isPending}
                        onClick={() => receivePaper.mutate(paper.id)}
                        className="mt-2 w-full rounded-lg border border-rose-200 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Mark Received
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Rooms
            </h3>
            <ul className="mt-3 space-y-2">
              {assignedRooms.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold text-stone-800">
                      {a.examRoom.name}
                    </span>
                    <span className="ml-2 text-xs text-stone-500">
                      {a.examRoom.capacity} seats
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => unassignRoom.mutate(a.examRoomId)}
                    aria-label={`Unassign ${a.examRoom.name}`}
                    className="text-stone-400 hover:text-rose-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {assignedRooms.length === 0 && (
                <li className="text-sm text-stone-400">No rooms assigned.</li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <select
                aria-label="Room to assign"
                value={roomToAssign}
                onChange={(e) => setRoomToAssign(e.target.value)}
                disabled={!examId}
                className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
              >
                <option value="">Select room…</option>
                {rooms
                  .filter((r) => !assignedRooms.some((a) => a.examRoomId === r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!roomToAssign || assignRoom.isPending}
                onClick={() => assignRoom.mutate()}
                className="rounded-lg bg-rose-800 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                Assign
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Invigilators
            </h3>
            <ul className="mt-3 space-y-2">
              {invigilators.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-stone-800">
                    {fullName(inv.teacher.firstName, inv.teacher.lastName)}
                  </span>
                  <button
                    type="button"
                    onClick={() => unassignInvigilator.mutate(inv.teacherId)}
                    aria-label="Remove invigilator"
                    className="text-stone-400 hover:text-rose-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {invigilators.length === 0 && (
                <li className="text-sm text-stone-400">None assigned.</li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <select
                aria-label="Invigilator to assign"
                value={invigilatorToAssign}
                onChange={(e) => setInvigilatorToAssign(e.target.value)}
                disabled={!examId}
                className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
              >
                <option value="">Select teacher…</option>
                {teachers
                  .filter((t) => !invigilators.some((i) => i.teacherId === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t.firstName, t.lastName)}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!invigilatorToAssign || assignInvigilator.isPending}
                onClick={() => assignInvigilator.mutate()}
                className="rounded-lg bg-rose-800 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                Assign
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.classId || !form.examDate) {
                setFormError("Class and exam date are required.");
                return;
              }
              if (form.startTime >= form.endTime) {
                setFormError("Start time must be before end time.");
                return;
              }
              createExam.mutate();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Create Exam</h3>
                <p className="mt-1 text-sm text-stone-500">
                  The semester is taken from the selected class.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="exam-class"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Class
                </label>
                <select
                  id="exam-class"
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                  disabled={classesQuery.isLoading}
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
                >
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course.code} — {c.semester.name}
                    </option>
                  ))}
                </select>
                {selectedClass && (
                  <p className="mt-1.5 text-xs text-stone-500">
                    Semester: {selectedClass.semester.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="exam-type"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Type
                  </label>
                  <select
                    id="exam-type"
                    value={form.examType}
                    onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  >
                    {EXAM_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="exam-date"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Date
                  </label>
                  <input
                    id="exam-date"
                    type="date"
                    required
                    value={form.examDate}
                    onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exam-start"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Start
                  </label>
                  <input
                    id="exam-start"
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exam-end"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    End
                  </label>
                  <input
                    id="exam-end"
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createExam.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {createExam.isPending ? "Creating…" : "Create Exam"}
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
