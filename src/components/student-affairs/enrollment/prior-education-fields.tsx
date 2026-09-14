import { TextField } from "./form-fields";
import type { EnrollmentFormData } from "./types";

interface PriorEducationProps {
  formData: EnrollmentFormData;
  update: (key: keyof EnrollmentFormData, val: unknown) => void;
}

export function PriorEducationFields({ formData, update }: PriorEducationProps) {
  return (
    <div className="border-t border-stone-100 pt-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
        Prior Educational History
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="prevSchool"
          label="High School / Previous College"
          value={formData.prevSchool}
          onChange={(v) => update("prevSchool", v)}
          placeholder="e.g. National High School"
        />
        <TextField
          id="prevDegree"
          label="Certificate / Qualification Title"
          value={formData.prevDegree}
          onChange={(v) => update("prevDegree", v)}
          placeholder="e.g. High School Diploma (Bac II)"
        />
        <TextField
          id="graduationYear"
          label="Passing / Graduation Year"
          value={formData.graduationYear}
          onChange={(v) => update("graduationYear", v)}
          placeholder="e.g. 2024"
        />
        <TextField
          id="prevGpa"
          label="Grade / GPA Score"
          value={formData.prevGpa}
          onChange={(v) => update("prevGpa", v)}
          placeholder="e.g. Grade A / 3.85"
        />
      </div>
    </div>
  );
}
