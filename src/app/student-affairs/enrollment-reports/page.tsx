"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MetricStatCard } from "@/components/metric-stat-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  DownloadIcon,
  SendIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicYearDTO,
  DepartmentDTO,
  EnrollmentReportDTO,
  StudentSummaryDTO,
} from "@/lib/api/types";
import {
  fromApiEnrollmentReport,
  type EnrollmentReportRow,
} from "@/lib/student-affairs/students";
import { downloadCsv, percentOf, titleCase } from "@/lib/format";

const SAO_KEY = ["student-affairs"] as const;
const REPORTS_KEY = [...SAO_KEY, "enrollment-reports"] as const;
const SUMMARY_KEY = [...SAO_KEY, "students", "summary"] as const;
const YEARS_KEY = ["lookups", "academic-years"] as const;
const DEPARTMENTS_KEY = ["lookups", "departments"] as const;

const PAGE_SIZE = 8;

const reportStatusTone: Record<EnrollmentReportRow["statusLabel"], StatusTone> = {
  Delivered: "green",
  Draft: "amber",
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function EnrollmentReportingPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [generateYearId, setGenerateYearId] = useState("");
  const [generateDeptId, setGenerateDeptId] = useState("ALL");
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const summaryQuery = useApiQuery<StudentSummaryDTO>(
    SUMMARY_KEY,
    "/student-affairs/students/summary",
  );

  const yearsQuery = useApiQuery<AcademicYearDTO[]>(
    YEARS_KEY,
    "/student-affairs/academic-years",
  );

  const departmentsQuery = useApiQuery<DepartmentDTO[]>(
    DEPARTMENTS_KEY,
    "/student-affairs/departments",
  );

  const reportsQuery = useApiQuery<EnrollmentReportDTO[]>(
    [...REPORTS_KEY, { page }],
    "/student-affairs/enrollment-reports",
    { query: { page, limit: PAGE_SIZE }, placeholderData: (prev) => prev },
  );

  const summary = summaryQuery.data?.data;
  const years = useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data]);
  const departments = departmentsQuery.data?.data ?? [];
  const reports = useMemo(
    () => (reportsQuery.data?.data ?? []).map(fromApiEnrollmentReport),
    [reportsQuery.data],
  );

  const total = reportsQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Default the generate form to the most recent academic year.
  const yearId = generateYearId || years[0]?.id || "";

  // The status breakdown doubles as the enrollment mix chart.
  const statusBreakdown = useMemo(() => {
    const byStatus = summary?.byStatus;
    if (!byStatus) return [];
    const entries = Object.entries(byStatus) as Array<[string, number]>;
    const max = Math.max(1, ...entries.map(([, count]) => count));
    return entries.map(([status, count]) => ({
      status,
      label: titleCase(status),
      count,
      percent: percentOf(count, max),
      shareOfTotal: percentOf(count, summary?.total ?? 0),
    }));
  }, [summary]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<EnrollmentReportDTO>("/student-affairs/enrollment-reports", {
        method: "POST",
        body: {
          academicYearId: yearId,
          ...(generateDeptId === "ALL" ? {} : { departmentId: generateDeptId }),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      setActionError(null);
      setPage(1);
      showToast("Enrollment report generated.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not generate the report.")),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<EnrollmentReportDTO>(
        `/student-affairs/enrollment-reports/${id}/send`,
        { method: "PATCH" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      setActionError(null);
      showToast("Report sent to the Principal.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not send the report.")),
  });

  const enrolled = summary?.byStatus.ENROLLED ?? 0;
  const graduated = summary?.byStatus.GRADUATED ?? 0;

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Reports", href: "/student-affairs/enrollment-reports" },
          { label: "Enrollment Reporting" },
        ]}
        separator=">"
        title="Enrollment Analysis"
        description="Analyze institutional growth and generate administrative reports."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "enrollment-reports.csv",
                ["Report", "Academic Year", "Department", "New", "Active", "Status", "Generated"],
                reports.map((r) => [
                  r.title,
                  r.academicYear,
                  r.department,
                  r.totalNewStudents,
                  r.totalActiveStudents,
                  r.statusLabel,
                  r.generatedAt,
                ]),
              )
            }
            disabled={reports.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricStatCard
          label="Total Students"
          value={summaryQuery.isLoading ? "—" : (summary?.total ?? 0).toLocaleString()}
          trend="all statuses"
          trendClassName="text-stone-400"
          progress={100}
        />
        <MetricStatCard
          label="Currently Enrolled"
          value={summaryQuery.isLoading ? "—" : enrolled.toLocaleString()}
          trend={`${percentOf(enrolled, summary?.total ?? 0)}% of records`}
          progress={percentOf(enrolled, summary?.total ?? 0)}
        />
        <MetricStatCard
          label="Graduated"
          value={summaryQuery.isLoading ? "—" : graduated.toLocaleString()}
          trend={`${percentOf(graduated, summary?.total ?? 0)}% of records`}
          trendClassName="text-sky-600"
          progress={percentOf(graduated, summary?.total ?? 0)}
          progressClassName="bg-sky-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Enrollment Mix</h2>
            <p className="text-sm text-stone-500">
              Live student counts by lifecycle status.
            </p>

            {summaryQuery.isLoading ? (
              <p className="mt-6 text-sm text-stone-400">Loading…</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {statusBreakdown.map((row) => (
                  <li key={row.status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{row.label}</span>
                      <span className="text-stone-500">
                        <span className="font-bold text-stone-900">{row.count}</span>{" "}
                        · {row.shareOfTotal}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-rose-700"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">Generated Reports</h2>
              <StatusBadge label={`${total} total`} tone="rose" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Report</th>
                    <th className="px-6 py-3">New</th>
                    <th className="px-6 py-3">Active</th>
                    <th className="px-6 py-3">Generated</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reportsQuery.isLoading && <LoadingRow colSpan={6} />}
                  {reportsQuery.isError && (
                    <ErrorRow
                      colSpan={6}
                      message={reportsQuery.error.message}
                      onRetry={() => reportsQuery.refetch()}
                    />
                  )}
                  {!reportsQuery.isLoading &&
                    !reportsQuery.isError &&
                    reports.map((report) => (
                      <tr key={report.id}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-stone-800">
                            {report.department}
                          </p>
                          <p className="text-xs text-stone-400">
                            {report.academicYear}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {report.totalNewStudents}
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {report.totalActiveStudents}
                        </td>
                        <td className="px-6 py-4 text-stone-600">
                          {report.generatedRelative}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            label={report.statusLabel}
                            tone={reportStatusTone[report.statusLabel]}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {report.sent ? (
                            <span className="text-xs text-stone-400">Sent</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => sendMutation.mutate(report.id)}
                              disabled={sendMutation.isPending}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline disabled:text-stone-300"
                            >
                              <SendIcon className="h-3.5 w-3.5" />
                              Send
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {!reportsQuery.isLoading &&
                    !reportsQuery.isError &&
                    reports.length === 0 && (
                      <EmptyRow colSpan={6} label="No reports generated yet." />
                    )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 text-sm">
              <p className="text-stone-500">
                Page {page} of {pageCount}
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
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Generate Report</h3>
            <p className="mt-1 text-sm text-stone-500">
              Counts are computed by the backend at generation time.
            </p>

            <label
              htmlFor="report-year"
              className="mt-5 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Academic Year
            </label>
            <select
              id="report-year"
              value={yearId}
              onChange={(e) => setGenerateYearId(e.target.value)}
              disabled={yearsQuery.isLoading}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
            >
              {yearsQuery.isLoading && <option>Loading…</option>}
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.yearLabel}
                </option>
              ))}
            </select>

            <label
              htmlFor="report-dept"
              className="mt-4 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Department
            </label>
            <select
              id="report-dept"
              value={generateDeptId}
              onChange={(e) => setGenerateDeptId(e.target.value)}
              disabled={departmentsQuery.isLoading}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 disabled:bg-stone-50"
            >
              <option value="ALL">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={!yearId || generateMutation.isPending}
              className="mt-5 w-full rounded-lg bg-rose-800 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {generateMutation.isPending ? "Generating…" : "Generate Report"}
            </button>

            {actionError && (
              <p className="mt-3 text-center text-xs font-medium text-rose-600">
                {actionError}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Delivery Status
            </h3>
            <p className="mt-3 text-2xl font-bold text-stone-900">
              {reports.filter((r) => r.sent).length}/{reports.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Reports on this page already delivered to the Principal.
            </p>
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
