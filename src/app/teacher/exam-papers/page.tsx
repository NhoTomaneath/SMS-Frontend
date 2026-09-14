"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { useTeacherClasses } from "@/components/teacher/hooks/use-teacher-workspace";
import {
  useExamsList,
  useExamPapers,
  useSubmitExamPaper,
} from "@/components/teacher/hooks/use-teacher-exams";
import { ExamPapersHeader } from "@/components/teacher/exam-papers/exam-papers-header";
import { DraftPapersSection } from "@/components/teacher/exam-papers/draft-papers-section";
import { CorrectionHubSection } from "@/components/teacher/exam-papers/correction-hub-section";
import { ExamPerformanceAside } from "@/components/teacher/exam-papers/exam-performance-aside";
import { CreateExamPaperModal } from "@/components/teacher/exam-papers/create-exam-paper-modal";
import { BulkUploadModal } from "@/components/teacher/exam-papers/bulk-upload-modal";

export default function TeacherExamPaperPage() {
  const classesQuery = useTeacherClasses();
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeClassId = selectedClassId || classes[0]?.id || "";
  const examsQuery = useExamsList(activeClassId);
  const activeExam = useMemo(() => examsQuery.data?.data?.[0] || null, [examsQuery.data]);

  const papersQuery = useExamPapers(activeExam?.id);
  const papers = useMemo(() => papersQuery.data?.data ?? [], [papersQuery.data]);
  const submitMutation = useSubmitExamPaper(activeExam?.id);

  function triggerToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }

  return (
    <div>
      <ExamPapersHeader
        classes={classes}
        selectedClassId={activeClassId}
        onSelectClass={setSelectedClassId}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenBulkUpload={() => setShowUploadModal(true)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <DraftPapersSection
            papers={papers}
            isLoading={papersQuery.isLoading}
            onSubmitToCoe={async (id) => {
              await submitMutation.mutateAsync({ id });
              triggerToast("Exam paper submitted to COE for review.");
            }}
          />
          <CorrectionHubSection classId={activeClassId} />
        </div>

        <ExamPerformanceAside />
      </div>

      {showCreateModal && activeExam && (
        <CreateExamPaperModal
          examId={activeExam.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={triggerToast}
        />
      )}

      {showUploadModal && (
        <BulkUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={triggerToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-4 text-white shadow-xl">
          <CheckCircleIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">{toast}</p>
        </div>
      )}
    </div>
  );
}
