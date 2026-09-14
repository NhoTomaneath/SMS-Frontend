"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { CreateStudentBody, StudentDTO } from "@/lib/api/types";
import { INITIAL_ENROLLMENT_DATA, type EnrollmentFormData } from "./types";
import { isValidCambodiaPhone, isValidEmail, isValidGpa, isValidGradYear, validateDateOfBirth } from "./validation";

export function useEnrollment(departments: { id: string }[], academicYears: { id: string; yearLabel: string }[]) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EnrollmentFormData>(INITIAL_ENROLLMENT_DATA);

  const createMutation = useMutation({
    mutationFn: (body: CreateStudentBody) => apiFetch<StudentDTO>("/student-affairs/students", { method: "POST", body }),
    onSuccess: async (res) => {
      setAssignedId(res.data.studentNumber);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student-affairs", "students"] }),
        queryClient.invalidateQueries({ queryKey: ["student-affairs", "summary"] }),
      ]);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create student record.");
      if (err instanceof ApiRequestError && err.errors) setFieldErrors(err.errors);
    },
  });

  const nextToStep2 = () => {
    setFieldErrors({});
    if (!formData.firstName.trim() || !formData.lastName.trim()) return setFormError("First and Last Name are required.");
    const dobError = validateDateOfBirth(formData.dob);
    if (dobError) { setFieldErrors({ dateOfBirth: [dobError] }); return setFormError(dobError); }
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      setFieldErrors({ personalEmail: ["Invalid email format."] }); return setFormError("Please enter a valid email address.");
    }
    if (formData.mobile.trim() && !isValidCambodiaPhone(formData.mobile)) {
      setFieldErrors({ contactDetails: ["Invalid Cambodia phone number."] });
      return setFormError("Please enter a valid Cambodian phone (e.g. 012 345 678 or +855 12 345 678).");
    }
    if (formData.guardianContact.trim() && !isValidCambodiaPhone(formData.guardianContact)) {
      setFieldErrors({ guardianContact: ["Invalid Cambodia phone number."] });
      return setFormError("Please enter a valid Cambodian guardian phone number.");
    }
    setFormError(null);
    setCurrentStep(2);
  };

  const nextToStep3 = () => {
    setFieldErrors({});
    if (!formData.departmentId) return setFormError("Please select a Target Department / Faculty.");
    if (!formData.academicYearId) return setFormError("Please select an Academic Year.");
    if (formData.prevGpa.trim() && !isValidGpa(formData.prevGpa)) return setFormError("Previous GPA must be between 0.0 and 4.0.");
    if (formData.graduationYear.trim() && !isValidGradYear(formData.graduationYear)) return setFormError("Please enter a valid graduation year.");

    setFormError(null);
    if (!formData.studentNumber) {
      const year = academicYears.find((y) => y.id === formData.academicYearId)?.yearLabel.slice(0, 4) || String(new Date().getFullYear());
      setFormData((p) => ({ ...p, studentNumber: `STU-${year}-${Math.floor(1000 + Math.random() * 9000)}` }));
    }
    setCurrentStep(3);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentNumber.trim()) return setFormError("Student ID number is required.");
    createMutation.mutate({
      studentNumber: formData.studentNumber.trim(), firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(), dateOfBirth: formData.dob || undefined, gender: formData.gender,
      personalEmail: formData.email.trim() || undefined, contactDetails: formData.mobile.trim() || undefined,
      bloodGroup: formData.bloodGroup || undefined, guardianName: formData.guardianName.trim() || undefined,
      guardianContact: formData.guardianContact.trim() || undefined, departmentId: formData.departmentId || undefined,
      status: "ENROLLED", enrollmentDate: new Date().toISOString().slice(0, 10),
    });
  };

  const reset = () => { setAssignedId(null); setCurrentStep(1); setFormData(INITIAL_ENROLLMENT_DATA); };

  return {
    currentStep, setCurrentStep, assignedId, formError, setFormError, fieldErrors,
    portraitPreview, setPortraitPreview, portraitError, setPortraitError,
    formData, setFormData, effectiveDeptId: formData.departmentId, effectiveYearId: formData.academicYearId,
    isSubmitting: createMutation.isPending, nextToStep2, nextToStep3, submit, reset,
  };
}
