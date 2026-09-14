"use client";

import { useState } from "react";
import { ChevronDownIcon, DownloadIcon, FileTextIcon, PlusIcon, UploadCloudIcon, XIcon } from "@/components/icons";
import type { DocumentType, StudentDocumentDTO } from "@/lib/api/types";

interface DocsTabProps {
  documents: StudentDocumentDTO[];
  isLoading: boolean;
  onAddDoc: (type: DocumentType, url: string) => void;
  onDeleteDoc: (id: string) => void;
  isAdding: boolean;
  isDeleting: boolean;
  feedback: string | null;
}

export function ProfileDocumentsTab({
  documents, isLoading, onAddDoc, onDeleteDoc, isAdding, isDeleting, feedback,
}: DocsTabProps) {
  const [docType, setDocType] = useState<DocumentType>("TRANSCRIPT");
  const [fileUrl, setFileUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl.trim()) return;
    onAddDoc(docType, fileUrl.trim());
    setFileUrl("");
  };

  return (
    <div className="space-y-4">
      {feedback && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{feedback}</p>}
      <form onSubmit={handleSubmit} className="rounded-xl border border-dashed border-stone-200 p-3 bg-stone-50/40 text-xs">
        <h4 className="font-bold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1.5">
          <UploadCloudIcon className="h-4 w-4 text-rose-700" /> Attach Document
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} className="w-full appearance-none rounded-lg border bg-white px-3 py-1.5 outline-none">
              <option value="TRANSCRIPT">Academic Transcript</option>
              <option value="CERTIFICATE">Graduation Certificate</option>
              <option value="ID_CARD">National ID / Passport</option>
              <option value="OTHER">Other Verification Document</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
          <input type="url" required value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://example.com/docs/file.pdf" className="rounded-lg border bg-white px-3 py-1.5 outline-none" />
        </div>
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={isAdding} className="flex items-center gap-1 rounded-lg bg-rose-800 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50">
            <PlusIcon className="h-3 w-3" /> {isAdding ? "Attaching…" : "Add"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {isLoading && <p className="py-3 text-center text-xs text-stone-400">Loading documents…</p>}
        {!isLoading && documents.length === 0 && <p className="py-4 text-center text-xs text-stone-400">No documents attached.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5 hover:border-rose-200 text-xs">
            <div className="flex items-center gap-2.5">
              <FileTextIcon className="h-4 w-4 text-rose-600" />
              <div>
                <p className="font-bold text-stone-800">{doc.documentType}</p>
                <p className="text-[10px] text-stone-400">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded border px-2 py-0.5 font-semibold text-stone-600 hover:bg-stone-50">
                <DownloadIcon className="h-3 w-3" /> View
              </a>
              <button type="button" disabled={isDeleting} onClick={() => onDeleteDoc(doc.id)} className="text-stone-400 hover:text-rose-600">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
