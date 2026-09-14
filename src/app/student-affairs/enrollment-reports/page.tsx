"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MetricStatCard } from "@/components/metric-stat-card";
import { PageHeader } from "@/components/page-header";
import { PlusIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type { AcademicYearDTO, DepartmentDTO, EnrollmentReportDTO, GenerateReportBody, StudentDTO, StudentSummaryDTO } from "@/lib/api/types";
import { GenerateReportModal } from "@/components/student-affairs/reports/generate-report-modal";
import { ReportsListCard } from "@/components/student-affairs/reports/reports-list-card";
import { EnrolledAuditTable } from "@/components/student-affairs/reports/enrolled-audit-table";
import { exportStudentsCsv } from "@/components/student-affairs/reports/export-csv";

export default function EnrollmentReportingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const summary = useApiQuery<StudentSummaryDTO>(["student-affairs", "summary"], "/student-affairs/students/summary").data?.data;
  const years = useApiQuery<AcademicYearDTO[]>(["academic-years"], "/student-affairs/academic-years").data?.data ?? [];
  const depts = useApiQuery<DepartmentDTO[]>(["departments"], "/student-affairs/departments").data?.data ?? [];
  const reportsQuery = useApiQuery<EnrollmentReportDTO[]>(["student-affairs", "reports", { page }], "/student-affairs/enrollment-reports", { query: { page, limit: 10 } });
  const studentsQuery = useApiQuery<StudentDTO[]>(["student-affairs", "audit-students", { page }], "/student-affairs/students", { query: { page, limit: 10, status: "ENROLLED" } });

  const generateMutation = useMutation({
    mutationFn: (body: GenerateReportBody) => apiFetch<EnrollmentReportDTO>("/student-affairs/enrollment-reports", { method: "POST", body }),
    onSuccess: async () => {
      setShowModal(false);
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "reports"] });
      setToast("Report generated successfully."); setTimeout(() => setToast(null), 3000);
    },
    onError: (e: Error) => setToast(e.message || "Failed to generate report."),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiFetch<EnrollmentReportDTO>(`/student-affairs/enrollment-reports/${id}/send`, { method: "PATCH" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "reports"] });
      setToast("Report sent to Principal."); setTimeout(() => setToast(null), 3000);
    },
    onError: (e: Error) => setToast(e.message || "Failed to send report."),
  });

  const students = studentsQuery.data?.data ?? [];
  const totalAuditPages = Math.max(1, Math.ceil((studentsQuery.data?.pagination?.total ?? 0) / 10));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/student-affairs" }, { label: "Reports" }]}
        title="Enrollment Reporting & Verification"
        description="Audit enrollment statistics and generate official reports for dispatch to the Principal."
        actions={<button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded-lg bg-rose-800 px-4 py-2 text-xs font-bold text-white hover:bg-rose-900"><PlusIcon className="h-3.5 w-3.5" /> Generate Report</button>}
      />

      {toast && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">{toast}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricStatCard
          label="Total Active Students"
          value={summary ? summary.byStatus.ENROLLED.toLocaleString() : "…"}
          trend="Active"
          progress={summary?.total ? Math.min(100, Math.round(((summary.byStatus.ENROLLED ?? 0) / summary.total) * 100)) : 0}
        />
        <MetricStatCard
          label="New Enrollees"
          value={summary ? summary.total.toLocaleString() : "…"}
          trend="Total"
          progress={summary?.total ? 100 : 0}
        />
        <MetricStatCard
          label="Current Academic Session"
          value={summary?.currentAcademicYear?.yearLabel || "N/A"}
          trend="Session"
          progress={summary?.currentAcademicYear ? 100 : 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <EnrolledAuditTable students={students} isLoading={studentsQuery.isLoading} isError={studentsQuery.isError} onRetry={() => studentsQuery.refetch()} page={page} totalPages={totalAuditPages} onPageChange={setPage} onExportCsv={() => exportStudentsCsv(students)} />
        <ReportsListCard reports={reportsQuery.data?.data ?? []} isLoading={reportsQuery.isLoading} onOpenGenerate={() => setShowModal(true)} onSendReport={(id) => sendMutation.mutate(id)} isSending={sendMutation.isPending} />
      </div>

      <GenerateReportModal isOpen={showModal} onClose={() => setShowModal(false)} academicYears={years} departments={depts} isSubmitting={generateMutation.isPending} onSubmit={(yId, dId) => generateMutation.mutate({ academicYearId: yId, departmentId: dId })} />
    </div>
  );
}
