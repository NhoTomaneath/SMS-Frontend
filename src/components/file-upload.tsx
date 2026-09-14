"use client";

import { useRef, useState } from "react";
import { FileTextIcon, UploadCloudIcon, XIcon } from "@/components/icons";
import {
  ALLOWED_UPLOAD_TYPES,
  formatBytes,
  uploadErrorMessage,
  uploadFile,
  validateUpload,
  type UploadedFileDTO,
} from "@/lib/api/upload";

/**
 * Drag-and-drop file picker that uploads straight to /media/upload and hands
 * the stored asset back. The caller decides what to do with the URL.
 */
export function FileDropzone({
  accept = ALLOWED_UPLOAD_TYPES,
  acceptLabel = "PDF, image or spreadsheet, up to 5 MB",
  onUploaded,
  disabled,
  compact,
}: {
  accept?: string[];
  acceptLabel?: string;
  onUploaded: (file: UploadedFileDTO, original: File) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file || disabled) return;

    const invalid = validateUpload(file, accept);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      onUploaded(uploaded, file);
    } catch (err) {
      setError(uploadErrorMessage(err));
    } finally {
      setBusy(false);
      // Clear the input so re-picking the same file still fires a change.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        className={`rounded-2xl border-2 border-dashed text-center transition-colors ${
          compact ? "p-5" : "p-8"
        } ${
          disabled
            ? "border-stone-200 bg-stone-50"
            : dragging
              ? "border-rose-400 bg-rose-100/60"
              : "border-rose-200 bg-rose-50/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <span
          className={`mx-auto flex items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          <UploadCloudIcon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </span>
        <p className={`font-semibold text-stone-800 ${compact ? "mt-2 text-sm" : "mt-4"}`}>
          {busy ? "Uploading…" : "Drag and drop a file here"}
        </p>
        <p className="mt-1 text-xs text-stone-500">{acceptLabel}</p>

        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          <UploadCloudIcon className="h-4 w-4" />
          {busy ? "Uploading…" : "Browse Files"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/** A row summarising an uploaded file, with an optional remove control. */
export function UploadedFileRow({
  name,
  url,
  size,
  onRemove,
}: {
  name: string;
  url: string;
  size?: number | null;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 text-sm text-stone-700 hover:text-rose-700"
      >
        <FileTextIcon className="h-4 w-4 shrink-0 text-rose-600" />
        <span className="truncate">{name}</span>
        {size != null && (
          <span className="shrink-0 text-xs text-stone-400">{formatBytes(size)}</span>
        )}
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="shrink-0 text-stone-400 hover:text-rose-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
