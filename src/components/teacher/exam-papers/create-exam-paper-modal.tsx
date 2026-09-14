"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { useCreateExamPaper } from "../hooks/use-teacher-exams";

interface CreateExamPaperModalProps {
  examId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function CreateExamPaperModal({
  examId,
  onClose,
  onSuccess,
}: CreateExamPaperModalProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateExamPaper(examId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = fileUrl.trim();
    if (!trimmed) {
      setError("Document URL is required.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError("Please provide a valid URL (e.g. https://drive.google.com/...)");
      return;
    }

    try {
      setError(null);
      await createMutation.mutateAsync({ fileUrl: trimmed });
      onSuccess("Exam paper created as draft. You can now submit it to COE.");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create exam paper");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Submit Exam Paper URL</h3>
            <p className="mt-1 text-sm text-stone-500">
              Provide the link to the exam paper draft (PDF / Word)
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold uppercase text-stone-500">File URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
              error ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
            }`}
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-rose-800 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Save Draft Paper"}
          </button>
        </div>
      </form>
    </div>
  );
}
