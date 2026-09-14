"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadCloudIcon, XIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";
import type { ImportStudentsResultDTO } from "@/lib/api/types";

interface BulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ImportStudentsResultDTO) => void;
}

const CSV_HEADER = "studentNumber,firstName,lastName,dateOfBirth,gender,personalEmail,contactDetails,guardianName,guardianContact\nSTU-2026-001,Sokha,Meas,2005-04-12,MALE,sokha.meas@example.com,012345678,Sopheap Meas,012987654";

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const blob = new Blob([CSV_HEADER], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error("The selected CSV file is empty.");
      const res = await apiFetch<ImportStudentsResultDTO>("/student-affairs/students/import", {
        method: "POST",
        body: { csv: text },
      });
      if (res.data.failedCount > 0) {
        setError(`Imported ${res.data.createdCount} students, but ${res.data.failedCount} rows failed: ${res.data.errors[0]?.message}`);
      } else {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-stone-900 text-sm">Bulk Import Students</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-4 w-4" /></button>
        </div>
        {error && <p className="mt-3 text-xs text-rose-600 font-semibold">{error}</p>}
        <div className="mt-4 rounded-xl border-2 border-dashed p-6 text-center">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }} />
          <UploadCloudIcon className="mx-auto h-7 w-7 text-stone-400" />
          <p className="mt-2 text-xs font-semibold text-stone-700">{file ? file.name : "Select a CSV file"}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-bold text-rose-700 hover:underline">Browse CSV</button>
            <span className="text-stone-300">|</span>
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"><DownloadIcon className="h-3 w-3" /> Template</button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-stone-50">Cancel</button>
          <button type="button" disabled={!file || loading} onClick={handleUpload} className="rounded-lg bg-rose-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50">
            {loading ? "Importing…" : "Upload & Process"}
          </button>
        </div>
      </div>
    </div>
  );
}
