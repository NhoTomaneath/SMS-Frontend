"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { SubmissionItem } from "../types";

interface SubmissionRowProps {
  submission: SubmissionItem;
  maxScore: number;
  onSaveGrade: (id: string, score: number) => Promise<void>;
}

export function SubmissionRow({ submission, maxScore, onSaveGrade }: SubmissionRowProps) {
  const [val, setVal] = useState(submission.score !== null ? String(submission.score) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numVal = Number(val);
  const isInvalid = val !== "" && (isNaN(numVal) || numVal < 0 || numVal > maxScore);

  async function handleSave() {
    if (val === "") return;
    if (isInvalid) {
      setError(`Must be 0–${maxScore}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveGrade(submission.id, numVal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const { student } = submission;

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50">
      <td className="px-6 py-4 font-mono text-xs text-stone-600">{student.studentNumber}</td>
      <td className="px-6 py-4 font-medium text-stone-800">
        {student.firstName} {student.lastName}
      </td>
      <td className="px-6 py-4">
        <StatusBadge
          label={submission.score !== null ? "GRADED" : "PENDING"}
          tone={submission.score !== null ? "green" : "amber"}
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={maxScore}
            value={val}
            placeholder="--"
            onChange={(e) => {
              setVal(e.target.value);
              setError(null);
            }}
            className={`w-20 rounded-lg border bg-white px-3 py-1 text-center font-semibold text-stone-900 placeholder:text-stone-400 outline-none ${
              isInvalid || error ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
            }`}
          />
          <button
            type="button"
            disabled={saving || val === "" || isInvalid}
            onClick={handleSave}
            className="rounded-md bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-rose-100 hover:text-rose-800 disabled:opacity-40"
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}
