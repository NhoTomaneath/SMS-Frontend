"use client";

import { useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { CalendarIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";

interface DashboardHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DashboardHeader({ selectedDate, onDateChange }: DashboardHeaderProps) {
  const { user } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const dateValue = `${y}-${m}-${d}`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    onDateChange(new Date(y, m - 1, d));
  }

  const teacherName = user ? `${user.firstName} ${user.lastName}`.trim() : "Teacher";

  return (
    <PageHeader
      title="Teacher Dashboard"
      description={`Welcome back, ${teacherName}. Here's what's happening in your classroom today.`}
      actions={
        <div className="relative">
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
            className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <CalendarIcon className="h-4 w-4 text-rose-700" />
            {formattedDate}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={dateValue}
            onChange={handleChange}
            aria-label="Select date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      }
    />
  );
}
