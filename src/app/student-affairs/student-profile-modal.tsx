"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { EditIcon, XIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type { AddStudentDocumentBody, DocumentType, LinkStudentAccountBody, StudentDTO, StudentDocumentDTO } from "@/lib/api/types";
import { ProfileOverviewTab } from "@/components/student-affairs/management/profile-overview-tab";
import { ProfileDocumentsTab } from "@/components/student-affairs/management/profile-documents-tab";
import { ProfileAccountTab } from "@/components/student-affairs/management/profile-account-tab";

interface ModalProps {
  student: StudentDTO;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function StudentProfileModal({ student, isOpen, onClose, onEdit }: ModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "documents" | "account">("overview");
  const [feedback, setFeedback] = useState<string | null>(null);

  const docsQuery = useApiQuery<StudentDocumentDTO[]>(
    ["student-affairs", "students", student.id, "documents"],
    `/student-affairs/students/${student.id}/documents`,
    { enabled: isOpen }
  );

  const addDoc = useMutation({
    mutationFn: (body: AddStudentDocumentBody) => apiFetch(`/student-affairs/students/${student.id}/documents`, { method: "POST", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "students", student.id, "documents"] });
      setFeedback("Document added."); setTimeout(() => setFeedback(null), 2500);
    },
    onError: (e: Error) => setFeedback(e.message || "Failed to add doc"),
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => apiFetch(`/student-affairs/students/${student.id}/documents/${docId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "students", student.id, "documents"] });
      setFeedback("Document removed."); setTimeout(() => setFeedback(null), 2500);
    },
    onError: (e: Error) => setFeedback(e.message || "Failed to delete doc"),
  });

  const linkAccount = useMutation({
    mutationFn: (body: LinkStudentAccountBody) => apiFetch(`/student-affairs/students/${student.id}/link-account`, { method: "PATCH", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-affairs", "students"] });
      setFeedback("Account linked!"); setTimeout(() => setFeedback(null), 2500);
    },
    onError: (e: Error) => setFeedback(e.message || "Failed to link"),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-900">{student.firstName} {student.lastName}</h3>
              <StatusBadge label={student.status} tone="green" />
            </div>
            <p className="font-mono text-xs text-rose-700">{student.studentNumber}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onEdit} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-stone-50">
              <EditIcon className="h-3 w-3" /> Edit
            </button>
            <button type="button" onClick={onClose} className="rounded p-1 text-stone-400 hover:text-stone-600"><XIcon className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex border-b border-stone-100 px-4 text-xs font-bold">
          {(["overview", "documents", "account"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`capitalize py-2.5 px-3 border-b-2 ${tab === t ? "border-rose-800 text-rose-800" : "border-transparent text-stone-400"}`}>
              {t} {t === "documents" && `(${docsQuery.data?.data?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "overview" && <ProfileOverviewTab student={student} />}
          {tab === "documents" && <ProfileDocumentsTab documents={docsQuery.data?.data ?? []} isLoading={docsQuery.isLoading} onAddDoc={(type: DocumentType, url: string) => addDoc.mutate({ documentType: type, fileUrl: url })} onDeleteDoc={(id) => deleteDoc.mutate(id)} isAdding={addDoc.isPending} isDeleting={deleteDoc.isPending} feedback={feedback} />}
          {tab === "account" && <ProfileAccountTab student={student} onLinkAccount={(userId) => linkAccount.mutate({ userId })} isLinking={linkAccount.isPending} feedback={feedback} />}
        </div>
      </div>
    </div>
  );
}
