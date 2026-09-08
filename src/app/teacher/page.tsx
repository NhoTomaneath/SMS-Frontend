"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { useTeacherClasses, useTeacherSchedule } from "@/components/teacher/hooks/use-teacher-workspace";
import { DashboardHeader } from "@/components/teacher/dashboard/dashboard-header";
import { TodayScheduleSection } from "@/components/teacher/dashboard/today-schedule-section";
import { AssignedCoursesSection } from "@/components/teacher/dashboard/assigned-courses-section";
import { DashboardAlertsSection } from "@/components/teacher/dashboard/alerts-section";
import { QuickActionsBar } from "@/components/teacher/dashboard/quick-actions-bar";
import { TakeAttendanceModal } from "@/components/teacher/dashboard/take-attendance-modal";
import { AnnouncementsModal } from "@/components/teacher/dashboard/announcements-modal";
import { TimetableModal } from "@/components/teacher/dashboard/timetable-modal";
import type { TimetableScheduleItem } from "@/components/teacher/types";

export default function TeacherDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [attendanceFor, setAttendanceFor] = useState<TimetableScheduleItem | null>(null);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showTimetable, setShowTimetable] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const classesQuery = useTeacherClasses();
  const scheduleQuery = useTeacherSchedule(selectedDate);

  const classes = classesQuery.data?.data ?? [];
  const schedule = scheduleQuery.data?.data ?? [];

  function triggerToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }

  return (
    <div>
      <DashboardHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <TodayScheduleSection
        schedule={schedule}
        isLoading={scheduleQuery.isLoading}
        onOpenTimetable={() => setShowTimetable(true)}
        onTakeAttendance={(item) => setAttendanceFor(item)}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AssignedCoursesSection classes={classes} isLoading={classesQuery.isLoading} />
        <DashboardAlertsSection classes={classes} schedule={schedule} />
      </div>

      <QuickActionsBar
        onOpenAnnouncements={() => setShowAnnouncements(true)}
        onOpenTimetable={() => setShowTimetable(true)}
      />

      {attendanceFor && (
        <TakeAttendanceModal
          item={attendanceFor}
          date={selectedDate}
          onClose={() => setAttendanceFor(null)}
          onSuccess={triggerToast}
        />
      )}

      {showAnnouncements && (
        <AnnouncementsModal
          classes={classes}
          onClose={() => setShowAnnouncements(false)}
          onSuccess={triggerToast}
        />
      )}

      {showTimetable && (
        <TimetableModal
          schedule={schedule}
          date={selectedDate}
          onClose={() => setShowTimetable(false)}
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
