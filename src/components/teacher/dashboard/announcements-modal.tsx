"use client";

import { XIcon } from "@/components/icons";
import { useTeacherAnnouncements } from "../hooks/use-teacher-announcements";
import { AnnouncementForm } from "./announcement-form";
import type { TeacherClass } from "../types";

interface AnnouncementsModalProps {
  classes: TeacherClass[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function AnnouncementsModal({ classes, onClose, onSuccess }: AnnouncementsModalProps) {
  const query = useTeacherAnnouncements();
  const announcements = query.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Announcements</h3>
            <p className="text-sm text-stone-500">Post announcements to students</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <AnnouncementForm
          classes={classes}
          onSuccess={() => onSuccess("Announcement posted successfully.")}
        />

        <div className="mt-4 flex-1 overflow-y-auto border-t border-stone-100 pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Past Announcements</h4>
          {query.isLoading ? (
            <p className="py-4 text-center text-xs text-stone-400">Loading announcements…</p>
          ) : announcements.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-400">No announcements posted yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {announcements.map((a) => (
                <li key={a.id} className="py-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-800">{a.title}</p>
                    <span className="text-[10px] uppercase text-rose-700">{a.audience}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
