"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import { CheckCircleIcon, PlusIcon, XIcon } from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  AcademicYearDetailDTO,
  DepartmentDetailDTO,
} from "@/lib/api/types";
import { formatDate } from "@/lib/format";

const AAO_KEY = ["academic-affairs"] as const;
const DEPARTMENTS_KEY = [...AAO_KEY, "departments"] as const;
const YEARS_KEY = [...AAO_KEY, "academic-years"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

/** Total rows that would block a delete, across either entity's counters. */
function dependants(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

type DeptDraft = { id: string | null; name: string };
type YearDraft = {
  id: string | null;
  yearLabel: string;
  startDate: string;
  endDate: string;
};

const emptyDept: DeptDraft = { id: null, name: "" };
const emptyYear: YearDraft = { id: null, yearLabel: "", startDate: "", endDate: "" };

export default function ProgramSetupPage() {
  const queryClient = useQueryClient();

  const [deptDraft, setDeptDraft] = useState<DeptDraft | null>(null);
  const [yearDraft, setYearDraft] = useState<YearDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const departmentsQuery = useApiQuery<DepartmentDetailDTO[]>(
    DEPARTMENTS_KEY,
    "/academic-affairs/departments",
  );
  const yearsQuery = useApiQuery<AcademicYearDetailDTO[]>(
    YEARS_KEY,
    "/academic-affairs/academic-years",
  );

  const departments = useMemo(
    () => departmentsQuery.data?.data ?? [],
    [departmentsQuery.data],
  );
  const years = useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data]);

  // Departments and years are embedded in nearly every other payload, so a
  // write here invalidates the whole Academic Affairs tree and the SAO lookups.
  async function invalidateLookups() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: AAO_KEY }),
      queryClient.invalidateQueries({ queryKey: ["lookups"] }),
    ]);
  }

  // ── Department mutations ──────────────────────────────────────────────────

  const saveDepartment = useMutation({
    mutationFn: (draft: DeptDraft) =>
      draft.id
        ? apiFetch<DepartmentDetailDTO>(`/academic-affairs/departments/${draft.id}`, {
            method: "PATCH",
            body: { name: draft.name.trim() },
          })
        : apiFetch<DepartmentDetailDTO>("/academic-affairs/departments", {
            method: "POST",
            body: { name: draft.name.trim() },
          }),
    onSuccess: async (_res, draft) => {
      await invalidateLookups();
      setDeptDraft(null);
      setFormError(null);
      showToast(draft.id ? "Department updated." : "Department created.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not save the department.")),
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/academic-affairs/departments/${id}`, { method: "DELETE" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateLookups();
      showToast("Department deleted.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not delete the department.")),
  });

  // ── Academic year mutations ───────────────────────────────────────────────

  const saveYear = useMutation({
    mutationFn: (draft: YearDraft) =>
      draft.id
        ? apiFetch<AcademicYearDetailDTO>(
            `/academic-affairs/academic-years/${draft.id}`,
            {
              method: "PATCH",
              body: {
                yearLabel: draft.yearLabel.trim(),
                startDate: draft.startDate,
                endDate: draft.endDate,
              },
            },
          )
        : apiFetch<AcademicYearDetailDTO>("/academic-affairs/academic-years", {
            method: "POST",
            body: {
              yearLabel: draft.yearLabel.trim(),
              startDate: draft.startDate,
              endDate: draft.endDate,
            },
          }),
    onSuccess: async (_res, draft) => {
      await invalidateLookups();
      setYearDraft(null);
      setFormError(null);
      showToast(draft.id ? "Academic year updated." : "Academic year created.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not save the academic year.")),
  });

  const deleteYear = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/academic-affairs/academic-years/${id}`, { method: "DELETE" }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateLookups();
      showToast("Academic year deleted.");
    },
    onError: (err) => setActionError(errorMessage(err, "Could not delete the academic year.")),
  });

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Academic Affairs", href: "/academic-affairs" },
          { label: "Program Setup" },
        ]}
        title="Departments & Academic Years"
        description="The institutional structure every program, course and semester is built on."
      />

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 p-5">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Departments</h2>
              <p className="text-sm text-stone-500">{departments.length} defined</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeptDraft(emptyDept);
                setFormError(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <PlusIcon className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">In Use By</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {departmentsQuery.isLoading && <LoadingRow colSpan={3} />}
                {departmentsQuery.isError && (
                  <ErrorRow
                    colSpan={3}
                    message={departmentsQuery.error.message}
                    onRetry={() => departmentsQuery.refetch()}
                  />
                )}
                {!departmentsQuery.isLoading &&
                  !departmentsQuery.isError &&
                  departments.map((d) => {
                    const locked = dependants(d._count) > 0;
                    return (
                      <tr key={d.id}>
                        <td className="px-5 py-4 font-semibold text-stone-800">
                          {d.name}
                        </td>
                        <td className="px-5 py-4 text-xs text-stone-500">
                          {locked
                            ? [
                                d._count.students ? `${d._count.students} students` : null,
                                d._count.programs ? `${d._count.programs} programs` : null,
                                d._count.courses ? `${d._count.courses} courses` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : "Unused"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDeptDraft({ id: d.id, name: d.name });
                                setFormError(null);
                              }}
                              className="text-sm font-semibold text-rose-700 hover:underline"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              disabled={locked || deleteDepartment.isPending}
                              title={
                                locked
                                  ? "In use — reassign its students, programs and courses first."
                                  : undefined
                              }
                              onClick={() => deleteDepartment.mutate(d.id)}
                              className="text-sm font-semibold text-stone-500 hover:text-rose-700 disabled:text-stone-300 disabled:hover:text-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {!departmentsQuery.isLoading &&
                  !departmentsQuery.isError &&
                  departments.length === 0 && (
                    <EmptyRow colSpan={3} label="No departments yet." />
                  )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 p-5">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Academic Years</h2>
              <p className="text-sm text-stone-500">{years.length} defined</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setYearDraft(emptyYear);
                setFormError(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
            >
              <PlusIcon className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3">Window</th>
                  <th className="px-5 py-3">In Use By</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {yearsQuery.isLoading && <LoadingRow colSpan={4} />}
                {yearsQuery.isError && (
                  <ErrorRow
                    colSpan={4}
                    message={yearsQuery.error.message}
                    onRetry={() => yearsQuery.refetch()}
                  />
                )}
                {!yearsQuery.isLoading &&
                  !yearsQuery.isError &&
                  years.map((y) => {
                    // programAcademicYears cascades, so only semesters block.
                    const locked = y._count.semesters > 0;
                    return (
                      <tr key={y.id}>
                        <td className="px-5 py-4 font-semibold text-stone-800">
                          {y.yearLabel}
                        </td>
                        <td className="px-5 py-4 text-xs text-stone-500">
                          {formatDate(y.startDate)} – {formatDate(y.endDate)}
                        </td>
                        <td className="px-5 py-4 text-xs text-stone-500">
                          {locked
                            ? `${y._count.semesters} semester${y._count.semesters === 1 ? "" : "s"}`
                            : "Unused"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setYearDraft({
                                  id: y.id,
                                  yearLabel: y.yearLabel,
                                  startDate: y.startDate.slice(0, 10),
                                  endDate: y.endDate.slice(0, 10),
                                });
                                setFormError(null);
                              }}
                              className="text-sm font-semibold text-rose-700 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={locked || deleteYear.isPending}
                              title={
                                locked
                                  ? "In use — delete its semesters first."
                                  : undefined
                              }
                              onClick={() => deleteYear.mutate(y.id)}
                              className="text-sm font-semibold text-stone-500 hover:text-rose-700 disabled:text-stone-300 disabled:hover:text-stone-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {!yearsQuery.isLoading && !yearsQuery.isError && years.length === 0 && (
                  <EmptyRow colSpan={4} label="No academic years yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
        Deleting is blocked while anything still references the row — the counts
        above show what would have to move first. Only an administrator can
        delete either.
      </p>

      {deptDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!deptDraft.name.trim()) {
                setFormError("A department name is required.");
                return;
              }
              saveDepartment.mutate(deptDraft);
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                {deptDraft.id ? "Rename Department" : "New Department"}
              </h3>
              <button
                type="button"
                onClick={() => setDeptDraft(null)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <label
              htmlFor="dept-name"
              className="mt-5 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Name
            </label>
            <input
              id="dept-name"
              required
              autoFocus
              placeholder="e.g. Engineering"
              value={deptDraft.name}
              onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
            />

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setDeptDraft(null)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveDepartment.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {saveDepartment.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {yearDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!yearDraft.yearLabel.trim() || !yearDraft.startDate || !yearDraft.endDate) {
                setFormError("Label, start date and end date are all required.");
                return;
              }
              if (yearDraft.startDate >= yearDraft.endDate) {
                setFormError("The start date must fall before the end date.");
                return;
              }
              saveYear.mutate(yearDraft);
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                {yearDraft.id ? "Edit Academic Year" : "New Academic Year"}
              </h3>
              <button
                type="button"
                onClick={() => setYearDraft(null)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="year-label"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Year Label
                </label>
                <input
                  id="year-label"
                  required
                  autoFocus
                  placeholder="e.g. 2027/28"
                  value={yearDraft.yearLabel}
                  onChange={(e) =>
                    setYearDraft({ ...yearDraft, yearLabel: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="year-start"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Starts
                  </label>
                  <input
                    id="year-start"
                    type="date"
                    required
                    value={yearDraft.startDate}
                    onChange={(e) =>
                      setYearDraft({ ...yearDraft, startDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="year-end"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Ends
                  </label>
                  <input
                    id="year-end"
                    type="date"
                    required
                    value={yearDraft.endDate}
                    onChange={(e) =>
                      setYearDraft({ ...yearDraft, endDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setYearDraft(null)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveYear.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {saveYear.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
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
