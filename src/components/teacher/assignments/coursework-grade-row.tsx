"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { CourseworkGradeItem, StudentRegistration } from "../types";

interface CourseworkGradeRowProps {
  registration: StudentRegistration;
  existingGrade?: CourseworkGradeItem;
  onSave: (studentId: string, score: number, gradeId?: string) => Promise<void>;
  onSubmitToCoe: (gradeId: string) => Promise<void>;
}

export function CourseworkGradeRow({
  registration,
  existingGrade,
  onSave,
  onSubmitToCoe,
}: CourseworkGradeRowProps) {
  const [val, setVal] = useState(existingGrade ? String(existingGrade.courseworkScore) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = Number(val);
  const isInvalid = val !== "" && (isNaN(num) || num < 0 || num > 100);
  const isSubmitted = existingGrade?.status === "SUBMITTED";

  async function handleAction(action: "save" | "submit") {
    setSaving(true);
    setError(null);
    try {
      if (action === "save") {
        await onSave(registration.studentId, num, existingGrade?.id);
      } else if (existingGrade) {
        await onSubmitToCoe(existingGrade.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const { student } = registration;
  const badgeLabel = isSubmitted ? "SUBMITTED" : existingGrade ? "DRAFT" : "NOT RECORDED";
  const badgeTone = isSubmitted ? "green" : existingGrade ? "amber" : "slate";

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50">
      <td className="px-6 py-4 font-mono text-xs text-stone-600">{student.studentNumber}</td>
      <td className="px-6 py-4 font-medium text-stone-800">{student.firstName} {student.lastName}</td>
      <td className="px-6 py-4"><StatusBadge label={badgeLabel} tone={badgeTone} /></td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            disabled={isSubmitted}
            value={val}
            placeholder="--"
            onChange={(e) => { setVal(e.target.value); setError(null); }}
            className={`w-20 rounded-lg border bg-white px-3 py-1 text-center font-semibold text-stone-900 placeholder:text-stone-400 outline-none ${
              isInvalid || error ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
            }`}
          />
          {!isSubmitted && (
            <button
              type="button"
              disabled={saving || val === "" || isInvalid}
              onClick={() => handleAction("save")}
              className="rounded-md bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-rose-100 disabled:opacity-40"
            >
              {saving ? "…" : "Save"}
            </button>
          )}
          {existingGrade && !isSubmitted && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAction("submit")}
              className="rounded-md bg-rose-800 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-40"
            >
              Submit COE
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}
