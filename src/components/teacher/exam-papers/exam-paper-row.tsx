"use client";

import { useState } from "react";
import { FileTextIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { ExamPaperItem } from "../exam-types";

interface ExamPaperRowProps {
  paper: ExamPaperItem;
  onSubmitToCoe: (id: string) => Promise<void>;
}

export function ExamPaperRow({ paper, onSubmitToCoe }: ExamPaperRowProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmitToCoe(paper.id);
    } finally {
      setSubmitting(false);
    }
  }

  const isDraft = paper.status === "DRAFT";

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <FileTextIcon className="h-5 w-5" />
        </span>
        <div>
          <a
            href={paper.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-rose-800 hover:underline"
          >
            Exam Paper Document ↗
          </a>
          <p className="text-xs text-stone-500">
            Uploaded {new Date(paper.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge
          label={paper.status}
          tone={paper.status === "RECEIVED" ? "green" : paper.status === "SUBMITTED" ? "sky" : "amber"}
        />

        {isDraft && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-rose-800 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit to COE"}
          </button>
        )}
      </div>
    </li>
  );
}
