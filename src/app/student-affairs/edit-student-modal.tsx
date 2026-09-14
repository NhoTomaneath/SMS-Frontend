"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserIcon, XIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";
import type { BloodGroup, DepartmentDTO, Gender, StudentDTO, UpdateStudentBody } from "@/lib/api/types";
import { EditStudentFields } from "@/components/student-affairs/management/edit-student-fields";

import { isValidCambodiaPhone, isValidEmail, validateDateOfBirth } from "@/components/student-affairs/enrollment/validation";

interface ModalProps {
  student: StudentDTO;
  departments: DepartmentDTO[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: StudentDTO) => void;
}

export function EditStudentModal({ student, departments, isOpen, onClose, onSuccess }: ModalProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(student.dateOfBirth?.slice(0, 10) || "");
  const [gender, setGender] = useState<Gender | "">(student.gender || "");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">(student.bloodGroup || "");
  const [personalEmail, setPersonalEmail] = useState(student.personalEmail || "");
  const [contactDetails, setContactDetails] = useState(student.contactDetails || "");
  const [guardianName, setGuardianName] = useState(student.guardianName || "");
  const [guardianContact, setGuardianContact] = useState(student.guardianContact || "");
  const [departmentId, setDepartmentId] = useState(student.departmentId || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editMutation = useMutation({
    mutationFn: (body: UpdateStudentBody) =>
      apiFetch<StudentDTO>(`/student-affairs/students/${student.id}`, { method: "PATCH", body }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "students"] });
      onSuccess(res.data);
      onClose();
    },
    onError: (e: Error) => setErrorMsg(e.message || "Failed to update student"),
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!firstName.trim() || !lastName.trim()) return setErrorMsg("First and Last Name are required.");
    const dobError = dateOfBirth ? validateDateOfBirth(dateOfBirth) : null;
    if (dobError) return setErrorMsg(dobError);
    if (personalEmail.trim() && !isValidEmail(personalEmail)) return setErrorMsg("Invalid email format.");
    if (contactDetails.trim() && !isValidCambodiaPhone(contactDetails)) return setErrorMsg("Invalid Cambodian phone number (e.g. 012 345 678).");
    if (guardianContact.trim() && !isValidCambodiaPhone(guardianContact)) return setErrorMsg("Invalid Cambodian guardian phone number.");
    editMutation.mutate({
      firstName: firstName.trim(), lastName: lastName.trim(), dateOfBirth: dateOfBirth || undefined,
      gender: gender ? (gender as Gender) : undefined, bloodGroup: bloodGroup ? (bloodGroup as BloodGroup) : undefined,
      personalEmail: personalEmail.trim() || undefined, contactDetails: contactDetails.trim() || undefined,
      guardianName: guardianName.trim() || undefined, guardianContact: guardianContact.trim() || undefined,
      departmentId: departmentId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <UserIcon className="h-4 w-4 text-rose-700" /> Edit Student ({student.studentNumber})
          </h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-4 w-4" /></button>
        </div>
        {errorMsg && <p className="mt-3 text-xs text-rose-600 font-semibold">{errorMsg}</p>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <EditStudentFields
            firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName}
            dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth} gender={gender} setGender={setGender}
            bloodGroup={bloodGroup} setBloodGroup={setBloodGroup} personalEmail={personalEmail} setPersonalEmail={setPersonalEmail}
            contactDetails={contactDetails} setContactDetails={setContactDetails} guardianName={guardianName} setGuardianName={setGuardianName}
            guardianContact={guardianContact} setGuardianContact={setGuardianContact} departmentId={departmentId} setDepartmentId={setDepartmentId}
            departments={departments}
          />
          <div className="flex justify-end gap-2 border-t pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={editMutation.isPending} className="rounded-lg bg-rose-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50">
              {editMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
