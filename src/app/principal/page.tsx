"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { IconStatCard } from "@/components/icon-stat-card";
import {
  DownloadIcon,
  GraduationCapIcon,
  StarIcon,
  TrendUpIcon,
  UsersIcon,
} from "@/components/icons";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicPerformanceDTO,
  AcademicYearDTO,
  EnrollmentAnalyticsDTO,
  FacultyPerformanceDTO,
  GraduationAnalyticsDTO,
  InstitutionalMetricDTO,
} from "@/lib/api/types";
import {
  GRADE_BAR_COLORS,
  STATUS_BAR_COLORS,
} from "@/lib/principal/analytics-data";
import { downloadCsv, fullName, percentOf, titleCase } from "@/lib/format";

const PRINCIPAL_KEY = ["principal"] as const;

export default function PrincipalDashboard() {
  // Every analytics endpoint but /enrollment requires an academic year, so
  // resolve the most recent one first and gate the rest on it.
  const yearsQuery = useApiQuery<AcademicYearDTO[]>(
    ["lookups", "academic-years"],
    "/student-affairs/academic-years",
  );
  const yearId = yearsQuery.data?.data[0]?.id ?? "";
  const hasYear = Boolean(yearId);

  const enrollmentQuery = useApiQuery<EnrollmentAnalyticsDTO>(
    [...PRINCIPAL_KEY, "enrollment", { yearId }],
    "/principal/analytics/enrollment",
    { query: { academicYearId: yearId || undefined } },
  );
  const performanceQuery = useApiQuery<AcademicPerformanceDTO>(
    [...PRINCIPAL_KEY, "academic-performance", { yearId }],
    "/principal/analytics/academic-performance",
    { query: { academicYearId: yearId }, enabled: hasYear },
  );
  const facultyQuery = useApiQuery<FacultyPerformanceDTO>(
    [...PRINCIPAL_KEY, "faculty-performance", { yearId }],
    "/principal/analytics/faculty-performance",
    { query: { academicYearId: yearId }, enabled: hasYear },
  );
  const graduationQuery = useApiQuery<GraduationAnalyticsDTO>(
    [...PRINCIPAL_KEY, "graduation", { yearId }],
    "/principal/analytics/graduation",
    { query: { academicYearId: yearId }, enabled: hasYear },
  );
  // With a year supplied this returns one record, and 404s when that year has
  // no metrics — a normal state, so do not retry it.
  const metricsQuery = useApiQuery<InstitutionalMetricDTO>(
    [...PRINCIPAL_KEY, "institutional-metrics", { yearId }],
    "/principal/institutional-metrics",
    { query: { academicYearId: yearId }, enabled: hasYear, retry: false },
  );

  const enrollment = enrollmentQuery.data?.data;
  const performance = performanceQuery.data?.data;
  const faculty = facultyQuery.data?.data;
  const graduation = graduationQuery.data?.data;
  const metrics = metricsQuery.data?.data;

  const loading =
    yearsQuery.isLoading ||
    enrollmentQuery.isLoading ||
    performanceQuery.isLoading ||
    graduationQuery.isLoading;

  const byStatus = useMemo(() => {
    const rows = enrollment?.byStatus ?? [];
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({
      ...r,
      label: titleCase(r.status),
      percent: percentOf(r.count, max),
      shareOfTotal: percentOf(r.count, enrollment?.totalStudents ?? 0),
      colorClassName: STATUS_BAR_COLORS[r.status] ?? "bg-stone-500",
    }));
  }, [enrollment]);

  const byDepartment = useMemo(() => {
    const rows = enrollment?.byDepartment ?? [];
    const max = Math.max(1, ...rows.map((r) => r.count));
    return [...rows]
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ ...r, percent: percentOf(r.count, max) }));
  }, [enrollment]);

  const gradeBands = useMemo(() => {
    const rows = performance?.gradeDistribution ?? [];
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r, i) => ({
      ...r,
      percent: percentOf(r.count, max),
      shareOfTotal: percentOf(r.count, performance?.totalGradedStudents ?? 0),
      colorClassName: GRADE_BAR_COLORS[i % GRADE_BAR_COLORS.length] as string,
    }));
  }, [performance]);

  const topFaculty = useMemo(
    () =>
      [...(faculty?.teachers ?? [])]
        .filter((t) => t.avgFinalScore !== null)
        .sort((a, b) => (b.avgFinalScore ?? 0) - (a.avgFinalScore ?? 0))
        .slice(0, 6),
    [faculty],
  );

  return (
    <div>
      <PageHeader
        title="Institutional Analytics"
        description="Enrollment, academic performance, faculty output, and graduation outcomes."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "institutional-summary.csv",
                ["Metric", "Value"],
                [
                  ["Total students", enrollment?.totalStudents ?? 0],
                  ["New enrollments", enrollment?.newEnrollments ?? 0],
                  ["Average GPA", performance?.avgGpa ?? "—"],
                  ["Average final score", performance?.avgFinalScore ?? "—"],
                  ["Pass rate %", performance?.passRate ?? "—"],
                  ["Graduation rate %", graduation?.graduationRate ?? "—"],
                  ["Graduated", graduation?.graduated ?? 0],
                  ["Eligible", graduation?.eligible ?? 0],
                  ["Research funding USD", metrics?.researchFundingUsd ?? "—"],
                ],
              )
            }
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Download Summary
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IconStatCard
          icon={UsersIcon}
          label="Total Students"
          value={loading ? "—" : (enrollment?.totalStudents ?? 0).toLocaleString()}
          {...(enrollment?.newEnrollments != null
            ? { trend: `${enrollment.newEnrollments} new` }
            : {})}
        />
        <IconStatCard
          icon={StarIcon}
          iconBgClassName="bg-sky-50 text-sky-600"
          label="Average GPA"
          value={
            loading
              ? "—"
              : performance?.avgGpa != null
                ? performance.avgGpa.toFixed(2)
                : "No grades"
          }
          {...(performance?.passRate != null
            ? { trend: `${performance.passRate.toFixed(1)}% pass rate` }
            : {})}
        />
        <IconStatCard
          icon={GraduationCapIcon}
          label="Graduation Rate"
          value={
            loading
              ? "—"
              : graduation?.graduationRate != null
                ? `${graduation.graduationRate.toFixed(1)}%`
                : "—"
          }
          {...(graduation ? { trend: `${graduation.graduated} graduated` } : {})}
        />
        <IconStatCard
          icon={TrendUpIcon}
          label="Research Funding"
          value={
            metrics
              ? `$${(metrics.researchFundingUsd / 1_000_000).toFixed(2)}M`
              : metricsQuery.isLoading
                ? "—"
                : "Not set"
          }
          {...(metrics?.averageInstitutionalGpa != null
            ? { trend: `Institutional GPA ${metrics.averageInstitutionalGpa.toFixed(2)}` }
            : {})}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-bold text-stone-900">Enrollment by Status</h2>
          <p className="text-sm text-stone-500">
            {enrollment?.totalStudents ?? 0} students across all lifecycle states.
          </p>
          {enrollmentQuery.isLoading ? (
            <p className="mt-5 text-sm text-stone-400">Loading…</p>
          ) : byStatus.length === 0 ? (
            <p className="mt-5 text-sm text-stone-400">No student records.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {byStatus.map((row) => (
                <li key={row.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">{row.label}</span>
                    <span className="text-stone-500">
                      <span className="font-bold text-stone-900">{row.count}</span> ·{" "}
                      {row.shareOfTotal}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${row.colorClassName}`}
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-bold text-stone-900">Enrollment by Department</h2>
          <p className="text-sm text-stone-500">Head count per department.</p>
          {enrollmentQuery.isLoading ? (
            <p className="mt-5 text-sm text-stone-400">Loading…</p>
          ) : byDepartment.length === 0 ? (
            <p className="mt-5 text-sm text-stone-400">No departments.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {byDepartment.map((row) => (
                <li key={row.departmentId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">
                      {row.departmentName}
                    </span>
                    <span className="font-bold text-stone-900">{row.count}</span>
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

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-bold text-stone-900">Grade Distribution</h2>
          <p className="text-sm text-stone-500">
            {performance?.totalGradedStudents ?? 0} published final grades.
          </p>
          {performanceQuery.isLoading ? (
            <p className="mt-5 text-sm text-stone-400">Loading…</p>
          ) : gradeBands.length === 0 ? (
            <p className="mt-5 text-sm text-stone-400">
              No grades published yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {gradeBands.map((band) => (
                <li key={band.letterGrade}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">
                      {band.letterGrade}
                    </span>
                    <span className="text-stone-500">
                      <span className="font-bold text-stone-900">{band.count}</span> ·{" "}
                      {band.shareOfTotal}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${band.colorClassName}`}
                      style={{ width: `${band.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-bold text-stone-900">Graduation Outcomes</h2>
          <p className="text-sm text-stone-500">
            {graduation?.totalEvaluated ?? 0} students evaluated.
          </p>
          {graduationQuery.isLoading ? (
            <p className="mt-5 text-sm text-stone-400">Loading…</p>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Graduated", value: graduation?.graduated ?? 0, tone: "green" as const },
                  { label: "Eligible", value: graduation?.eligible ?? 0, tone: "sky" as const },
                  {
                    label: "Not eligible",
                    value: graduation?.notEligible ?? 0,
                    tone: "rose" as const,
                  },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl bg-stone-50 p-4 text-center">
                    <p className="text-2xl font-bold text-stone-900">{c.value}</p>
                    <p className="mt-1 text-xs text-stone-500">{c.label}</p>
                  </div>
                ))}
              </div>
              {graduation?.graduationRate != null && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">Graduation rate</span>
                    <span className="font-bold text-stone-900">
                      {graduation.graduationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${Math.min(100, graduation.graduationRate)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Faculty Performance</h2>
            <p className="text-sm text-stone-500">
              Ranked by the average final score across their classes.
            </p>
          </div>
          {faculty?.overallFacultyPerformance != null && (
            <StatusBadge
              label={`Overall ${faculty.overallFacultyPerformance.toFixed(1)}`}
              tone="rose"
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Classes</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3">Avg Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {facultyQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!facultyQuery.isLoading &&
                topFaculty.map((t) => (
                  <tr key={t.teacherId}>
                    <td className="px-6 py-4 font-medium text-stone-800">
                      {fullName(t.firstName, t.lastName)}
                    </td>
                    <td className="px-6 py-4 text-stone-600">{t.classCount}</td>
                    <td className="px-6 py-4 text-stone-600">{t.studentCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-rose-700"
                            style={{ width: `${Math.min(100, t.avgFinalScore ?? 0)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-stone-800">
                          {(t.avgFinalScore ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              {!facultyQuery.isLoading && topFaculty.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-stone-400">
                    No graded classes to rank yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
