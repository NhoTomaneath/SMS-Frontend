"use client";

import { useState } from "react";
import { CheckCircleIcon, ShieldCheckIcon } from "@/components/icons";
import type { StudentDTO } from "@/lib/api/types";

interface AccountTabProps {
  student: StudentDTO;
  onLinkAccount: (userId: string) => void;
  isLinking: boolean;
  feedback: string | null;
}

export function ProfileAccountTab({
  student,
  onLinkAccount,
  isLinking,
  feedback,
}: AccountTabProps) {
  const [userIdInput, setUserIdInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdInput.trim()) return;
    onLinkAccount(userIdInput.trim());
    setUserIdInput("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
            <ShieldCheckIcon className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Student Portal Access</h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Link this record to a User login account so the student can view their timetable and grades.
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-stone-200 pt-3">
          {student.userId ? (
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase">Linked User Account</p>
                <p className="font-mono font-bold text-emerald-700 mt-0.5">{student.userId}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" /> Active Link
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <p className="text-xs text-amber-700 font-medium">No login account currently linked.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="Enter User UUID…"
                  className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-mono outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  disabled={isLinking}
                  className="rounded-lg bg-rose-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-900 disabled:opacity-50"
                >
                  {isLinking ? "Linking…" : "Link Account"}
                </button>
              </div>
            </form>
          )}

          {feedback && <p className="mt-2 text-xs font-semibold text-rose-700">{feedback}</p>}
        </div>
      </div>
    </div>
  );
}
