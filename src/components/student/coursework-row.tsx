"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { CheckCircleIcon, UploadCloudIcon, XIcon } from "@/components/icons";
import { FileDropzone, UploadedFileRow } from "@/components/file-upload";
import { DOCUMENT_UPLOAD_TYPES, IMAGE_UPLOAD_TYPES } from "@/lib/api/upload";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { OwnAssignmentSubmissionDTO, SubmitAssignmentBody } from "@/lib/api/types";
import {
  courseworkLabel,
  courseworkTone,
  type CourseworkItem,
} from "@/lib/student/dashboard-data";
import { formatDateTime } from "@/lib/format";

const ACCEPT = [...DOCUMENT_UPLOAD_TYPES, ...IMAGE_UPLOAD_TYPES];

/**
 * One assignment, with the place to hand it in. Late work is still accepted —
 * it is flagged so the teacher can decide — until the teacher has graded it.
 */
export function CourseworkRow({ item }: { item: CourseworkItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; size: number | null } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const graded = item.status === "GRADED";
  const overdue = item.status === "OVERDUE";
  const submission = item.submission;

  const submitMutation = useMutation({
    mutationFn: (body: SubmitAssignmentBody) =>
      apiFetch<OwnAssignmentSubmissionDTO>(`/student/me/assignments/${item.id}/submission`, {
        method: "POST",
        body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student"] });
      setOpen(false);
      setPendingFile(null);
      setNote("");
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : "Could not submit your work."),
  });

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="font-semibold text-stone-800">{item.title}</p>
        <p className="truncate text-xs text-stone-500">{item.courseLabel}</p>
        {submission && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
            Submitted {formatDateTime(submission.submittedAt)}
            {submission.isLate && (
              <span className="font-semibold text-amber-700">· Late</span>
            )}
            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-rose-700 hover:underline"
              >
                View file
              </a>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="text-right">
          <p className={`text-xs ${overdue ? "font-semibold text-rose-700" : "text-stone-500"}`}>
            Due {item.dueLabel}
          </p>
          <p className="text-xs font-semibold text-stone-700">
            {item.score === null ? `${item.maxScore} marks` : `${item.score}/${item.maxScore}`}
          </p>
        </div>
        <StatusBadge label={courseworkLabel[item.status]} tone={courseworkTone[item.status]} />
        {!graded && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              submission
                ? "border border-stone-300 text-stone-600 hover:bg-stone-50"
                : "bg-rose-800 text-white hover:bg-rose-900"
            }`}
          >
            <UploadCloudIcon className="h-3.5 w-3.5" />
            {submission ? "Replace" : overdue ? "Submit late" : "Submit"}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {submission ? "Replace Your Submission" : "Submit Assignment"}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {item.title} · {item.courseLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {overdue && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                The deadline has passed. Your work will be accepted but marked late.
              </p>
            )}

            <div className="mt-5">
              {pendingFile ? (
                <UploadedFileRow
                  name={pendingFile.name}
                  url={pendingFile.url}
                  size={pendingFile.size}
                  onRemove={() => setPendingFile(null)}
                />
              ) : (
                <FileDropzone
                  accept={ACCEPT}
                  acceptLabel="PDF, document, image or spreadsheet, up to 5 MB"
                  onUploaded={(file, original) =>
                    setPendingFile({ name: original.name, url: file.url, size: file.size })
                  }
                />
              )}
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500">
              Note to teacher (optional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-800 outline-none focus:border-rose-500"
              />
            </label>

            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={close}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingFile || submitMutation.isPending}
                onClick={() =>
                  pendingFile &&
                  submitMutation.mutate({
                    fileUrl: pendingFile.url,
                    ...(note.trim() ? { note: note.trim() } : {}),
                  })
                }
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {submitMutation.isPending ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
