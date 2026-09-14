"use client";

import { useRef } from "react";
import { CameraIcon, UserIcon } from "@/components/icons";
import type { EnrollmentFormData } from "./types";

interface EnrollmentSidebarProps {
  formData: EnrollmentFormData;
  portraitPreview: string | null;
  onPortraitChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  portraitError: string | null;
}

export function EnrollmentSidebar({
  formData,
  portraitPreview,
  onPortraitChange,
  portraitError,
}: EnrollmentSidebarProps) {
  const portraitInputRef = useRef<HTMLInputElement>(null);

  const isPersonalReady = Boolean(formData.firstName && formData.lastName && formData.dob);
  const isAcademicReady = Boolean(formData.departmentId && formData.academicYearId);

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">
          Student Photo
        </h3>
        <div className="flex flex-col items-center">
          <div className="relative mb-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-rose-200 bg-rose-50/50">
            {portraitPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portraitPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-12 w-12 text-rose-300" />
            )}
          </div>
          <input
            ref={portraitInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={onPortraitChange}
          />
          <button
            type="button"
            onClick={() => portraitInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:underline"
          >
            <CameraIcon className="h-3.5 w-3.5" />
            {portraitPreview ? "Change Photo" : "Upload Photo"}
          </button>
          {portraitError && <p className="mt-1 text-center text-xs text-rose-600">{portraitError}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          Enrollment Readiness
        </h3>
        <ul className="space-y-1.5 text-xs text-stone-600">
          <li className="flex items-center gap-2">
            <span className={isPersonalReady ? "text-emerald-600" : "text-stone-300"}>●</span>
            Personal Details {isPersonalReady ? "Complete" : "Pending"}
          </li>
          <li className="flex items-center gap-2">
            <span className={isAcademicReady ? "text-emerald-600" : "text-stone-300"}>●</span>
            Academic Faculty {isAcademicReady ? "Selected" : "Pending"}
          </li>
          <li className="flex items-center gap-2">
            <span className={formData.studentNumber ? "text-emerald-600" : "text-stone-300"}>●</span>
            ID Assignment
          </li>
        </ul>
      </div>
    </aside>
  );
}
