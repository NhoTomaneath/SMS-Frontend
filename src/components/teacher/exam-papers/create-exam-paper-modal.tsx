"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { useCreateExamPaper, useUpdateExamPaper } from "../hooks/use-teacher-exams";
import type { ExamPaperItem } from "../exam-types";

interface CreateExamPaperModalProps {
  examId: string;
  /** When set, the modal edits this paper instead of creating a new one. */
  paper?: ExamPaperItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function CreateExamPaperModal({
  examId,
  paper,
  onClose,
  onSuccess,
}: CreateExamPaperModalProps) {
  const isEdit = Boolean(paper);
  const [fileUrl, setFileUrl] = useState(paper?.fileUrl ?? "");
  const [answerKeyUrl, setAnswerKeyUrl] = useState(paper?.answerKeyUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateExamPaper(examId);
  const updateMutation = useUpdateExamPaper(examId);
  const pending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const paperUrl = fileUrl.trim();
    const keyUrl = answerKeyUrl.trim();
    if (!paperUrl || !keyUrl) {
      setError("Both the exam paper link and the answer key link are required.");
      return;
    }
    if (!isValidUrl(paperUrl) || !isValidUrl(keyUrl)) {
      setError("Please provide valid URLs (e.g. https://drive.google.com/...)");
      return;
    }

    try {
      setError(null);
      if (paper) {
        await updateMutation.mutateAsync({ id: paper.id, fileUrl: paperUrl, answerKeyUrl: keyUrl });
        onSuccess("Exam paper and answer key updated.");
      } else {
        await createMutation.mutateAsync({ fileUrl: paperUrl, answerKeyUrl: keyUrl });
        onSuccess("Exam paper saved as draft. You can now submit it to COE.");
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save exam paper");
    }
  }

  const inputClass = (invalid: boolean) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
      invalid ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              {isEdit ? "Edit Exam Paper" : "Submit Exam Paper"}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Provide the links to the exam paper and its answer key (PDF / Word).
              {paper?.status === "SUBMITTED" && " This paper is already with the COE; edits update it in place."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-stone-500">
              Exam Paper Link
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className={inputClass(Boolean(error) && !fileUrl.trim())}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-stone-500">
              Answer Key Link
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={answerKeyUrl}
              onChange={(e) => setAnswerKeyUrl(e.target.value)}
              className={inputClass(Boolean(error) && !answerKeyUrl.trim())}
            />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-rose-800 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Save Draft Paper"}
          </button>
        </div>
      </form>
    </div>
  );
}
