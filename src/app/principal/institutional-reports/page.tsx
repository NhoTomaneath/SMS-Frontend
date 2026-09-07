"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  SparkleIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicYearDTO,
  EnrollmentReportDTO,
  GraduationReportDTO,
  InstitutionalMetricDTO,
  PerformanceDashboardDTO,
} from "@/lib/api/types";
import {
  METRIC_LABELS,
  formatMetric,
  metricProgress,
} from "@/lib/principal/analytics-data";
import { downloadCsv, formatDate, formatRelative } from "@/lib/format";

const PRINCIPAL_KEY = ["principal"] as const;
const DASHBOARDS_KEY = [...PRINCIPAL_KEY, "performance-dashboards"] as const;
const METRICS_KEY = [...PRINCIPAL_KEY, "institutional-metrics"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function InstitutionalReportsPage() {
  const queryClient = useQueryClient();

  const [pickedYearId, setPickedYearId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const yearsQuery = useApiQuery<AcademicYearDTO[]>(
    ["lookups", "academic-years"],
    "/student-affairs/academic-years",
  );
  const years = useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data]);
  const yearId = pickedYearId || years[0]?.id || "";

  const dashboardsQuery = useApiQuery<PerformanceDashboardDTO[]>(
    [...DASHBOARDS_KEY, { yearId }],
    "/principal/performance-dashboards",
    { query: { academicYearId: yearId || undefined, limit: 100 } },
  );

  const metricsQuery = useApiQuery<InstitutionalMetricDTO>(
    [...METRICS_KEY, { yearId }],
    "/principal/institutional-metrics",
    { query: { academicYearId: yearId || undefined }, retry: false },
  );

  // Reports produced by the other portals and delivered to the Principal.
  const enrollmentReportsQuery = useApiQuery<EnrollmentReportDTO[]>(
    [...PRINCIPAL_KEY, "enrollment-reports"],
    "/student-affairs/enrollment-reports",
    { query: { limit: 50 } },
  );

  const graduationReportsQuery = useApiQuery<GraduationReportDTO[]>(
    [...PRINCIPAL_KEY, "graduation-reports"],
    "/coe/graduation-reports",
    { query: { limit: 50 }, retry: false },
  );

  const dashboards = useMemo(
    () => dashboardsQuery.data?.data ?? [],
    [dashboardsQuery.data],
  );
  const metrics = metricsQuery.data?.data;
  const enrollmentReports = useMemo(
    () => enrollmentReportsQuery.data?.data ?? [],
    [enrollmentReportsQuery.data],
  );
  const graduationReports = useMemo(
    () => graduationReportsQuery.data?.data ?? [],
    [graduationReportsQuery.data],
  );

  // One row per metric, newest snapshot first.
  const latestByMetric = useMemo(() => {
    const map = new Map<string, PerformanceDashboardDTO>();
    for (const d of [...dashboards].sort(
      (a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt),
    )) {
      if (!map.has(d.metricName)) map.set(d.metricName, d);
    }
    return [...map.values()];
  }, [dashboards]);

  // ── Mutation ──────────────────────────────────────────────────────────────

  const generateSnapshot = useMutation({
    mutationFn: () =>
      apiFetch<PerformanceDashboardDTO[]>("/principal/performance-dashboards/generate", {
        method: "POST",
        body: { academicYearId: yearId },
      }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DASHBOARDS_KEY });
      showToast("Performance snapshot generated.");
    },
    onError: (err) =>
      setActionError(errorMessage(err, "Could not generate the snapshot.")),
  });

  const selectedYear = years.find((y) => y.id === yearId);

  return (
    <div>
      <PageHeader
        title="Institutional Reports"
        description="Performance snapshots and the reports delivered to your office."
        actions={
          <>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "performance-snapshot.csv",
                  ["Metric", "Value", "Academic Year", "Generated"],
                  latestByMetric.map((d) => [
                    METRIC_LABELS[d.metricName],
                    d.metricValue,
                    d.academicYear.yearLabel,
                    formatDate(d.generatedAt),
                  ]),
                )
              }
              disabled={latestByMetric.length === 0}
              className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
            >
              <DownloadIcon className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => generateSnapshot.mutate()}
              disabled={!yearId || generateSnapshot.isPending}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              <SparkleIcon className="h-4 w-4" />
              {generateSnapshot.isPending ? "Generating…" : "Generate Snapshot"}
            </button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Academic year"
          value={yearId}
          onChange={(e) => setPickedYearId(e.target.value)}
          disabled={yearsQuery.isLoading}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.yearLabel}
            </option>
          ))}
        </select>
        {selectedYear && (
          <StatusBadge
            label={`${formatDate(selectedYear.startDate)} – ${formatDate(selectedYear.endDate)}`}
            tone="rose"
          />
        )}
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Performance Snapshot</h2>
            <p className="text-sm text-stone-500">
              Latest recorded value for each institutional metric.
            </p>

            {dashboardsQuery.isLoading ? (
              <p className="mt-5 text-sm text-stone-400">Loading…</p>
            ) : latestByMetric.length === 0 ? (
              <p className="mt-5 text-sm text-stone-400">
                No snapshots for this academic year yet. Generate one to start a
                trend.
              </p>
            ) : (
              <ul className="mt-5 space-y-5">
                {latestByMetric.map((d) => (
                  <li key={d.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-stone-700">
                        {METRIC_LABELS[d.metricName]}
                      </span>
                      <span className="text-lg font-bold text-stone-900">
                        {formatMetric(d.metricName, d.metricValue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-rose-700"
                        style={{ width: `${metricProgress(d.metricName, d.metricValue)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      Recorded {formatRelative(d.generatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">
                Enrollment Reports Received
              </h2>
              <StatusBadge
                label={`${enrollmentReports.filter((r) => r.sentToPrincipal).length} delivered`}
                tone="green"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Year</th>
                    <th className="px-6 py-3">New</th>
                    <th className="px-6 py-3">Active</th>
                    <th className="px-6 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {enrollmentReportsQuery.isLoading && <LoadingRow colSpan={5} />}
                  {enrollmentReportsQuery.isError && (
                    <ErrorRow
                      colSpan={5}
                      message={enrollmentReportsQuery.error.message}
                      onRetry={() => enrollmentReportsQuery.refetch()}
                    />
                  )}
                  {!enrollmentReportsQuery.isLoading &&
                    !enrollmentReportsQuery.isError &&
                    enrollmentReports.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 font-medium text-stone-800">
                          {r.department?.name ?? "All departments"}
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {r.academicYear.yearLabel}
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {r.totalNewStudents}
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {r.totalActiveStudents}
                        </td>
                        <td className="px-6 py-4">
                          {r.sentToPrincipal ? (
                            <span className="text-xs text-stone-500">
                              {formatRelative(r.generatedAt)}
                            </span>
                          ) : (
                            <StatusBadge label="Draft" tone="amber" />
                          )}
                        </td>
                      </tr>
                    ))}
                  {!enrollmentReportsQuery.isLoading &&
                    !enrollmentReportsQuery.isError &&
                    enrollmentReports.length === 0 && (
                      <EmptyRow colSpan={5} label="No enrollment reports yet." />
                    )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Institutional Metrics</h3>
            {metrics ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Research funding</dt>
                  <dd className="font-bold text-stone-900">
                    ${metrics.researchFundingUsd.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Institutional GPA</dt>
                  <dd className="font-bold text-stone-900">
                    {metrics.averageInstitutionalGpa?.toFixed(2) ?? "—"}
                  </dd>
                </div>
                {metrics.notes && (
                  <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                    {metrics.notes}
                  </p>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-stone-400">
                {metricsQuery.isLoading
                  ? "Loading…"
                  : "No metrics recorded for this year."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Graduation Reports
            </h3>
            {graduationReportsQuery.isError ? (
              <p className="mt-3 text-sm text-stone-400">
                Graduation reports are Controller-of-Examination scoped.
              </p>
            ) : graduationReports.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">None received yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {graduationReports.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-stone-800">
                        {r.academicYear.yearLabel}
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatRelative(r.generatedAt)}
                      </span>
                    </span>
                    {r.fileUrl ? (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        <FileTextIcon className="h-3 w-3" />
                        Open
                      </a>
                    ) : (
                      <StatusBadge
                        label={r.sentToPrincipal ? "Sent" : "Draft"}
                        tone={r.sentToPrincipal ? "green" : "amber"}
                      />
                    )}
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
