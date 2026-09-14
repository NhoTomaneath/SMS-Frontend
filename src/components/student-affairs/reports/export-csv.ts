import type { StudentDTO } from "@/lib/api/types";

export function exportStudentsCsv(rows: StudentDTO[]) {
  const header = ["Student Number", "First Name", "Last Name", "Email", "Department", "Status", "Enrollment Date"];
  const lines = rows.map((r) => [
    r.studentNumber,
    r.firstName,
    r.lastName,
    r.personalEmail || "",
    r.department?.name || "",
    r.status,
    r.enrollmentDate ? new Date(r.enrollmentDate).toLocaleDateString() : "",
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "enrolled-students-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
