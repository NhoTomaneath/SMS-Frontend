"use client";

import { useState } from "react";
import { useCreateAnnouncement } from "../hooks/use-teacher-announcements";
import type { TeacherClass } from "../types";

interface AnnouncementFormProps {
  classes: TeacherClass[];
  onSuccess: () => void;
}

export function AnnouncementForm({ classes, onSuccess }: AnnouncementFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL_STUDENTS" | "CLASS">("ALL_STUDENTS");
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateAnnouncement();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    if (!body.trim()) return setError("Announcement message cannot be empty.");
    if (audience === "CLASS" && !classId) return setError("Please select a class.");

    try {
      setError(null);
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        audience,
        classId: audience === "CLASS" ? classId : undefined,
      });
      setTitle("");
      setBody("");
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <input
        placeholder="Announcement title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
          error && !title.trim() ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
        }`}
      />
      <textarea
        placeholder="Announcement message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={8000}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
          error && !body.trim() ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
        }`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as "ALL_STUDENTS" | "CLASS")}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700"
        >
          <option value="ALL_STUDENTS">All Students</option>
          <option value="CLASS">Specific Class</option>
        </select>
        {audience === "CLASS" && (
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course.code}: {c.course.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="rounded-lg bg-rose-800 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
      >
        {createMutation.isPending ? "Posting…" : "Post Announcement"}
      </button>
    </form>
  );
}
