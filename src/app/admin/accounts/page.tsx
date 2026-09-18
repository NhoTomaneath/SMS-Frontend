"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import {
  DownloadIcon,
  EnvelopeIcon,
  FilterIcon,
  IdCardIcon,
  MoreVerticalIcon,
  PrinterIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type { AccountDTO, BackendRole } from "@/lib/api/types";
import {
  ROLE_OPTIONS,
  fromApiAccount,
  type AppUser,
} from "@/lib/admin/users-data";

const ACCOUNTS_KEY = ["admin", "accounts"] as const;
const PAGE_SIZE = 20;

/** Shared styling for the Create New User form fields. */
const fieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100";

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: BackendRole;
}

const emptyForm: NewUserForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: ROLE_OPTIONS[0].value,
};

function downloadUsersCsv(users: AppUser[]) {
  const header = ["Name", "Email", "Role", "Status", "Last Login"];
  const rows = users.map((u) => [u.name, u.email, u.role, u.status, u.lastLogin]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "users.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ManageUserAccountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<"ALL" | BackendRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "DEACTIVATED"
  >("ALL");
  const [sortAsc, setSortAsc] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [roleEditUser, setRoleEditUser] = useState<AppUser | null>(null);
  const [roleEditValue, setRoleEditValue] = useState<BackendRole | null>(null);
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  const query = useApiQuery<AccountDTO[]>(
    [...ACCOUNTS_KEY, { page, roleFilter, statusFilter }],
    "/users",
    {
      query: {
        page,
        limit: PAGE_SIZE,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        accountStatus: statusFilter === "ALL" ? undefined : statusFilter,
      },
      placeholderData: (prev) => prev,
    },
  );

  const users = useMemo(() => {
    const list = (query.data?.data ?? []).map(fromApiAccount);
    return [...list].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
  }, [query.data, sortAsc]);

  const total = query.data?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMutation = useMutation({
    mutationFn: (body: NewUserForm) =>
      apiFetch<AccountDTO>("/admin/accounts", { method: "POST", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      setForm(emptyForm);
      setFormError(null);
      setShowModal(false);
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        const firstFieldError = err.errors
          ? Object.values(err.errors).flat()[0]
          : null;
        setFormError(firstFieldError ?? err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/accounts/${id}/status`, {
        method: "PATCH",
        body: { isActive },
      }),
    onMutate: () => setActionError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
    onError: (err) => {
      setActionError(
        err instanceof ApiRequestError ? err.message : "Update failed.",
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: BackendRole }) =>
      apiFetch(`/users/${id}/role`, { method: "PATCH", body: { role } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      setRoleEditUser(null);
    },
    onError: (err) => {
      setRoleEditError(err instanceof ApiRequestError ? err.message : "Update failed.");
    },
  });

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(form);
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage institutional access, roles, and security permissions for all system users."
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            <UserPlusIcon className="h-4 w-4" />
            Create New User
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Total Users
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {total.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-stone-500">Across all roles</p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <UsersIcon className="h-6 w-6" />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {users.filter((u) => u.status === "Active").length}
            </p>
            <p className="mt-1 text-sm text-stone-500">On this page</p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <IdCardIcon className="h-6 w-6" />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Deactivated
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">
              {users.filter((u) => u.status === "Deactivated").length}
            </p>
            <p className="mt-1 text-sm text-stone-500">On this page</p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <EnvelopeIcon className="h-6 w-6" />
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-5">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value as "ALL" | BackendRole);
              }}
              className="appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-8 text-sm font-medium text-stone-700 outline-none focus:border-rose-400"
            >
              <option value="ALL">All Roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <FilterIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(
                  e.target.value as "ALL" | "ACTIVE" | "DEACTIVATED",
                );
              }}
              className="appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-8 text-sm font-medium text-stone-700 outline-none focus:border-rose-400"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
            <ZapIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>
          <span className="h-6 w-px bg-stone-200" />
          <p className="text-sm text-stone-500">
            {query.isLoading
              ? "Loading…"
              : `Showing ${users.length} of ${total.toLocaleString()} users`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadUsersCsv(users)}
              aria-label="Download current page"
              className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print list"
              className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50"
            >
              <PrinterIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {actionError && (
          <p className="border-b border-rose-100 bg-rose-50 px-6 py-2.5 text-sm text-rose-700">
            {actionError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
                <th className="px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setSortAsc((v) => !v)}
                    className="flex items-center gap-1 hover:text-stone-600"
                  >
                    Name {sortAsc ? "↑" : "↓"}
                  </button>
                </th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Login</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {query.isLoading && <LoadingRow colSpan={5} />}
              {query.isError && (
                <ErrorRow
                  colSpan={5}
                  message={query.error.message}
                  onRetry={() => query.refetch()}
                />
              )}
              {!query.isLoading &&
                !query.isError &&
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${user.avatarColorClassName}`}
                        >
                          {user.initials}
                        </span>
                        <div>
                          <p className="font-semibold text-stone-900">{user.name}</p>
                          <p className="text-sm text-stone-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-stone-700">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            user.status === "Active" ? "bg-emerald-500" : "bg-rose-300"
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-600">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="group relative inline-block">
                        <button
                          type="button"
                          aria-label="Row actions"
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                        </button>
                        <div className="invisible absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-stone-200 bg-white py-1 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setRoleEditError(null);
                              setRoleEditValue(user.roleValue);
                              setRoleEditUser(user);
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                          >
                            Change role
                          </button>
                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: user.id,
                                isActive: user.status !== "Active",
                              })
                            }
                            className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {user.status === "Active" ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              {!query.isLoading && !query.isError && users.length === 0 && (
                <EmptyRow colSpan={5} label="No users match these filters." />
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 text-sm">
          <p className="text-stone-500">
            Page {page} of {pageCount} · {total.toLocaleString()} entries
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
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5"
          >
            <h3 className="text-lg font-bold text-stone-900">Create New User</h3>
            <p className="mt-1 text-sm text-stone-500">
              The user signs in with these credentials and can change the password later.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <label className="flex-1 space-y-1.5">
                  <span className="text-sm font-medium text-stone-700">First name</span>
                  <input
                    required
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="flex-1 space-y-1.5">
                  <span className="text-sm font-medium text-stone-700">Last name</span>
                  <input
                    required
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">Email address</span>
                <input
                  required
                  type="email"
                  placeholder="jane.doe@kit.test"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Temporary password
                </span>
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className={fieldClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-stone-700">Role</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as BackendRole }))
                  }
                  className={fieldClass}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              {formError && (
                <p className="text-sm text-rose-700" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFormError(null);
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {roleEditUser && roleEditValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRoleEditError(null);
              roleMutation.mutate({ id: roleEditUser.id, role: roleEditValue });
            }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5"
          >
            <h3 className="text-lg font-bold text-stone-900">Change role</h3>
            <p className="mt-1 text-sm text-stone-500">
              {roleEditUser.name} · {roleEditUser.email}
            </p>

            <label className="mt-5 block space-y-1.5">
              <span className="text-sm font-medium text-stone-700">Role</span>
              <select
                value={roleEditValue}
                onChange={(e) => setRoleEditValue(e.target.value as BackendRole)}
                className={fieldClass}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            {roleEditError && (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {roleEditError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleEditUser(null)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={roleMutation.isPending}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {roleMutation.isPending ? "Saving…" : "Save role"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
