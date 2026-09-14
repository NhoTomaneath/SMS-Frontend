"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  FileTextIcon,
  GraduationCapIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  OwnAcademicStandingDTO,
  OwnGraduationStatusDTO,
  OwnResultDTO,
  TranscriptDTO,
} from "@/lib/api/types";
import {
  fromApiOwnResult,
  graduationTone,
  transcriptTone,
} from "@/lib/student/dashboard-data";
import { formatDate, percentOf, titleCase } from "@/lib/format";

const STUDENT_KEY = ["student"] as const;
const TRANSCRIPTS_KEY = [...STUDENT_KEY, "transcripts"] as const;

/** Credits a degree requires. The API exposes no programme rule yet. */
const CREDITS_REQUIRED = 120;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function StudentGraduationStatusPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  // A student with no graduation record yet gets a 404, which is a normal
  // state here rather than an error worth retrying.
  const statusQuery = useApiQuery<OwnGraduationStatusDTO>(
    [...STUDENT_KEY, "graduation-status"],
    "/student/me/graduation-status",
    { retry: false },
  );

  const standingQuery = useApiQuery<OwnAcademicStandingDTO>(
    [...STUDENT_KEY, "standing"],
    "/student/me/academic-standing",
  );

  const resultsQuery = useApiQuery<OwnResultDTO[]>(
    [...STUDENT_KEY, "results"],
    "/student/me/results",
  );

  const transcriptsQuery = useApiQuery<TranscriptDTO[]>(
    TRANSCRIPTS_KEY,
    "/student/me/transcripts",
  );

  const status = statusQuery.data?.data;
  const standing = standingQuery.data?.data;
  const transcripts = useMemo(
    () => transcriptsQuery.data?.data ?? [],
    [transcriptsQuery.data],
  );

  const results = useMemo(
    () => (resultsQuery.data?.data ?? []).map(fromApiOwnResult),
    [resultsQuery.data],
  );

  const passed = results.filter(
    (r) => r.status === "PUBLISHED" && r.gpaPoints > 0,
  );
  // One credit-equivalent per passed course: the results endpoint does not
  // carry course credits, so this is a course count, labelled as such.
  const creditsEarned = passed.length;
  const completionPercent = percentOf(creditsEarned, CREDITS_REQUIRED / 3);

  const hasPendingRequest = transcripts.some((t) => t.status === "REQUESTED");

  // ── Mutation ──────────────────────────────────────────────────────────────

  const requestTranscript = useMutation({
    mutationFn: () => apiFetch<TranscriptDTO>("/student/me/transcripts", { method: "POST" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSCRIPTS_KEY });
      showToast("Transcript requested. The Controller of Examination will process it.");
    },
    onError: (err) =>
      setActionError(errorMessage(err, "Could not request a transcript.")),
  });

  return (
    <div>
      <PageHeader
        title="Graduation Status"
        description="Your eligibility, academic progress, and transcript requests."
        actions={
          <button
            type="button"
            onClick={() => requestTranscript.mutate()}
            disabled={requestTranscript.isPending || hasPendingRequest}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            <FileTextIcon className="h-4 w-4" />
            {hasPendingRequest
              ? "Request Pending"
              : requestTranscript.isPending
                ? "Requesting…"
                : "Request Transcript"}
          </button>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Eligibility</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Set by the Controller of Examination when compiling the
                  graduation report.
                </p>
              </div>
              {statusQuery.isLoading ? (
                <span className="text-sm text-stone-400">Checking…</span>
              ) : status ? (
                <StatusBadge
                  label={titleCase(status.status)}
                  tone={graduationTone[status.status]}
                />
              ) : (
                <StatusBadge label="Not Evaluated" tone="amber" />
              )}
            </div>

            <div className="mt-8 flex flex-col items-center">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-3xl ${
                  status?.status === "GRADUATED"
                    ? "bg-emerald-50 text-emerald-600"
                    : status?.status === "NOT_ELIGIBLE"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-sky-50 text-sky-600"
                }`}
              >
                <GraduationCapIcon className="h-10 w-10" />
              </span>
              <p className="mt-4 text-lg font-bold text-stone-900">
                {statusQuery.isLoading
                  ? "Checking your record…"
                  : status?.status === "GRADUATED"
                    ? "You have graduated"
                    : status?.status === "ELIGIBLE"
                      ? "You are eligible to graduate"
                      : status?.status === "NOT_ELIGIBLE"
                        ? "Not yet eligible"
                        : "No graduation record yet"}
              </p>
              {status?.graduationDate && (
                <p className="mt-1 text-sm text-stone-500">
                  Graduated {formatDate(status.graduationDate)}
                </p>
              )}
              {!status && !statusQuery.isLoading && (
                <p className="mt-1 max-w-sm text-center text-sm text-stone-500">
                  Your record is created when the Controller of Examination
                  compiles the graduation report for your cohort.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Academic Progress</h2>
            <p className="text-sm text-stone-500">
              Based on the results released to you.
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-700">Courses passed</span>
                <span className="font-bold text-stone-900">
                  {creditsEarned} of {Math.round(CREDITS_REQUIRED / 3)}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-rose-700"
                  style={{ width: `${Math.min(100, completionPercent)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {completionPercent}% towards the {CREDITS_REQUIRED}-credit degree
                requirement (counted as courses; the API exposes no per-programme
                credit rule yet).
              </p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Cumulative GPA",
                  value:
                    standing?.cumulativeGpa != null
                      ? standing.cumulativeGpa.toFixed(2)
                      : "—",
                },
                { label: "Completed", value: String(standing?.completedCourses ?? 0) },
                { label: "Semesters", value: String(standing?.semesterCount ?? 0) },
                { label: "Year level", value: standing?.yearLevel ?? "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-stone-50 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-stone-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside>
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 p-6">
              <h3 className="text-lg font-bold text-stone-900">
                Transcript Requests
              </h3>
              <p className="text-xs text-stone-500">
                {transcripts.length} request{transcripts.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-stone-100">
                  {transcriptsQuery.isLoading && <LoadingRow colSpan={2} />}
                  {transcriptsQuery.isError && (
                    <ErrorRow
                      colSpan={2}
                      message={transcriptsQuery.error.message}
                      onRetry={() => transcriptsQuery.refetch()}
                    />
                  )}
                  {!transcriptsQuery.isLoading &&
                    !transcriptsQuery.isError &&
                    transcripts.map((t) => (
                      <tr key={t.id}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {formatDate(t.requestedAt)}
                          </p>
                          {t.generatedAt && (
                            <p className="text-xs text-stone-400">
                              Ready {formatDate(t.generatedAt)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {t.status === "GENERATED" && t.fileUrl ? (
                            <a
                              href={t.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline"
                            >
                              <FileTextIcon className="h-3.5 w-3.5" />
                              Download
                            </a>
                          ) : (
                            <StatusBadge
                              label={titleCase(t.status)}
                              tone={transcriptTone[t.status]}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  {!transcriptsQuery.isLoading &&
                    !transcriptsQuery.isError &&
                    transcripts.length === 0 && (
                      <EmptyRow colSpan={2} label="No transcript requests yet." />
                    )}
                </tbody>
              </table>
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
