"use client";

import { ArrowRightIcon, CheckCircleIcon, ChevronLeftIcon } from "@/components/icons";
import { TextField } from "./form-fields";
import { EnrollmentSummaryCard } from "./enrollment-summary-card";
import type { EnrollmentFormData } from "./types";
import type { AcademicYearDTO, DepartmentDTO } from "@/lib/api/types";

interface StepIdProps {
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  departments: DepartmentDTO[];
  academicYears: AcademicYearDTO[];
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  fieldErrors?: Record<string, string[]>;
}

export function StepIdAssignment({
  formData,
  setFormData,
  departments,
  academicYears,
  isSubmitting,
  onBack,
  onSubmit,
  fieldErrors,
}: StepIdProps) {
  const deptName = departments.find((d) => d.id === formData.departmentId)?.name || "Not assigned";
  const yearLabel = academicYears.find((y) => y.id === formData.academicYearId)?.yearLabel || "Current";

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
          <CheckCircleIcon className="h-5 w-5 text-rose-700" />
          Step 3: Student ID Assignment & Verification Review
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Verify the matriculation ID number and review all enrollment records before final submission.
        </p>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
        <TextField
          id="studentNumber"
          label="Assigned Student Number"
          value={formData.studentNumber}
          onChange={(v) => setFormData((prev) => ({ ...prev, studentNumber: v }))}
          required
          placeholder={`e.g. STU-${new Date().getFullYear()}-001`}
          error={fieldErrors?.studentNumber?.[0]}
        />
        <p className="mt-1 text-[11px] text-stone-500">
          Unique institution ID assigned for transcript, exam, and attendance registration.
        </p>
      </div>

      <EnrollmentSummaryCard formData={formData} departmentName={deptName} yearLabel={yearLabel} />

      <div className="flex justify-between border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back: Academic Background
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-rose-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-900 disabled:opacity-50"
        >
          {isSubmitting ? "Enrolling…" : "Save & Complete Enrollment"}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
