"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import { DownloadIcon } from "@/components/icons";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  OwnAcademicStandingDTO,
  OwnExamDTO,
  OwnResultDTO,
} from "@/lib/api/types";
import {
  examTone,
  fromApiOwnExam,
  fromApiOwnResult,
  gradeDistributionOf,
} from "@/lib/student/dashboard-data";
import { downloadCsv, titleCase } from "@/lib/format";

const STUDENT_KEY = ["student"] as const;

export default function StudentExamsResultsPage() {
  const examsQuery = useApiQuery<OwnExamDTO[]>(
    [...STUDENT_KEY, "exams"],
    "/student/me/exams",
  );

  const resultsQuery = useApiQuery<OwnResultDTO[]>(
    [...STUDENT_KEY, "results"],
    "/student/me/results",
  );

  const standingQuery = useApiQuery<OwnAcademicStandingDTO>(
    [...STUDENT_KEY, "standing"],
    "/student/me/academic-standing",
  );

  const exams = useMemo(
    () => (examsQuery.data?.data ?? []).map(fromApiOwnExam),
    [examsQuery.data],
  );

  const results = useMemo(
    () => (resultsQuery.data?.data ?? []).map(fromApiOwnResult),
    [resultsQuery.data],
  );

  const standing = standingQuery.data?.data;
  const distribution = useMemo(() => gradeDistributionOf(results), [results]);

  const published = results.filter((r) => r.status === "PUBLISHED");
  const upcoming = exams.filter(
    (e) => e.status === "SCHEDULED" || e.status === "PUBLISHED",
  );

  return (
    <div>
      <PageHeader
        title="Exams & Results"
        description="Your exam schedule and the grades released to you."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "my-results.csv",
                ["Course", "Subject", "Coursework", "Exam", "Final", "Grade", "GPA"],
                published.map((r) => [
                  r.code,
                  r.subject,
                  r.coursework,
                  r.exam,
                  r.finalScore,
                  r.letterGrade,
                  r.gpaPoints,
                ]),
              )
            }
            disabled={published.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
          >
            <DownloadIcon className="h-4 w-4" />
            Export Results
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Cumulative GPA",
            value:
              standing?.cumulativeGpa != null
                ? standing.cumulativeGpa.toFixed(2)
                : "—",
          },
          { label: "Courses Completed", value: String(standing?.completedCourses ?? 0) },
          { label: "Published Results", value: String(published.length) },
          { label: "Upcoming Exams", value: String(upcoming.length) },
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">Exam Schedule</h2>
              <StatusBadge label={`${exams.length} exams`} tone="rose" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Date &amp; Time</th>
                    <th className="px-6 py-3">Room</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {examsQuery.isLoading && <LoadingRow colSpan={5} />}
                  {examsQuery.isError && (
                    <ErrorRow
                      colSpan={5}
                      message={examsQuery.error.message}
                      onRetry={() => examsQuery.refetch()}
                    />
                  )}
                  {!examsQuery.isLoading &&
                    !examsQuery.isError &&
                    exams.map((exam) => (
                      <tr key={exam.id}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-rose-700">{exam.code}</p>
                          <p className="text-xs text-stone-500">{exam.subject}</p>
                        </td>
                        <td className="px-6 py-4 text-stone-600">{exam.examType}</td>
                        <td className="px-6 py-4">
                          <p className="text-stone-700">{exam.date}</p>
                          <p className="text-xs text-stone-400">{exam.time}</p>
                        </td>
                        <td className="px-6 py-4 text-stone-600">{exam.rooms}</td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            label={titleCase(exam.status)}
                            tone={examTone[exam.status]}
                          />
                        </td>
                      </tr>
                    ))}
                  {!examsQuery.isLoading && !examsQuery.isError && exams.length === 0 && (
                    <EmptyRow colSpan={5} label="No exams scheduled for your classes." />
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 p-6">
              <h2 className="text-xl font-bold text-stone-900">My Results</h2>
              <StatusBadge label={`${published.length} published`} tone="green" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Coursework</th>
                    <th className="px-6 py-3">Exam</th>
                    <th className="px-6 py-3">Final</th>
                    <th className="px-6 py-3">Grade</th>
                    <th className="px-6 py-3">Released</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {resultsQuery.isLoading && <LoadingRow colSpan={6} />}
                  {resultsQuery.isError && (
                    <ErrorRow
                      colSpan={6}
                      message={resultsQuery.error.message}
                      onRetry={() => resultsQuery.refetch()}
                    />
                  )}
                  {!resultsQuery.isLoading &&
                    !resultsQuery.isError &&
                    results.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-rose-700">{r.code}</p>
                          <p className="text-xs text-stone-500">{r.subject}</p>
                        </td>
                        <td className="px-6 py-4 text-stone-600">{r.coursework}</td>
                        <td className="px-6 py-4 text-stone-600">{r.exam}</td>
                        <td className="px-6 py-4 font-semibold text-stone-800">
                          {r.finalScore}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-rose-700">
                            {r.letterGrade}
                          </span>
                          <span className="ml-1.5 text-xs text-stone-400">
                            {r.gpaPoints.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-600">{r.publishedAt}</td>
                      </tr>
                    ))}
                  {!resultsQuery.isLoading &&
                    !resultsQuery.isError &&
                    results.length === 0 && (
                      <EmptyRow
                        colSpan={6}
                        label="No results released yet. Grades appear once the Controller of Examination publishes them."
                      />
                    )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Grade Distribution</h3>
            <p className="text-xs text-stone-500">Across your published results.</p>
            {published.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                Nothing published yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {distribution.map((band) => (
                  <li key={band.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{band.label}</span>
                      <span className="font-bold text-stone-900">
                        {band.count}
                        <span className="ml-1 text-xs font-normal text-stone-400">
                          {band.percent}%
                        </span>
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
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Academic Standing
            </h3>
            {standing ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Cumulative GPA</dt>
                  <dd className="font-bold text-stone-900">
                    {standing.cumulativeGpa != null
                      ? standing.cumulativeGpa.toFixed(2)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Courses completed</dt>
                  <dd className="text-stone-700">{standing.completedCourses}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Semesters</dt>
                  <dd className="text-stone-700">{standing.semesterCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Year level</dt>
                  <dd className="text-stone-700">{standing.yearLevel}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-stone-400">
                {standingQuery.isLoading ? "Loading…" : "Unavailable."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
