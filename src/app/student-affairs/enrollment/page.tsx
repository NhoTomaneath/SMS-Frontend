"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useApiQuery } from "@/lib/api/hooks";
import type { AcademicYearDTO, DepartmentDTO } from "@/lib/api/types";
import { StepTracker } from "@/components/student-affairs/enrollment/step-tracker";
import { StepPersonalDetails } from "@/components/student-affairs/enrollment/step-personal-details";
import { StepAcademicBackground } from "@/components/student-affairs/enrollment/step-academic-background";
import { StepIdAssignment } from "@/components/student-affairs/enrollment/step-id-assignment";
import { EnrollmentSuccess } from "@/components/student-affairs/enrollment/enrollment-success";
import { EnrollmentSidebar } from "@/components/student-affairs/enrollment/enrollment-sidebar";
import { useEnrollment } from "@/components/student-affairs/enrollment/use-enrollment";

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const departments = useApiQuery<DepartmentDTO[]>(["departments"], "/student-affairs/departments").data?.data ?? [];
  const academicYears = useApiQuery<AcademicYearDTO[]>(["academic-years"], "/student-affairs/academic-years").data?.data ?? [];

  const {
    currentStep, setCurrentStep, assignedId, formError, setFormError, fieldErrors,
    portraitPreview, setPortraitPreview, portraitError, setPortraitError,
    formData, setFormData, effectiveDeptId, effectiveYearId, isSubmitting,
    nextToStep2, nextToStep3, submit, reset,
  } = useEnrollment(departments, academicYears);

  const activeDeptName = departments.find((d) => d.id === effectiveDeptId)?.name;
  const activeYearLabel = academicYears.find((y) => y.id === effectiveYearId)?.yearLabel;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/student-affairs" }, { label: "Enrollment" }]}
        title="New Student Enrollment"
        description="Register a new student via the guided 3-step enrollment wizard."
        actions={<button type="button" onClick={() => router.push("/student-affairs")} className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50">Cancel</button>}
      />
      <StepTracker currentStep={currentStep} assignedId={assignedId} onSelectStep={(s) => { setFormError(null); setCurrentStep(s); }} />
      {formError && <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>}
      {assignedId ? (
        <EnrollmentSuccess assignedId={assignedId} studentName={`${formData.firstName} ${formData.lastName}`} departmentName={activeDeptName} academicYearLabel={activeYearLabel} onReset={reset} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {currentStep === 1 && <StepPersonalDetails formData={formData} setFormData={setFormData} onNext={nextToStep2} fieldErrors={fieldErrors} />}
            {currentStep === 2 && <StepAcademicBackground formData={formData} setFormData={setFormData} departments={departments} academicYears={academicYears} onBack={() => setCurrentStep(1)} onNext={nextToStep3} fieldErrors={fieldErrors} />}
            {currentStep === 3 && <StepIdAssignment formData={formData} setFormData={setFormData} departments={departments} academicYears={academicYears} isSubmitting={isSubmitting} onBack={() => setCurrentStep(2)} onSubmit={submit} fieldErrors={fieldErrors} />}
          </div>
          <EnrollmentSidebar formData={formData} portraitPreview={portraitPreview} onPortraitChange={(e) => { const f = e.target.files?.[0]; if (f) { setPortraitError(null); setPortraitPreview(URL.createObjectURL(f)); } }} portraitError={portraitError} />
        </div>
      )}
    </div>
  );
}
