"use client";

interface AssignmentsTabsProps {
  activeTab: "assignments" | "coursework";
  onTabChange: (tab: "assignments" | "coursework") => void;
}

export function AssignmentsTabs({ activeTab, onTabChange }: AssignmentsTabsProps) {
  return (
    <div className="mb-5 flex gap-2 border-b border-stone-200">
      <button
        type="button"
        onClick={() => onTabChange("assignments")}
        className={`border-b-2 px-4 py-2 text-sm font-semibold ${
          activeTab === "assignments"
            ? "border-rose-800 text-rose-800"
            : "border-transparent text-stone-500"
        }`}
      >
        Assignments &amp; Submissions
      </button>
      <button
        type="button"
        onClick={() => onTabChange("coursework")}
        className={`border-b-2 px-4 py-2 text-sm font-semibold ${
          activeTab === "coursework"
            ? "border-rose-800 text-rose-800"
            : "border-transparent text-stone-500"
        }`}
      >
        Coursework Final Marks (COE)
      </button>
    </div>
  );
}
