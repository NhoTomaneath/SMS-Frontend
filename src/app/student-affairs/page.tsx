"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type { DepartmentDTO, ImportStudentsResultDTO, StudentDTO, StudentStatus, StudentSummaryDTO } from "@/lib/api/types";
import { ManagementMetrics } from "@/components/student-affairs/management/management-metrics";
import { ManagementFilterBar } from "@/components/student-affairs/management/management-filter-bar";
import { ManagementTable } from "@/components/student-affairs/management/management-table";
import { ManagementPagination } from "@/components/student-affairs/management/management-pagination";
import { BulkImportModal } from "@/components/student-affairs/management/bulk-import-modal";
import { StudentProfileModal } from "@/app/student-affairs/student-profile-modal";
import { EditStudentModal } from "@/app/student-affairs/edit-student-modal";

const PAGE_SIZE = 10;

export default function StudentAffairsDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState<StudentDTO | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentDTO | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const summaryQuery = useApiQuery<StudentSummaryDTO>(["student-affairs", "summary"], "/student-affairs/students/summary");
  const deptsQuery = useApiQuery<DepartmentDTO[]>(["departments"], "/student-affairs/departments");
  const studentsQuery = useApiQuery<StudentDTO[]>(
    ["student-affairs", "students", { page, debouncedSearch, deptFilter, statusFilter }],
    "/student-affairs/students",
    { query: { page, limit: PAGE_SIZE, search: debouncedSearch || undefined, departmentId: deptFilter !== "ALL" ? deptFilter : undefined, status: statusFilter !== "ALL" ? statusFilter : undefined } }
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudentStatus }) => apiFetch(`/student-affairs/students/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs"] });
      setActionMenuId(null);
      setToast("Status updated"); setTimeout(() => setToast(null), 2500);
    },
  });

  const students = studentsQuery.data?.data ?? [];
  const departments = deptsQuery.data?.data ?? [];
  const total = studentsQuery.data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader breadcrumb={[{ label: "Dashboard" }]} title="Student Directory & Registry" description="Manage enrolled students, update statuses, and attach verification documents." />
      {toast && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">{toast}</p>}
      <ManagementMetrics summary={summaryQuery.data?.data} isLoading={summaryQuery.isLoading} />
      <ManagementFilterBar searchInput={search} onSearchChange={setSearch} departmentFilter={deptFilter} onDepartmentChange={(d) => { setDeptFilter(d); setPage(1); }} statusFilter={statusFilter} onStatusChange={(s) => { setStatusFilter(s); setPage(1); }} departments={departments} onOpenBulkImport={() => setShowBulkImport(true)} />
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <ManagementTable students={students} isLoading={studentsQuery.isLoading} isError={studentsQuery.isError} error={studentsQuery.error} onRetry={() => studentsQuery.refetch()} actionMenuStudentId={actionMenuId} onToggleAction={(id) => setActionMenuId(actionMenuId === id ? null : id)} onViewProfile={(s) => setSelectedStudent(s)} onEdit={(s) => { setEditingStudent(s); setActionMenuId(null); }} onStatusChange={(id, st) => statusMutation.mutate({ id, status: st })} />
        <ManagementPagination page={page} totalPages={totalPages} totalStudents={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
      {selectedStudent && <StudentProfileModal student={selectedStudent} isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} onEdit={() => setEditingStudent(selectedStudent)} />}
      {editingStudent && <EditStudentModal student={editingStudent} departments={departments} isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} onSuccess={(u) => { setEditingStudent(null); if (selectedStudent?.id === u.id) setSelectedStudent(u); setToast("Record updated"); setTimeout(() => setToast(null), 2500); }} />}
      <BulkImportModal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} onSuccess={(r: ImportStudentsResultDTO) => { queryClient.invalidateQueries({ queryKey: ["student-affairs"] }); setToast(`Imported ${r.createdCount} students.`); setTimeout(() => setToast(null), 3000); }} />
    </div>
  );
}
