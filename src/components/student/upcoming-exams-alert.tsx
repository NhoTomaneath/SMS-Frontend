"use client";

import Link from "next/link";
import { AlertTriangleIcon, CalendarIcon, ClockIcon, MapPinIcon } from "@/components/icons";
import type { OwnExamDTO } from "@/lib/api/types";
import { countdownLabel, fromApiOwnExam } from "@/lib/student/dashboard-data";

/** Exams this close get the loud treatment. */
const SOON_DAYS = 3;
const SHOWN = 3;

/**
 * The dashboard's exam heads-up: what is coming, when, where, and whether the
 * paper is out yet. Renders nothing when there is nothing to prepare for.
 */
export function UpcomingExamsAlert({ exams }: { exams: OwnExamDTO[] }) {
  const rows = exams.map(fromApiOwnExam).filter((e) => e.daysAway >= 0);
  if (rows.length === 0) return null;

  const soon = rows.some((e) => e.daysAway <= SOON_DAYS);

  return (
    <section
      className={`mb-6 rounded-2xl border p-5 ${
        soon ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
      }`}
      aria-label="Upcoming exams"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className={`h-5 w-5 ${soon ? "text-rose-700" : "text-amber-700"}`} />
          <h2 className="text-lg font-bold text-stone-900">
            {soon ? "Exam coming up soon" : "Upcoming exams"}
          </h2>
        </div>
        <Link
          href="/student/exams-results"
          className="text-sm font-semibold text-rose-700 hover:underline"
        >
          Exam schedule &amp; papers
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.slice(0, SHOWN).map((exam) => (
          <li
            key={exam.id}
            className="rounded-xl border border-white/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-stone-900">
                  {exam.code} · {exam.examType}
                </p>
                <p className="truncate text-xs text-stone-500">{exam.subject}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  exam.daysAway <= SOON_DAYS
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {countdownLabel(exam.daysAway)}
              </span>
            </div>

            <dl className="mt-3 space-y-1.5 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 shrink-0 text-stone-400" />
                <dd>{exam.date}</dd>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 shrink-0 text-stone-400" />
                <dd>{exam.time}</dd>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 shrink-0 text-stone-400" />
                <dd>{exam.rooms}</dd>
              </div>
            </dl>

            <div className="mt-3 border-t border-stone-100 pt-3 text-xs">
              {exam.examPaperUrl ? (
                <a
                  href={exam.examPaperUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-rose-700 hover:underline"
                >
                  Paper released — download
                </a>
              ) : (
                <span className="text-stone-400">Paper not released yet</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {rows.length > SHOWN && (
        <p className="mt-3 text-xs text-stone-500">
          + {rows.length - SHOWN} more on your exam schedule.
        </p>
      )}
    </section>
  );
}
