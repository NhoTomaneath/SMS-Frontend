"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon } from "@/components/icons";
import { FileDropzone, UploadedFileRow } from "@/components/file-upload";
import { ALLOWED_UPLOAD_TYPES } from "@/lib/api/upload";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { AddStudentDocumentBody, DocumentType, StudentDocumentDTO } from "@/lib/api/types";

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "ID_CARD", label: "National ID / Passport" },
  { value: "TRANSCRIPT", label: "Academic Transcript" },
  { value: "CERTIFICATE", label: "Graduation Certificate" },
  { value: "OTHER", label: "Other Verification Document" },
];

/**
 * Attaches supporting documents to a just-created student record, one upload
 * per file — real multipart upload to /media/upload, then a real
 * POST .../documents write, not a local-only preview.
 */
export function BulkDocumentUpload({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<DocumentType>("ID_CARD");
  const [attached, setAttached] = useState<StudentDocumentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (body: AddStudentDocumentBody) =>
      apiFetch<StudentDocumentDTO>(`/student-affairs/students/${studentId}/documents`, {
        method: "POST",
        body,
      }),
    onSuccess: async (res) => {
      setAttached((prev) => [...prev, res.data]);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "documents", studentId] });
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : "Could not attach the document."),
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
        Attach Supporting Documents
      </h3>
      <p className="mt-1 text-xs text-stone-400">
        Upload ID, transcripts, or certificates for this student. You can add several.
      </p>

      <select
        value={docType}
        onChange={(e) => setDocType(e.target.value as DocumentType)}
        className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-rose-400"
      >
        {DOC_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="mt-2">
        <FileDropzone
          compact
          accept={ALLOWED_UPLOAD_TYPES}
          acceptLabel="PDF, image, or spreadsheet, up to 5 MB"
          disabled={addMutation.isPending}
          onUploaded={(uploaded) => addMutation.mutate({ documentType: docType, fileUrl: uploaded.url })}
        />
      </div>

      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      {attached.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {attached.map((doc) => (
            <UploadedFileRow key={doc.id} name={doc.documentType} url={doc.fileUrl} />
          ))}
        </div>
      )}

      {attached.length === 0 && !addMutation.isPending && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
          <FileTextIcon className="h-3.5 w-3.5" />
          No documents attached yet.
        </p>
      )}
    </div>
  );
}
