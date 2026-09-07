"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconStatCard } from "@/components/icon-stat-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  ClipboardIcon,
  FileTextIcon,
  FilterIcon,
  GraduationCapIcon,
  SearchIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  DepartmentDTO,
  StudentDTO,
  StudentImportResultDTO,
  StudentStatusDTO,
  StudentSummaryDTO,
} from "@/lib/api/types";
import {
  STUDENT_STATUS_OPTIONS,
  fromApiStudent,
  studentStatusTone,
} from "@/lib/student-affairs/students";
import { downloadCsv, percentOf } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";

const SAO_KEY = ["student-affairs"] as const;
const STUDENTS_KEY = [...SAO_KEY, "students"] as const;
const SUMMARY_KEY = [...SAO_KEY, "students", "summary"] as const;
const DEPARTMENTS_KEY = ["lookups", "departments"] as const;

const PAGE_SIZE = 10;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function StudentAffairsDashboard() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | StudentStatusDTO>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDraggingImport, setIsDraggingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Debounced so typing does not fire a request per keystroke.
  const debouncedSearch = useDebounced(search, 300);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const summaryQuery = useApiQuery<StudentSummaryDTO>(
    SUMMARY_KEY,
    "/student-affairs/students/summary",
  );

  const departmentsQuery = useApiQuery<DepartmentDTO[]>(
    DEPARTMENTS_KEY,
    "/student-affairs/departments",
  );

  const studentsQuery = useApiQuery<StudentDTO[]>(
    [...STUDENTS_KEY, { page, debouncedSearch, statusFilter, departmentFilter }],
    "/student-affairs/students",
    {
      query: {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        departmentId: departmentFilter === "ALL" ? undefined : departmentFilter,
      },
      placeholderData: (prev) => prev,
    },
  );

  const summary = summaryQuery.data?.data;
  const departments = departmentsQuery.data?.data ?? [];
  const students = useMemo(
    () => (studentsQuery.data?.data ?? []).map(fromApiStudent),
    [studentsQuery.data],
  );

  const total = studentsQuery.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const enrolled = summary?.byStatus.ENROLLED ?? 0;
  const pending = summary?.byStatus.PENDING ?? 0;
  const linkedRate = percentOf(enrolled, summary?.total ?? 0);

  // ── Bulk import ───────────────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const csv = await file.text();
      return apiFetch<StudentImportResultDTO>("/student-affairs/students/import", {
        method: "POST",
        body: { csv },
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: SAO_KEY });
      const { createdCount, failedCount, errors } = res.data;
      setShowBulkImportModal(false);
      setImportFile(null);
      setImportError(null);
      showToast(
        failedCount === 0
          ? `Imported ${createdCount} student${createdCount === 1 ? "" : "s"}.`
          : `Imported ${createdCount}, skipped ${failedCount} — first error: ${errors[0]?.message ?? "unknown"}`,
      );
    },
    onError: (err) => setImportError(errorMessage(err, "Import failed.")),
  });

  function selectImportFile(file: File | undefined | null) {
    if (!file) return;
    // The import endpoint takes CSV text; spreadsheets would need a parser we
    // do not run client-side.
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setImportError("Please upload a .csv file.");
      return;
    }
    setImportError(null);
    setImportFile(file);
  }

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  return (
    <div>
      <PageHeader
        title="Student Affairs"
        description="Central management portal for active student records and lifecycle transitions."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setImportFile(null);
                setImportError(null);
                setShowBulkImportModal(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              <UploadCloudIcon className="h-4 w-4" />
              Bulk Import
            </button>
            <Link
              href="/student-affairs/enrollment"
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <UserPlusIcon className="h-4 w-4" />
              Enroll Student
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IconStatCard
          icon={UsersIcon}
          label="Total Students"
          value={summaryQuery.isLoading ? "—" : (summary?.total ?? 0).toLocaleString()}
        />
        <IconStatCard
          icon={GraduationCapIcon}
          iconBgClassName="bg-sky-50 text-sky-600"
          label="Academic Year"
          value={summary?.currentAcademicYear?.yearLabel ?? "—"}
        />
        <IconStatCard
          icon={ShieldCheckIcon}
          label="Enrolled"
          value={summaryQuery.isLoading ? "—" : enrolled.toLocaleString()}
          trend={`${linkedRate}% of records`}
        />
        <IconStatCard
          icon={ClipboardIcon}
          label="Pending Approvals"
          value={summaryQuery.isLoading ? "—" : pending.toLocaleString()}
          {...(pending > 0
            ? { trend: `${pending} awaiting review`, trendTone: "warning" as const }
            : {})}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-5">
          <div className="relative min-w-[260px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by name, student number or email..."
              className="w-full rounded-lg border border-stone-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div className="relative">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) =>
                resetToFirstPage(setStatusFilter)(e.target.value as "ALL" | StudentStatusDTO)
              }
              className="appearance-none rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400"
            >
              <option value="ALL">All statuses</option>
              {STUDENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FilterIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>

          <select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={(e) => resetToFirstPage(setDepartmentFilter)(e.target.value)}
            disabled={departmentsQuery.isLoading}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:border-rose-400 disabled:bg-stone-50"
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
            onClick={() =>
              downloadCsv(
                "students.csv",
                ["Name", "Student Number", "Email", "Department", "Status", "Enrolled"],
                students.map((s) => [
                  s.name,
                  s.studentNumber,
                  s.email,
                  s.department,
                  s.statusLabel,
                  s.enrolledOn,
                ]),
              )
            }
            disabled={students.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
          >
            <FileTextIcon className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Student Number</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Enrolled</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {studentsQuery.isLoading && <LoadingRow colSpan={6} />}
              {studentsQuery.isError && (
                <ErrorRow
                  colSpan={6}
                  message={studentsQuery.error.message}
                  onRetry={() => studentsQuery.refetch()}
                />
              )}
              {!studentsQuery.isLoading &&
                !studentsQuery.isError &&
                students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${student.avatarColorClassName}`}
                        >
                          {student.initials}
                        </span>
                        <div>
                          <p className="font-semibold text-stone-800">{student.name}</p>
                          <p className="text-xs text-stone-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-stone-600">
                      {student.studentNumber}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{student.department}</td>
                    <td className="px-5 py-4 text-stone-600">{student.enrolledOn}</td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={student.statusLabel}
                        tone={studentStatusTone[student.status]}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {student.hasAccount ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Linked
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">No account</span>
                      )}
                    </td>
                  </tr>
                ))}
              {!studentsQuery.isLoading && !studentsQuery.isError && students.length === 0 && (
                <EmptyRow colSpan={6} label="No students match these filters." />
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm">
          <p className="text-stone-500">
            Page {page} of {pageCount} · {total.toLocaleString()} students
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Bulk Import Students</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Upload a CSV with a{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">
                    studentNumber,firstName,lastName
                  </code>{" "}
                  header. Optional columns: dateOfBirth, gender, personalEmail,
                  guardianName, guardianContact, contactDetails, bloodGroup,
                  enrollmentDate, status, departmentId.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDraggingImport
                  ? "border-rose-400 bg-rose-100/60"
                  : "border-rose-200 bg-rose-50/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImport(true);
              }}
              onDragLeave={() => setIsDraggingImport(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImport(false);
                selectImportFile(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <UploadCloudIcon className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-stone-800">
                Drag and drop your file here
              </p>
              <p className="mt-1 text-xs text-stone-500">Supports .csv files</p>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => selectImportFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <UploadCloudIcon className="h-4 w-4" />
                Browse Files
              </button>

              {importFile && (
                <div className="mx-auto mt-4 flex max-w-xs items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-stone-700">
                    <FileTextIcon className="h-4 w-4 shrink-0 text-rose-600" />
                    <span className="truncate">{importFile.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setImportFile(null)}
                    aria-label="Remove file"
                    className="shrink-0 text-stone-400 hover:text-rose-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {importError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{importError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!importFile) {
                    setImportError("Please select a file to import.");
                    return;
                  }
                  importMutation.mutate(importFile);
                }}
                disabled={importMutation.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {importMutation.isPending ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-xl">
          <CheckCircleIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
