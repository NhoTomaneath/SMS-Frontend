import { CheckCircleIcon } from "@/components/icons";
import type { StudentDTO } from "@/lib/api/types";

interface OverviewProps {
  student: StudentDTO;
}

export function ProfileOverviewTab({ student }: OverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-stone-100 bg-stone-50/50 p-4 text-xs">
        <div>
          <p className="font-bold uppercase text-stone-400 text-[10px]">Department</p>
          <p className="font-semibold text-stone-800 mt-0.5">{student.department?.name || "Unassigned"}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-stone-400 text-[10px]">Enrollment Date</p>
          <p className="font-semibold text-stone-800 mt-0.5">
            {student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase text-stone-400 text-[10px]">Date of Birth</p>
          <p className="font-semibold text-stone-800 mt-0.5">
            {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase text-stone-400 text-[10px]">Gender / Blood</p>
          <p className="font-semibold text-stone-800 mt-0.5">
            {student.gender || "N/A"} {student.bloodGroup ? `(${student.bloodGroup.replace("_", " ")})` : ""}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase text-stone-400 text-[10px]">Student Login Access</p>
          <p className="font-semibold text-stone-800 mt-0.5">
            {student.userId ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" /> Account Active
              </span>
            ) : (
              <span className="text-stone-400">No account linked</span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4 text-xs">
        <h4 className="font-bold uppercase text-stone-400 text-[10px] mb-2">Emergency Contact</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-stone-400">Email:</p>
            <p className="font-medium text-stone-800">{student.personalEmail || "N/A"}</p>
          </div>
          <div>
            <p className="text-stone-400">Phone:</p>
            <p className="font-medium text-stone-800">{student.contactDetails || "N/A"}</p>
          </div>
          <div>
            <p className="text-stone-400">Guardian:</p>
            <p className="font-medium text-stone-800">{student.guardianName || "N/A"}</p>
          </div>
          <div>
            <p className="text-stone-400">Guardian Phone:</p>
            <p className="font-medium text-stone-800">{student.guardianContact || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
