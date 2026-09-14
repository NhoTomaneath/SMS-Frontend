"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  CheckCircleIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  FacultyPerformanceDTO,
  FacultyProfileDTO,
  TeacherOptionDTO,
} from "@/lib/api/types";
import {
  fromApiFacultyProfile,
  performanceTone,
  type FacultyRow,
} from "@/lib/principal/analytics-data";
import { downloadCsv, fullName, percentOf } from "@/lib/format";

const PRINCIPAL_KEY = ["principal"] as const;
const FACULTY_KEY = [...PRINCIPAL_KEY, "faculty-profiles"] as const;

const PERFORMANCE_LABELS = ["Excellent", "Strong", "Satisfactory", "Needs Support"];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

const emptyForm = {
  userId: "",
  departmentName: "",
  publicationIndex: "0",
  studentRating: "4.0",
  performanceLabel: "Strong",
};

export default function StaffRecordsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const profilesQuery = useApiQuery<FacultyProfileDTO[]>(
    FACULTY_KEY,
    "/principal/faculty-profiles",
  );

  const performanceQuery = useApiQuery<FacultyPerformanceDTO>(
    [...PRINCIPAL_KEY, "faculty-performance"],
    "/principal/analytics/faculty-performance",
  );

  const teachersQuery = useApiQuery<TeacherOptionDTO[]>(
    [...PRINCIPAL_KEY, "teachers"],
    "/academic-affairs/teachers",
  );

  const profiles = useMemo(
    () => (profilesQuery.data?.data ?? []).map(fromApiFacultyProfile),
    [profilesQuery.data],
  );

  const teachers = teachersQuery.data?.data ?? [];
  const performance = performanceQuery.data?.data;

  // Teaching load comes from the analytics endpoint, keyed by user id.
  const loadByTeacher = useMemo(() => {
    const map = new Map<string, { classCount: number; studentCount: number }>();
    for (const t of performance?.teachers ?? []) {
      map.set(t.teacherId, { classCount: t.classCount, studentCount: t.studentCount });
    }
    return map;
  }, [performance]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  // Head count per department, from the profiles themselves.
  const byDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles) {
      counts.set(p.department, (counts.get(p.department) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, percent: percentOf(count, max) }))
      .sort((a, b) => b.count - a.count);
  }, [profiles]);

  // Teachers with no faculty profile yet — the gap this page exists to close.
  const unprofiled = teachers.filter(
    (t) => !profiles.some((p) => p.userId === t.id),
  );

  // ── Mutation ──────────────────────────────────────────────────────────────

  const upsertProfile = useMutation({
    mutationFn: () =>
      apiFetch<FacultyProfileDTO>("/principal/faculty-profiles", {
        method: "PUT",
        body: {
          userId: form.userId,
          departmentName: form.departmentName.trim(),
          publicationIndex: Number(form.publicationIndex),
          studentRating: Number(form.studentRating),
          performanceLabel: form.performanceLabel,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FACULTY_KEY });
      setShowEdit(false);
      setForm(emptyForm);
      setFormError(null);
      showToast("Faculty profile saved.");
    },
    onError: (err) => setFormError(errorMessage(err, "Could not save the profile.")),
  });

  function openFor(row: FacultyRow | null, teacherId?: string) {
    if (row) {
      setForm({
        userId: row.userId,
        departmentName: row.department,
        publicationIndex: String(row.publicationIndex),
        studentRating: String(row.studentRating),
        performanceLabel: row.performanceLabel,
      });
    } else {
      const teacher = teachers.find((t) => t.id === teacherId);
      setForm({
        ...emptyForm,
        userId: teacherId ?? "",
        departmentName: teacher?.departmentName ?? "",
      });
    }
    setFormError(null);
    setShowEdit(true);
  }

  return (
    <div>
      <PageHeader
        title="Staff Records"
        description="Faculty profiles, teaching load, and performance ratings."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "faculty.csv",
                ["Name", "Email", "Department", "Classes", "Students", "Publications", "Rating", "Performance"],
                filtered.map((p) => {
                  const load = loadByTeacher.get(p.userId);
                  return [
                    p.name,
                    p.email,
                    p.department,
                    load?.classCount ?? 0,
                    load?.studentCount ?? 0,
                    p.publicationIndex,
                    p.studentRating,
                    p.performanceLabel,
                  ];
                }),
              )
            }
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
          >
            <DownloadIcon className="h-4 w-4" />
            Export
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-5">
            <div className="relative min-w-[240px] flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or department..."
                className="w-full rounded-lg border border-stone-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <StatusBadge label={`${profiles.length} profiles`} tone="rose" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-3">Faculty</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Load</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Performance</th>
                  <th className="px-5 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {profilesQuery.isLoading && <LoadingRow colSpan={6} />}
                {profilesQuery.isError && (
                  <ErrorRow
                    colSpan={6}
                    message={profilesQuery.error.message}
                    onRetry={() => profilesQuery.refetch()}
                  />
                )}
                {!profilesQuery.isLoading &&
                  !profilesQuery.isError &&
                  filtered.map((p) => {
                    const load = loadByTeacher.get(p.userId);
                    return (
                      <tr key={p.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.avatarColorClassName}`}
                            >
                              {p.initials}
                            </span>
                            <div>
                              <p className="font-semibold text-stone-800">{p.name}</p>
                              <p className="text-xs text-stone-400">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-stone-600">{p.department}</td>
                        <td className="px-5 py-4 text-stone-600">
                          {load ? (
                            <>
                              {load.classCount} class{load.classCount === 1 ? "" : "es"}
                              <span className="ml-1.5 text-xs text-stone-400">
                                {load.studentCount} students
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-stone-400">No classes</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-stone-800">
                            {p.studentRating.toFixed(1)}
                          </span>
                          <span className="ml-1 text-xs text-stone-400">/ 5</span>
                          <p className="text-xs text-stone-400">
                            {p.publicationIndex} publications
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            label={p.performanceLabel}
                            tone={performanceTone(p.performanceLabel)}
                          />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openFor(p)}
                            className="text-sm font-semibold text-rose-700 hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {!profilesQuery.isLoading &&
                  !profilesQuery.isError &&
                  filtered.length === 0 && (
                    <EmptyRow colSpan={6} label="No faculty match this search." />
                  )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-bold text-stone-900">Faculty by Department</h3>
            {byDepartment.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">No profiles yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {byDepartment.map((d) => (
                  <li key={d.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{d.name}</span>
                      <span className="font-bold text-stone-900">{d.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-rose-700"
                        style={{ width: `${d.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Missing Profiles
            </h3>
            {unprofiled.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-700">
                Every teacher has a faculty profile.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-stone-500">
                  These teacher accounts have no faculty profile yet.
                </p>
                <ul className="mt-3 space-y-2">
                  {unprofiled.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-stone-700">
                        {fullName(t.firstName, t.lastName)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openFor(null, t.id)}
                        className="shrink-0 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.userId || !form.departmentName.trim()) {
                setFormError("Teacher and department are required.");
                return;
              }
              upsertProfile.mutate();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900">Faculty Profile</h3>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="f-teacher"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Teacher
                </label>
                <select
                  id="f-teacher"
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                >
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t.firstName, t.lastName)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="f-dept"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Department
                </label>
                <input
                  id="f-dept"
                  required
                  value={form.departmentName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, departmentName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="f-pubs"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Publications
                  </label>
                  <input
                    id="f-pubs"
                    type="number"
                    min={0}
                    value={form.publicationIndex}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publicationIndex: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="f-rating"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                  >
                    Student Rating
                  </label>
                  <input
                    id="f-rating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={form.studentRating}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, studentRating: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="f-label"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
                >
                  Performance
                </label>
                <select
                  id="f-label"
                  value={form.performanceLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, performanceLabel: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400"
                >
                  {PERFORMANCE_LABELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={upsertProfile.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {upsertProfile.isPending ? "Saving…" : "Save Profile"}
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
