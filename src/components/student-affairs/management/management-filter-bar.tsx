"use client";

import Link from "next/link";
import { FilterIcon, SearchIcon, UploadCloudIcon, UserPlusIcon } from "@/components/icons";
import type { DepartmentDTO } from "@/lib/api/types";

interface ManagementFilterBarProps {
  searchInput: string;
  onSearchChange: (val: string) => void;
  departmentFilter: string;
  onDepartmentChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  departments: DepartmentDTO[];
  onOpenBulkImport: () => void;
}

export function ManagementFilterBar({
  searchInput,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  statusFilter,
  onStatusChange,
  departments,
  onOpenBulkImport,
}: ManagementFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, ID, or email…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5">
          <FilterIcon className="h-3.5 w-3.5 text-stone-400" />
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-stone-700 outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-stone-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="PENDING">Pending</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="GRADUATED">Graduated</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenBulkImport}
          className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          <UploadCloudIcon className="h-3.5 w-3.5" />
          Bulk Upload
        </button>
        <Link
          href="/student-affairs/enrollment"
          className="flex items-center gap-1.5 rounded-xl bg-rose-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-900"
        >
          <UserPlusIcon className="h-3.5 w-3.5" />
          Enroll Student
        </Link>
      </div>
    </div>
  );
}
