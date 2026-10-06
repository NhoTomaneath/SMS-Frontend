"use client";

import { useMemo, useState } from "react";
import type { ExamPaperItem } from "@/components/teacher/exam-types";
import { CheckCircleIcon } from "@/components/icons";
import { useTeacherClasses } from "@/components/teacher/hooks/use-teacher-workspace";
import {
  useExamsList,
  useExamPapers,
  useSubmitExamPaper,
} from "@/components/teacher/hooks/use-teacher-exams";
import { ExamPapersHeader } from "@/components/teacher/exam-papers/exam-papers-header";
import { DraftPapersSection } from "@/components/teacher/exam-papers/draft-papers-section";
import { ExamScoreEntrySection } from "@/components/teacher/exam-papers/exam-score-entry-section";
import { CorrectionHubSection } from "@/components/teacher/exam-papers/correction-hub-section";
import { ExamPerformanceAside } from "@/components/teacher/exam-papers/exam-performance-aside";
import { CreateExamPaperModal } from "@/components/teacher/exam-papers/create-exam-paper-modal";

export default function TeacherExamPaperPage() {
  const classesQuery = useTeacherClasses();
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<ExamPaperItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeClassId = selectedClassId || classes[0]?.id || "";
  const examsQuery = useExamsList(activeClassId);
  const activeExam = useMemo(() => examsQuery.data?.data?.[0] || null, [examsQuery.data]);
  const finalExam = useMemo(
    () => examsQuery.data?.data?.find((e) => e.examType === "FINAL") ?? null,
    [examsQuery.data],
  );

  const papersQuery = useExamPapers(activeExam?.id);
  const papers = useMemo(() => papersQuery.data?.data ?? [], [papersQuery.data]);
  const submitMutation = useSubmitExamPaper(activeExam?.id);

  const submitBlockedReason = examsQuery.isLoading
    ? "Loading exams…"
    : !activeExam
      ? "The Controller of Examination has not created an exam for this class yet."
      : papers.length > 0
        ? "A paper is already submitted for this exam. Use Edit to change it."
        : null;

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
        submitBlockedReason={submitBlockedReason}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {!examsQuery.isLoading && !activeExam && activeClassId && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The Controller of Examination has not created an exam for this class yet. You can
              submit the exam paper and answer key once an exam is scheduled.
            </p>
          )}
          <DraftPapersSection
            papers={papers}
            isLoading={papersQuery.isLoading}
            onEdit={setEditingPaper}
            onSubmitToCoe={async (id) => {
              await submitMutation.mutateAsync({ id });
              triggerToast("Exam paper submitted to COE for review.");
            }}
          />
          <ExamScoreEntrySection classId={activeClassId} examId={finalExam?.id} />
          <CorrectionHubSection classId={activeClassId} />
        </div>

        <ExamPerformanceAside />
      </div>

      {(showCreateModal || editingPaper) && activeExam && (
        <CreateExamPaperModal
          examId={activeExam.id}
          paper={editingPaper}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPaper(null);
          }}
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
