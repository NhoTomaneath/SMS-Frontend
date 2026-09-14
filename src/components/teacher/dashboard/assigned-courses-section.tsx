"use client";

import Link from "next/link";
import { GraduationCapIcon } from "@/components/icons";
import type { TeacherClass } from "../types";

export function AssignedCoursesSection({
  classes = [],
  isLoading,
}: {
  classes?: TeacherClass[];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-stone-900">Assigned Courses</h2>

      {isLoading ? (
        <p className="mt-4 text-center text-sm text-stone-400">Loading courses…</p>
      ) : classes.length === 0 ? (
        <p className="mt-4 text-center text-sm text-stone-400">No classes assigned yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {classes.map((cls) => (
            <li key={cls.id}>
              <Link
                href={`/teacher/assignments?classId=${cls.id}`}
                className="flex items-center gap-4 py-4 hover:bg-stone-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                  <GraduationCapIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-stone-800">
                    {cls.course.code}: {cls.course.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {cls.room ? (cls.room.toLowerCase().startsWith("room") ? cls.room : `Room ${cls.room}`) : "Room TBD"} • {cls._count?.registrations ?? 0} Students Enrolled
                  </p>
                </div>
                <span className="text-stone-300">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
