import type { SubmissionItem } from "../types";

export function exportSubmissionsCsv(submissions: SubmissionItem[], title?: string) {
  if (submissions.length === 0) return;
  const header = "Student Number,First Name,Last Name,Score\n";
  const rows = submissions
    .map((s) => `"${s.student.studentNumber}","${s.student.firstName}","${s.student.lastName}",${s.score ?? ""}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `submissions-${title || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
