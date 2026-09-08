import { TextField } from "./form-fields";
import type { EnrollmentFormData } from "./types";

interface GuardianFieldsProps {
  formData: EnrollmentFormData;
  update: (key: keyof EnrollmentFormData, val: unknown) => void;
  error?: string;
}

export function GuardianFields({ formData, update, error }: GuardianFieldsProps) {
  return (
    <div className="border-t border-stone-100 pt-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
        Guardian / Emergency Contacts
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="guardianName"
          label="Guardian Name"
          value={formData.guardianName}
          onChange={(v) => update("guardianName", v)}
        />
        <TextField
          id="guardianContact"
          label="Guardian Phone"
          type="tel"
          placeholder="e.g. 012 345 678"
          value={formData.guardianContact}
          onChange={(v) => update("guardianContact", v)}
          error={error}
        />
      </div>
    </div>
  );
}
