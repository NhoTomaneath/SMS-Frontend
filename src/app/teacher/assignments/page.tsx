"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { useTeacherClasses } from "@/components/teacher/hooks/use-teacher-workspace";
import {
  useClassAssignments,
  useAssignmentSubmissions,
  useGradeSubmission,
} from "@/components/teacher/hooks/use-teacher-assignments";
import { AssignmentsHeader } from "@/components/teacher/assignments/assignments-header";
import { AssignmentsTabs } from "@/components/teacher/assignments/assignments-tabs";
import { AssignmentsLayout } from "@/components/teacher/assignments/assignments-layout";
import { CourseworkGradesPanel } from "@/components/teacher/assignments/coursework-grades-panel";
import { CreateAssignmentModal } from "@/components/teacher/assignments/create-assignment-modal";
import { exportSubmissionsCsv } from "@/components/teacher/assignments/csv-export";

export default function AssignmentGradingPage() {
  const classesQuery = useTeacherClasses();
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"assignments" | "coursework">("assignments");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeClassId = selectedClassId || classes[0]?.id || "";
  const assignmentsQuery = useClassAssignments(activeClassId);
  const assignments = useMemo(() => assignmentsQuery.data?.data ?? [], [assignmentsQuery.data]);
  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) || assignments[0] || null,
    [assignments, selectedAssignmentId],
  );

  const submissionsQuery = useAssignmentSubmissions(activeAssignment?.id);
  const submissions = useMemo(() => submissionsQuery.data?.data ?? [], [submissionsQuery.data]);
  const gradeMutation = useGradeSubmission(activeAssignment?.id);

  function triggerToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }

  return (
    <div>
      <AssignmentsHeader
        classes={classes}
        selectedClassId={activeClassId}
        onSelectClass={setSelectedClassId}
        onOpenCreate={() => setShowCreateModal(true)}
        onExportCsv={() => exportSubmissionsCsv(submissions, activeAssignment?.title)}
      />
      <AssignmentsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "coursework" ? (
        <CourseworkGradesPanel classId={activeClassId} onSuccess={triggerToast} />
      ) : (
        <AssignmentsLayout
          assignments={assignments}
          activeAssignment={activeAssignment}
          submissions={submissions}
          assignmentsLoading={assignmentsQuery.isLoading}
          submissionsLoading={submissionsQuery.isLoading}
          onSelectAssignment={setSelectedAssignmentId}
          onSaveGrade={async (id, score) => {
            await gradeMutation.mutateAsync({ id, score });
            triggerToast("Score saved successfully.");
          }}
        />
      )}
      {showCreateModal && activeClassId && (
        <CreateAssignmentModal
          classId={activeClassId}
          onClose={() => setShowCreateModal(false)}
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
