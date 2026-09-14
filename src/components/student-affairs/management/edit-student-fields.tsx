import { ChevronDownIcon } from "@/components/icons";
import type { BloodGroup, DepartmentDTO, Gender } from "@/lib/api/types";

interface EditFieldsProps {
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  dateOfBirth: string; setDateOfBirth: (v: string) => void;
  gender: Gender | ""; setGender: (v: Gender | "") => void;
  bloodGroup: BloodGroup | ""; setBloodGroup: (v: BloodGroup | "") => void;
  personalEmail: string; setPersonalEmail: (v: string) => void;
  contactDetails: string; setContactDetails: (v: string) => void;
  guardianName: string; setGuardianName: (v: string) => void;
  guardianContact: string; setGuardianContact: (v: string) => void;
  departmentId: string; setDepartmentId: (v: string) => void;
  departments: DepartmentDTO[];
}

export function EditStudentFields({
  firstName, setFirstName, lastName, setLastName,
  dateOfBirth, setDateOfBirth, gender, setGender,
  bloodGroup, setBloodGroup, personalEmail, setPersonalEmail,
  contactDetails, setContactDetails, guardianName, setGuardianName,
  guardianContact, setGuardianContact, departmentId, setDepartmentId,
  departments,
}: EditFieldsProps) {
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-bold uppercase text-stone-500 mb-1">First Name *</label>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
        </div>
        <div>
          <label className="block font-bold uppercase text-stone-500 mb-1">Last Name *</label>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-bold uppercase text-stone-500 mb-1">DOB</label>
          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-lg border px-2 py-1.5 outline-none" />
        </div>
        <div>
          <label className="block font-bold uppercase text-stone-500 mb-1">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none">
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block font-bold uppercase text-stone-500 mb-1">Blood</label>
          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value as BloodGroup)} className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none">
            <option value="">Select</option>
            {["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Personal Email" type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
        <input placeholder="Contact Phone" value={contactDetails} onChange={(e) => setContactDetails(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
        <input placeholder="Guardian Name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
        <input placeholder="Guardian Phone" value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 outline-none" />
      </div>

      <div className="relative">
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full appearance-none rounded-lg border bg-white px-3 py-1.5 outline-none">
          <option value="">No Department Assigned</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
      </div>
    </div>
  );
}
