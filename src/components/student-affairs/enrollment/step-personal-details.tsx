"use client";

import { ChevronRightIcon, UserIcon } from "@/components/icons";
import { TextField, SelectField } from "./form-fields";
import { GuardianFields } from "./guardian-fields";
import type { EnrollmentFormData } from "./types";
import type { BloodGroup, Gender } from "@/lib/api/types";

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

const BLOOD_OPTIONS = [
  { label: "A+", value: "A_POS" }, { label: "A-", value: "A_NEG" },
  { label: "B+", value: "B_POS" }, { label: "B-", value: "B_NEG" },
  { label: "O+", value: "O_POS" }, { label: "O-", value: "O_NEG" },
  { label: "AB+", value: "AB_POS" }, { label: "AB-", value: "AB_NEG" },
];

interface StepPersonalProps {
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  onNext: () => void;
  fieldErrors?: Record<string, string[]>;
}

export function StepPersonalDetails({ formData, setFormData, onNext, fieldErrors }: StepPersonalProps) {
  const update = (key: keyof EnrollmentFormData, val: unknown) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-stone-900">
          <UserIcon className="h-5 w-5 text-rose-700" />
          Step 1: Personal Information
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Enter the student&apos;s legal identification details and contact information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="firstName" label="First Name" value={formData.firstName} onChange={(v) => update("firstName", v)} required error={fieldErrors?.firstName?.[0]} />
        <TextField id="lastName" label="Last Name" value={formData.lastName} onChange={(v) => update("lastName", v)} required error={fieldErrors?.lastName?.[0]} />
        <TextField id="dob" label="Date of Birth" type="date" value={formData.dob} onChange={(v) => update("dob", v)} required error={fieldErrors?.dateOfBirth?.[0]} />
        <SelectField id="gender" label="Gender" value={formData.gender} onChange={(v) => update("gender", v as Gender)} options={GENDER_OPTIONS} required />
        <TextField id="email" label="Personal Email" type="email" value={formData.email} onChange={(v) => update("email", v)} error={fieldErrors?.personalEmail?.[0]} />
        <TextField id="mobile" label="Contact Number" type="tel" placeholder="e.g. 012 345 678" value={formData.mobile} onChange={(v) => update("mobile", v)} error={fieldErrors?.contactDetails?.[0]} />
        <SelectField id="bloodGroup" label="Blood Group" value={formData.bloodGroup} onChange={(v) => update("bloodGroup", v as BloodGroup)} options={BLOOD_OPTIONS} placeholder="Select blood group (Optional)" />
      </div>

      <GuardianFields formData={formData} update={update} error={fieldErrors?.guardianContact?.[0]} />

      <div className="flex justify-end border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-lg bg-rose-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
        >
          Next: Academic Background
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
