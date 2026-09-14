import type { EnrollmentFormData } from "./types";

interface SummaryProps {
  formData: EnrollmentFormData;
  departmentName: string;
  yearLabel: string;
}

export function EnrollmentSummaryCard({ formData, departmentName, yearLabel }: SummaryProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
        Enrollment Summary Record
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Student Name</p>
          <p className="font-bold text-stone-900 mt-0.5">{formData.firstName} {formData.lastName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Date of Birth</p>
          <p className="font-medium text-stone-800 mt-0.5">{formData.dob || "N/A"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Gender / Blood</p>
          <p className="font-medium text-stone-800 mt-0.5">{formData.gender} {formData.bloodGroup ? `(${formData.bloodGroup})` : ""}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Faculty</p>
          <p className="font-bold text-rose-800 mt-0.5">{departmentName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Session</p>
          <p className="font-medium text-stone-800 mt-0.5">{yearLabel}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400">Previous School</p>
          <p className="font-medium text-stone-800 mt-0.5">{formData.prevSchool || "None recorded"}</p>
        </div>
      </div>
    </div>
  );
}
