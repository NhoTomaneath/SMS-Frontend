"use client";

import { StatusBadge } from "@/components/status-badge";
import { useApiQuery } from "@/lib/api/hooks";
import type { EligibilityDTO } from "@/lib/api/types";

/**
 * Computed "meets standard graduation criteria" suggestion for one student —
 * advisory only, shown next to (never in place of) the CoE-set status.
 */
export function EligibilityIndicator({ studentId }: { studentId: string }) {
  const query = useApiQuery<EligibilityDTO>(
    ["coe", "eligibility", studentId],
    `/coe/students/${studentId}/eligibility`,
  );

  if (query.isLoading) {
    return <span className="text-xs text-stone-400">Checking…</span>;
  }
  if (query.isError || !query.data) {
    return <span className="text-xs text-stone-300">—</span>;
  }

  const eligibility = query.data.data;

  return (
    <span title={eligibility.reasons.join(" ")}>
      <StatusBadge
        label={
          eligibility.eligible
            ? "Meets Criteria"
            : `GPA ${eligibility.cumulativeGpa ?? "—"} · ${eligibility.completedCredits}/${eligibility.requiredCredits} cr`
        }
        tone={eligibility.eligible ? "green" : "slate"}
      />
    </span>
  );
}
