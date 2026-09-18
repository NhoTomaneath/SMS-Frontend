"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, DownloadIcon, UploadCloudIcon, XIcon } from "@/components/icons";
import { FileDropzone, UploadedFileRow } from "@/components/file-upload";
import { DOCUMENT_UPLOAD_TYPES, IMAGE_UPLOAD_TYPES } from "@/lib/api/upload";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { ExamSubmissionDTO } from "@/lib/api/types";
import type { OwnExamRow } from "@/lib/student/dashboard-data";

const ACCEPT = [...DOCUMENT_UPLOAD_TYPES, ...IMAGE_UPLOAD_TYPES];

/**
 * File-submission exam flow: download the finalized paper, work offline,
 * upload the answer back before the deadline. No in-browser question/answer
 * flow or auto-grading — a teacher/CoE user scores the file separately.
 */
export function TakeExamAction({ exam }: { exam: OwnExamRow }) {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; size: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpen = new Date() <= exam.submissionDeadline;

  const submitMutation = useMutation({
    mutationFn: (fileUrl: string) =>
      apiFetch<ExamSubmissionDTO>(`/student/me/exams/${exam.id}/submission`, {
        method: "POST",
        body: { fileUrl },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student", "exams"] });
      setShowUpload(false);
      setPendingFile(null);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : "Could not submit your answer."),
  });

  if (!exam.examPaperUrl) {
    return <span className="text-xs text-stone-400">Not released yet</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <a
        href={exam.examPaperUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:underline"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Download Paper
      </a>

      {exam.mySubmission ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Submitted
        </span>
      ) : !isOpen ? (
        <span className="text-xs text-stone-400">Window closed</span>
      ) : null}

      {isOpen && (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-rose-700"
        >
          <UploadCloudIcon className="h-3.5 w-3.5" />
          {exam.mySubmission ? "Replace Answer" : "Upload Answer"}
        </button>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Submit Your Answer</h3>
                <p className="mt-1 text-sm text-stone-500">
                  {exam.code} · {exam.examType} Exam
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

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
                  acceptLabel="PDF, image, or spreadsheet, up to 5 MB"
                  onUploaded={(file, original) =>
                    setPendingFile({ name: original.name, url: file.url, size: file.size })
                  }
                />
              )}
            </div>

            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="text-sm font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingFile || submitMutation.isPending}
                onClick={() => pendingFile && submitMutation.mutate(pendingFile.url)}
                className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
              >
                {submitMutation.isPending ? "Submitting…" : "Submit Answer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
