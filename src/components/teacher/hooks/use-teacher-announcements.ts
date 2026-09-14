"use client";

import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { AnnouncementItem } from "../exam-types";

export interface CreateAnnouncementBody {
  title: string;
  body: string;
  audience: "ALL_STUDENTS" | "CLASS";
  classId?: string;
}

export function useTeacherAnnouncements() {
  return useApiQuery<AnnouncementItem[]>(
    ["teacher", "announcements"],
    "/teacher/announcements",
  );
}

export function useCreateAnnouncement() {
  return useApiMutation<CreateAnnouncementBody, AnnouncementItem>(
    "/teacher/announcements",
    {
      method: "POST",
      invalidate: [["teacher", "announcements"]],
    },
  );
}
