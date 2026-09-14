"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { useCreateAssignment } from "../hooks/use-teacher-assignments";
import { AssignmentFormFields } from "./assignment-form-fields";

interface CreateAssignmentModalProps {
  classId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function CreateAssignmentModal({
  classId,
  onClose,
  onSuccess,
}: CreateAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createMutation = useCreateAssignment(classId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    const num = Number(maxScore);
    if (!maxScore || isNaN(num) || num <= 0 || num > 1000) errs.maxScore = "Score must be 1–1000.";
    if (!dueDate) {
      errs.dueDate = "Due date is required.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(dueDate) <= today) errs.dueDate = "Due date must be in future.";
    }

    if (Object.keys(errs).length > 0) return setErrors(errs);

    try {
      setErrors({});
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        maxScore: num,
        dueDate,
      });
      onSuccess(`Assignment "${title}" created.`);
      onClose();
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to create" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-stone-900">Create Assignment</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <AssignmentFormFields
          title={title}
          maxScore={maxScore}
          dueDate={dueDate}
          description={description}
          errors={errors}
          onTitleChange={setTitle}
          onMaxScoreChange={setMaxScore}
          onDueDateChange={setDueDate}
          onDescriptionChange={setDescription}
        />
        {errors.form && <p className="mt-2 text-xs text-rose-600">{errors.form}</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-500">Cancel</button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-rose-800 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
