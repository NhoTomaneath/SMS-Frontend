"use client";

import { useState } from "react";
import { FileTextIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import type { ExamPaperItem } from "../exam-types";

interface ExamPaperRowProps {
  paper: ExamPaperItem;
  onSubmitToCoe: (id: string) => Promise<void>;
  onEdit: (paper: ExamPaperItem) => void;
}

function DocumentLine({
  label,
  url,
  status,
}: {
  label: string;
  url: string | null;
  status: ExamPaperItem["status"];
}) {
  // Both documents travel with the paper, so they share its status; a missing
  // answer key is called out instead of showing a misleading badge.
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
        <FileTextIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-rose-800 hover:underline"
          >
            {label} ↗
          </a>
        ) : (
          <span className="font-semibold text-stone-500">{label}</span>
        )}
      </div>
      {url ? (
        <StatusBadge
          label={status}
          tone={status === "RECEIVED" ? "green" : status === "SUBMITTED" ? "sky" : "amber"}
        />
      ) : (
        <StatusBadge label="MISSING" tone="amber" />
      )}
    </div>
  );
}

export function ExamPaperRow({ paper, onSubmitToCoe, onEdit }: ExamPaperRowProps) {
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
  const canEdit = paper.status !== "RECEIVED";

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="space-y-3">
        <DocumentLine label="Exam Paper Document" url={paper.fileUrl} status={paper.status} />
        <DocumentLine label="Answer Key" url={paper.answerKeyUrl} status={paper.status} />
        <p className="text-xs text-stone-500">
          Uploaded {new Date(paper.createdAt).toLocaleDateString()}
          {paper.submittedAt && ` · Submitted ${new Date(paper.submittedAt).toLocaleDateString()}`}
          {paper.receivedAt && ` · Received ${new Date(paper.receivedAt).toLocaleDateString()}`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit(paper)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Edit
          </button>
        )}
        {isDraft && (
          <button
            type="button"
            disabled={submitting || !paper.answerKeyUrl}
            title={!paper.answerKeyUrl ? "Add the answer key link before submitting." : undefined}
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
