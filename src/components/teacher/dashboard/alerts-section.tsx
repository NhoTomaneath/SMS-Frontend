"use client";

import Link from "next/link";
import { CloudCheckIcon, FileTextIcon } from "@/components/icons";
import type { TeacherClass, TimetableScheduleItem } from "../types";

export function DashboardAlertsSection({
  classes = [],
  schedule = [],
}: {
  classes?: TeacherClass[];
  schedule?: TimetableScheduleItem[];
}) {
  const alerts = [
    {
      id: "schedule-alert",
      title: `${schedule.length} Class Session${schedule.length === 1 ? "" : "s"} Today`,
      desc: schedule.length > 0 ? "Be sure to submit attendance for each class." : "No classes today.",
      icon: CloudCheckIcon,
    },
    {
      id: "courses-alert",
      title: `${classes.length} Active Course${classes.length === 1 ? "" : "s"} Assigned`,
      desc: "Review assignments and enter coursework grades before finals.",
      icon: FileTextIcon,
    },
  ];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-stone-900">Activity &amp; Alerts</h2>
      <ul className="mt-4 divide-y divide-stone-100">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start gap-3 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <alert.icon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-800">{alert.title}</p>
              <p className="mt-0.5 text-sm text-stone-500">{alert.desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/teacher/assignments"
        className="mt-2 block text-center text-sm font-semibold text-rose-700 hover:underline"
      >
        Go to Academics →
      </Link>
    </section>
  );
}
