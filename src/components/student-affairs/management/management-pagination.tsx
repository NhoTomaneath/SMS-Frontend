"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalStudents: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export function ManagementPagination({
  page,
  totalPages,
  totalStudents,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalStudents === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalStudents);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3 text-xs text-stone-600">
      <p>
        Showing <span className="font-semibold text-stone-900">{start}</span> to{" "}
        <span className="font-semibold text-stone-900">{end}</span> of{" "}
        <span className="font-semibold text-stone-900">{totalStudents}</span> students
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-stone-200 px-2.5 py-1 font-medium hover:bg-stone-50 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-2 font-semibold">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-stone-200 px-2.5 py-1 font-medium hover:bg-stone-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
