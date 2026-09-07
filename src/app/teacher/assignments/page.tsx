"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AssignmentDTO,
  CourseworkGradeDTO,
  SubmissionDTO,
  TeacherDashboardDTO,
} from "@/lib/api/types";
import {
  courseworkTone,
  fromApiTeacherClass,
  rosterRowOf,
} from "@/lib/teacher/dashboard-data";
import { formatDate, percentOf, titleCase } from "@/lib/format";

const TEACHER_KEY = ["teacher"] as const;
const ASSIGNMENTS_KEY = [...TEACHER_KEY, "assignments"] as const;
const SUBMISSIONS_KEY = [...TEACHER_KEY, "submissions"] as const;
const COURSEWORK_KEY = [...TEACHER_KEY, "coursework"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

const emptyAssignmentForm = { title: "", description: "", maxScore: "100", dueDate: "" };

export default function TeacherAssignmentsPage() {
  const queryClient = useQueryClient();

  const [pickedClassId, setPickedClassId] = useState("");
  const [pickedAssignmentId, setPickedAssignmentId] = useState("");
  const [tab, setTab] = useState<"submissions" | "coursework">("submissions");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyAssignmentForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Class + assignment selection ──────────────────────────────────────────

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

  const assignmentsQuery = useApiQuery<AssignmentDTO[]>(
    [...ASSIGNMENTS_KEY, { classId }],
    `/teacher/classes/${classId}/assignments`,
    { query: { limit: 100 }, enabled: Boolean(classId) },
  );

  const assignments = useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data],
  );

  const assignmentId =
    assignments.some((a) => a.id === pickedAssignmentId)
      ? pickedAssignmentId
      : assignments[0]?.id ?? "";
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);

  // ── Submissions & coursework ──────────────────────────────────────────────

  const submissionsQuery = useApiQuery<SubmissionDTO[]>(
    [...SUBMISSIONS_KEY, { assignmentId }],
    `/teacher/assignments/${assignmentId}/submissions`,
    { query: { limit: 100 }, enabled: Boolean(assignmentId) },
  );

  const courseworkQuery = useApiQuery<CourseworkGradeDTO[]>(
    [...COURSEWORK_KEY, { classId }],
    `/teacher/classes/${classId}/coursework-grades`,
    { query: { limit: 100 }, enabled: Boolean(classId) },
  );

  const submissions = useMemo(
    () =>
      (submissionsQuery.data?.data ?? []).map((s) => ({
        ...rosterRowOf(s.student),
        id: s.id,
        score: s.score,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
      })),
    [submissionsQuery.data],
  );

  const coursework = useMemo(
    () =>
      (courseworkQuery.data?.data ?? []).map((g) => ({
        ...rosterRowOf(g.student),
        id: g.id,
        courseworkScore: g.courseworkScore,
        status: g.status,
      })),
    [courseworkQuery.data],
  );

  // Live stats over graded submissions only.
  const stats = useMemo(() => {
    const graded = submissions.filter((s) => s.score !== null);
    const scores = graded.map((s) => s.score as number);
    return {
      submitted: submissions.length,
      graded: graded.length,
      pending: submissions.length - graded.length,
      average: scores.length
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : "—",
      high: scores.length ? String(Math.max(...scores)) : "—",
      low: scores.length ? String(Math.min(...scores)) : "—",
    };
  }, [submissions]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createAssignment = useMutation({
    mutationFn: () =>
      apiFetch<AssignmentDTO>(`/teacher/classes/${classId}/assignments`, {
        method: "POST",
        body: {
          title: form.title.trim(),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          maxScore: Number(form.maxScore),
          dueDate: form.dueDate,
        },
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
      setShowCreate(false);
      setForm(emptyAssignmentForm);
      setFormError(null);
      setPickedAssignmentId(res.data.id);
      showToast(`Assignment "${res.data.title}" created.`);
    },
    onError: (err) => setFormError(errorMessage(err, "Could not create the assignment.")),
  });

  const gradeSubmission = useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) =>
      apiFetch<SubmissionDTO>(`/teacher/submissions/${id}/grade`, {
        method: "PATCH",
        body: { score },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async (_res, { id }) => {
      await queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
      setScoreDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      showToast("Score saved.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not save the score.")),
  });

  const submitCoursework = useMutation({
    mutationFn: (id: string) =>
      apiFetch<CourseworkGradeDTO>(`/teacher/coursework-grades/${id}/submit`, {
        method: "PATCH",
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSEWORK_KEY });
      showToast("Coursework grade submitted to the Controller of Examination.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not submit the grade.")),
  });

  const draftCount = coursework.filter((c) => c.status === "DRAFT").length;

  return (
    <div>
      <PageHeader
        title="Assignments & Grading"
        description="Create coursework, grade submissions, and release coursework scores."
        actions={
          <button
            type="button"
            onClick={() => {
              setForm(emptyAssignmentForm);
              setFormError(null);
              setShowCreate(true);
            }}
            disabled={!classId}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" />
            New Assignment
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Class"
          value={classId}
          onChange={(e) => {
            setPickedClassId(e.target.value);
            setPickedAssignmentId("");
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

        {selectedClass && (
          <StatusBadge
            label={`${selectedClass.enrolled} enrolled`}
            tone="rose"
          />
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Submissions", value: String(stats.submitted) },
          { label: "Average Score", value: stats.average },
          { label: "Highest", value: stats.high },
          { label: "Pending Grading", value: String(stats.pending) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-5">
            <h2 className="font-bold text-stone-900">Assignments</h2>
            <p className="text-xs text-stone-500">
              {assignments.length} in this class
            </p>
          </div>
          {assignmentsQuery.isLoading ? (
            <p className="p-5 text-sm text-stone-400">Loading…</p>
          ) : assignments.length === 0 ? (
            <p className="p-5 text-sm text-stone-400">
              No assignments yet for this class.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {assignments.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setPickedAssignmentId(a.id)}
                    className={`w-full px-5 py-4 text-left transition-colors ${
                      a.id === assignmentId ? "bg-rose-50" : "hover:bg-stone-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        a.id === assignmentId ? "text-rose-800" : "text-stone-800"
                      }`}
                    >
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Due {formatDate(a.dueDate)} · {a.maxScore} marks
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {tab === "submissions"
                  ? (selectedAssignment?.title ?? "Submissions")
                  : "Coursework Grades"}
              </h2>
              <p className="text-xs text-stone-500">
                {tab === "submissions"
                  ? selectedAssignment
                    ? `Max ${selectedAssignment.maxScore} · due ${formatDate(selectedAssignment.dueDate)}`
                    : "Select an assignment"
                  : `${draftCount} draft${draftCount === 1 ? "" : "s"} not yet sent to the COE`}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setTab("submissions")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  tab === "submissions" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
                }`}
              >
                Submissions
              </button>
              <button
                type="button"
                onClick={() => setTab("coursework")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  tab === "coursework" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
                }`}
              >
                Coursework
              </button>
            </div>
          </div>

          {actionError && (
            <p className="border-b border-stone-200 px-5 py-3 text-sm font-medium text-rose-600">
              {actionError}
            </p>
          )}

          <div className="overflow-x-auto">
            {tab === "submissions" ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {submissionsQuery.isLoading && <LoadingRow colSpan={4} />}
                  {submissionsQuery.isError && (
                    <ErrorRow
                      colSpan={4}
                      message={submissionsQuery.error.message}
                      onRetry={() => submissionsQuery.refetch()}
                    />
                  )}
                  {!submissionsQuery.isLoading &&
                    !submissionsQuery.isError &&
                    submissions.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.avatarColorClassName}`}
                            >
                              {s.initials}
                            </span>
                            <div>
                              <p className="font-medium text-stone-800">{s.name}</p>
                              <p className="font-mono text-xs text-stone-400">
                                {s.studentNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-stone-600">
                          {formatDate(s.submittedAt)}
                        </td>
                        <td className="px-5 py-3">
                          {s.score === null ? (
                            <span className="text-xs text-amber-600">Ungraded</span>
                          ) : (
                            <span className="font-semibold text-stone-800">
                              {s.score}
                              <span className="text-stone-400">
                                /{selectedAssignment?.maxScore ?? 100}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min={0}
                              max={selectedAssignment?.maxScore ?? 100}
                              aria-label={`Score for ${s.name}`}
                              value={scoreDrafts[s.id] ?? String(s.score ?? "")}
                              onChange={(e) =>
                                setScoreDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                              }
                              className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-rose-400"
                            />
                            <button
                              type="button"
                              disabled={gradeSubmission.isPending}
                              onClick={() => {
                                const raw = scoreDrafts[s.id] ?? String(s.score ?? "");
                                const score = Number(raw);
                                if (raw === "" || Number.isNaN(score)) {
                                  setActionError("Enter a numeric score.");
                                  return;
                                }
                                gradeSubmission.mutate({ id: s.id, score });
                              }}
                              className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!submissionsQuery.isLoading &&
                    !submissionsQuery.isError &&
                    submissions.length === 0 && (
                      <EmptyRow
                        colSpan={4}
                        label={
                          assignmentId
                            ? "No submissions for this assignment yet."
                            : "Select an assignment to see submissions."
                        }
                      />
                    )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Coursework Score</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {courseworkQuery.isLoading && <LoadingRow colSpan={4} />}
                  {courseworkQuery.isError && (
                    <ErrorRow
                      colSpan={4}
                      message={courseworkQuery.error.message}
                      onRetry={() => courseworkQuery.refetch()}
                    />
                  )}
                  {!courseworkQuery.isLoading &&
                    !courseworkQuery.isError &&
                    coursework.map((g) => (
                      <tr key={g.id}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${g.avatarColorClassName}`}
                            >
                              {g.initials}
                            </span>
                            <div>
                              <p className="font-medium text-stone-800">{g.name}</p>
                              <p className="font-mono text-xs text-stone-400">
                                {g.studentNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className="h-full rounded-full bg-rose-700"
                                style={{ width: `${percentOf(g.courseworkScore, 100)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-stone-800">
                              {g.courseworkScore}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge
                            label={titleCase(g.status)}
                            tone={courseworkTone[g.status]}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {g.status === "SUBMITTED" ? (
                            <span className="text-xs text-stone-400">Sent to COE</span>
                          ) : (
                            <button
                              type="button"
                              disabled={submitCoursework.isPending}
                              onClick={() => submitCoursework.mutate(g.id)}
                              className="text-sm font-semibold text-rose-700 hover:underline disabled:text-stone-300"
                            >
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {!courseworkQuery.isLoading &&
                    !courseworkQuery.isError &&
                    coursework.length === 0 && (
                      <EmptyRow colSpan={4} label="No coursework grades recorded yet." />
                    )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim() || !form.dueDate) {
                setFormError("Title and due date are required.");
                return;
              }
              createAssignment.mutate();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">New Assignment</h3>
                <p className="mt-1 text-sm text-stone-500">
                  For {selectedClass?.code} — {selectedClass?.name}
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
                  htmlFor="a-title"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Title
                </label>
                <input
                  id="a-title"
                  required
                  placeholder="e.g. Assignment 3"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                />
              </div>
              <div>
                <label
                  htmlFor="a-desc"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Description
                </label>
                <textarea
                  id="a-desc"
                  rows={3}
                  placeholder="What students need to submit"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="a-max"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Max Score
                  </label>
                  <input
                    id="a-max"
                    type="number"
                    min={0}
                    max={1000}
                    required
                    value={form.maxScore}
                    onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="a-due"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Due Date
                  </label>
                  <input
                    id="a-due"
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
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
                disabled={createAssignment.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {createAssignment.isPending ? "Creating…" : "Create Assignment"}
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
