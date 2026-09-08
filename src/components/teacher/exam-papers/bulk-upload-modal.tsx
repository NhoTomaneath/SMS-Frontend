"use client";

import { useRef, useState } from "react";
import { UploadCloudIcon, XIcon } from "@/components/icons";

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected?: File | null) {
    if (!selected) return;
    if (!/\.(pdf|doc|docx)$/i.test(selected.name)) {
      setError("Please select a PDF or Word document (.pdf, .doc, .docx)");
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleSave() {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    onSuccess(`"${file.name}" uploaded successfully.`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-stone-900">Upload Exam Materials</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/40 p-8 text-center hover:bg-rose-50/70"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <UploadCloudIcon className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-stone-800">
            {file ? file.name : "Click to select exam document"}
          </p>
          <p className="mt-1 text-xs text-stone-400">Supports PDF, DOC, DOCX</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-500">
            Cancel
          </button>
          <button
            type="button"
            disabled={!file}
            onClick={handleSave}
            className="rounded-lg bg-rose-800 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
