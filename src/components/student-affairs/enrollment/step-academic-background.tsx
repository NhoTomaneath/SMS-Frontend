"use client";

import { ChevronLeftIcon, ChevronRightIcon, GraduationCapIcon } from "@/components/icons";
import { SelectField } from "./form-fields";
import { PriorEducationFields } from "./prior-education-fields";
import type { EnrollmentFormData } from "./types";
import type { AcademicYearDTO, DepartmentDTO } from "@/lib/api/types";

interface StepAcademicProps {
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  departments: DepartmentDTO[];
  academicYears: AcademicYearDTO[];
  onBack: () => void;
  onNext: () => void;
  fieldErrors?: Record<string, string[]>;
}

export function StepAcademicBackground({
  formData,
  setFormData,
  departments,
  academicYears,
  onBack,
  onNext,
  fieldErrors,
}: StepAcademicProps) {
  const update = (key: keyof EnrollmentFormData, val: unknown) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const deptOptions = departments.map((d) => ({ label: d.name, value: d.id }));
  const yearOptions = academicYears.map((y) => ({ label: y.yearLabel, value: y.id }));

  return (
    <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
          <GraduationCapIcon className="h-5 w-5 text-rose-700" />
          Step 2: Academic Background & Institutional Program
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Configure university enrollment faculty and record prior secondary qualifications.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="departmentId"
          label="Target Department / Faculty"
          value={formData.departmentId}
          onChange={(v) => update("departmentId", v)}
          options={deptOptions}
          placeholder="Select Department / Faculty"
          error={fieldErrors?.departmentId?.[0]}
          required
        />
        <SelectField
          id="academicYearId"
          label="Enrolling Academic Year"
          value={formData.academicYearId}
          onChange={(v) => update("academicYearId", v)}
          options={yearOptions}
          placeholder="Select Academic Year"
          error={fieldErrors?.academicYearId?.[0]}
          required
        />
      </div>

      <PriorEducationFields formData={formData} update={update} />

      <div className="flex justify-between border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back: Personal Details
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-lg bg-rose-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
        >
          Next: ID Assignment & Review
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
