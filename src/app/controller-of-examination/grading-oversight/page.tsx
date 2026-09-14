"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import { CheckCircleIcon, DownloadIcon, SendIcon } from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type { ClassDTO, FinalGradeDTO } from "@/lib/api/types";
import { finalGradeTone, fromApiFinalGrade } from "@/lib/coe/exam-setup-data";
import { downloadCsv, percentOf, titleCase } from "@/lib/format";

const COE_KEY = ["coe"] as const;
const GRADES_KEY = [...COE_KEY, "final-grades"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function GradingOversightPage() {
  const queryClient = useQueryClient();

  const [pickedClassId, setPickedClassId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const classesQuery = useApiQuery<ClassDTO[]>(
    [...COE_KEY, "classes"],
    "/academic-affairs/classes",
    { query: { limit: 100 } },
  );

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const classId = pickedClassId || classes[0]?.id || "";
  const selectedClass = classes.find((c) => c.id === classId);

  const gradesQuery = useApiQuery<FinalGradeDTO[]>(
    [...GRADES_KEY, { classId }],
    `/coe/classes/${classId}/final-grades`,
    { query: { limit: 100 }, enabled: Boolean(classId) },
  );

  const grades = useMemo(
    () => (gradesQuery.data?.data ?? []).map(fromApiFinalGrade),
    [gradesQuery.data],
  );

  // ── Derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (grades.length === 0) {
      return { mean: "—", pass: 0, passRate: 0, approved: 0, published: 0, pending: 0 };
    }
    const mean = grades.reduce((s, g) => s + g.finalScore, 0) / grades.length;
    const pass = grades.filter((g) => g.gpaPoints > 0).length;
    return {
      mean: mean.toFixed(1),
      pass,
      passRate: percentOf(pass, grades.length),
      approved: grades.filter((g) => g.status === "APPROVED").length,
      published: grades.filter((g) => g.status === "PUBLISHED").length,
      pending: grades.filter((g) => g.status === "RECEIVED" || g.status === "PENDING")
        .length,
    };
  }, [grades]);

  const approvable = grades.filter(
    (g) => g.status === "RECEIVED" || g.status === "PENDING",
  );
  const publishable = grades.filter((g) => g.status === "APPROVED");

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Approve and publish are per-grade endpoints, so a class-wide action fans
   * out. Failures are counted rather than aborting the rest of the batch.
   */
  function batchOver(rows: typeof grades, action: "approve" | "publish") {
    return async () => {
      const results = await Promise.allSettled(
        rows.map((g) =>
          apiFetch<FinalGradeDTO>(`/coe/final-grades/${g.id}/${action}`, {
            method: "PATCH",
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { done: results.length - failed, failed };
    };
  }

  const approveMutation = useMutation({
    mutationFn: (rows: typeof grades) => batchOver(rows, "approve")(),
    onMutate: () => setActionError(null),
    onSuccess: async ({ done, failed }) => {
      await queryClient.invalidateQueries({ queryKey: GRADES_KEY });
      if (failed > 0) setActionError(`${failed} grade(s) could not be approved.`);
      if (done > 0) showToast(`Approved ${done} grade${done === 1 ? "" : "s"}.`);
    },
    onError: (err) => setActionError(errorMessage(err, "Approval failed.")),
  });

  const publishMutation = useMutation({
    mutationFn: (rows: typeof grades) => batchOver(rows, "publish")(),
    onMutate: () => setActionError(null),
    onSuccess: async ({ done, failed }) => {
      await queryClient.invalidateQueries({ queryKey: GRADES_KEY });
      if (failed > 0) setActionError(`${failed} grade(s) could not be published.`);
      if (done > 0) showToast(`Published ${done} result${done === 1 ? "" : "s"}.`);
    },
    onError: (err) => setActionError(errorMessage(err, "Publishing failed.")),
  });

  const singleAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "publish" }) =>
      apiFetch<FinalGradeDTO>(`/coe/final-grades/${id}/${action}`, { method: "PATCH" }),
    onMutate: () => setActionError(null),
    onSuccess: async (_res, { action }) => {
      await queryClient.invalidateQueries({ queryKey: GRADES_KEY });
      showToast(action === "approve" ? "Grade approved." : "Result published.");
    },
    onError: (err) => setActionError(errorMessage(err, "Action failed.")),
  });

  return (
    <div>
      <PageHeader
        title="Grading Oversight"
        description="Review coursework and exam scores, approve final grades, and publish results."
        actions={
          <>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `grades-${selectedClass?.course.code ?? "class"}.csv`,
                  ["Student", "Number", "Coursework", "Exam", "Final", "Grade", "GPA", "Status"],
                  grades.map((g) => [
                    g.name,
                    g.studentNumber,
                    g.coursework,
                    g.exam,
                    g.finalScore,
                    g.letterGrade,
                    g.gpaPoints,
                    titleCase(g.status),
                  ]),
                )
              }
              disabled={grades.length === 0}
              className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
            >
              <DownloadIcon className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => publishMutation.mutate(publishable)}
              disabled={publishable.length === 0 || publishMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              <SendIcon className="h-4 w-4" />
              {publishMutation.isPending
                ? "Publishing…"
                : `Publish ${publishable.length} Result${publishable.length === 1 ? "" : "s"}`}
            </button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Class"
          value={classId}
          onChange={(e) => setPickedClassId(e.target.value)}
          disabled={classesQuery.isLoading || classes.length === 0}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
        >
          {classes.length === 0 && <option>No classes</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course.code} — {c.semester.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => approveMutation.mutate(approvable)}
          disabled={approvable.length === 0 || approveMutation.isPending}
          className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-stone-200 disabled:text-stone-300"
        >
          {approveMutation.isPending
            ? "Approving…"
            : `Approve ${approvable.length} Pending`}
        </button>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Mean Final Score", value: stats.mean },
          { label: "Pass Rate", value: `${stats.passRate}%` },
          { label: "Awaiting Approval", value: String(stats.pending) },
          { label: "Published", value: String(stats.published) },
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

      <section className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {selectedClass?.course.code ?? "Final Grades"}
            </h2>
            <p className="text-sm text-stone-500">
              {selectedClass?.course.name ?? "Select a class"} · {grades.length}{" "}
              students
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Coursework</th>
                <th className="px-5 py-3">Exam</th>
                <th className="px-5 py-3">Final</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {gradesQuery.isLoading && <LoadingRow colSpan={7} />}
              {gradesQuery.isError && (
                <ErrorRow
                  colSpan={7}
                  message={gradesQuery.error.message}
                  onRetry={() => gradesQuery.refetch()}
                />
              )}
              {!gradesQuery.isLoading &&
                !gradesQuery.isError &&
                grades.map((g) => (
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
                    <td className="px-5 py-3 text-stone-600">{g.coursework}</td>
                    <td className="px-5 py-3 text-stone-600">{g.exam}</td>
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      {g.finalScore}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-rose-700">{g.letterGrade}</span>
                      <span className="ml-1.5 text-xs text-stone-400">
                        {g.gpaPoints.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={titleCase(g.status)}
                        tone={finalGradeTone[g.status]}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {g.status === "PUBLISHED" ? (
                        <span className="text-xs text-stone-400">Released</span>
                      ) : (
                        <button
                          type="button"
                          disabled={singleAction.isPending}
                          onClick={() =>
                            singleAction.mutate({
                              id: g.id,
                              action: g.status === "APPROVED" ? "publish" : "approve",
                            })
                          }
                          className="text-sm font-semibold text-rose-700 hover:underline disabled:text-stone-300"
                        >
                          {g.status === "APPROVED" ? "Publish" : "Approve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!gradesQuery.isLoading && !gradesQuery.isError && grades.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  label={
                    classId
                      ? "No final grades submitted for this class yet."
                      : "Select a class to review its grades."
                  }
                />
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-xl">
          <CheckCircleIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
