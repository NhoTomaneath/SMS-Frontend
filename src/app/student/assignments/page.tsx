"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ErrorRow, LoadingRow } from "@/components/query-states";
import { CourseworkRow } from "@/components/student/coursework-row";
import { useApiQuery } from "@/lib/api/hooks";
import type { OwnAssignmentDTO } from "@/lib/api/types";
import { fromApiOwnAssignment, type CourseworkItem } from "@/lib/student/dashboard-data";

const STUDENT_KEY = ["student"] as const;

export default function StudentAssignmentsPage() {
  const query = useApiQuery<OwnAssignmentDTO[]>(
    [...STUDENT_KEY, "assignments"],
    "/student/me/assignments",
  );

  const items = useMemo(
    () => (query.data?.data ?? []).map(fromApiOwnAssignment),
    [query.data],
  );

  const sections: Array<{ title: string; hint: string; tone: "amber" | "rose" | "green"; rows: CourseworkItem[] }> = [
    {
      title: "To do",
      hint: "Open work, soonest deadline first.",
      tone: "amber",
      rows: items.filter((i) => ["URGENT", "IN_PROGRESS", "UPCOMING"].includes(i.status)),
    },
    {
      title: "Overdue",
      hint: "Past the deadline. You can still hand it in — it will be marked late.",
      tone: "rose",
      rows: items.filter((i) => i.status === "OVERDUE"),
    },
    {
      title: "Handed in",
      hint: "Submitted or graded. Replace a file until your teacher grades it.",
      tone: "green",
      rows: items.filter((i) => i.status === "SUBMITTED" || i.status === "GRADED"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Everything assigned in your classes this semester — and where to submit it."
      />

      {query.isLoading && (
        <table className="w-full">
          <tbody>
            <LoadingRow colSpan={1} />
          </tbody>
        </table>
      )}
      {query.isError && (
        <table className="w-full">
          <tbody>
            <ErrorRow
              colSpan={1}
              message={query.error.message}
              onRetry={() => query.refetch()}
            />
          </tbody>
        </table>
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-400">
          Nothing has been assigned in your classes yet.
        </p>
      )}

      <div className="space-y-6">
        {sections
          .filter((section) => section.rows.length > 0)
          .map((section) => (
            <section key={section.title} className="rounded-2xl border border-stone-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 p-6">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{section.title}</h2>
                  <p className="text-xs text-stone-500">{section.hint}</p>
                </div>
                <StatusBadge label={`${section.rows.length}`} tone={section.tone} />
              </div>
              <ul className="divide-y divide-stone-100">
                {section.rows.map((item) => (
                  <CourseworkRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
