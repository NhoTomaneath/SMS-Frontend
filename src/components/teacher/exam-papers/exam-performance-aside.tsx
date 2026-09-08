"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { PromoBanner } from "@/components/promo-banner";

const initialChecklist = [
  { id: "1", title: "Paper Blueprint Mapping", desc: "Mapped to ABET criteria", done: false },
  { id: "2", title: "Answer Key Draft", desc: "Uploaded to secure cloud", done: false },
  { id: "3", title: "Coursework Marks Submitted", desc: "Submitted to COE", done: false },
  { id: "4", title: "COE Approval Received", desc: "Final clearance before exam", done: false },
];

export function ExamPerformanceAside() {
  const [checklist, setChecklist] = useState(initialChecklist);

  function downloadGuidelines() {
    const text =
      "COE Submission Guidelines\n\n" +
      "1. Map every question to its ABET criteria before submission.\n" +
      "2. Upload the answer key draft to the secure cloud folder.\n" +
      "3. Verify internal coursework marks for all enrolled students.\n" +
      "4. Obtain COE portal approval before conducting exams.\n";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "coe-submission-guidelines.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          COE Submission Checklist
        </h3>
        <ul className="mt-4 space-y-3">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  setChecklist((prev) =>
                    prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)),
                  )
                }
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  item.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"
                }`}
              >
                <CheckCircleIcon className="h-3.5 w-3.5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                <p className="text-xs text-stone-500">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={downloadGuidelines}
          className="mt-5 w-full rounded-lg border border-rose-300 bg-white py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
        >
          Download Guidelines
        </button>
      </div>

      <PromoBanner
        eyebrow="Guidelines"
        title="COE Exam Policy"
        description="Exam papers must be submitted at least 2 weeks prior to exam commencement."
      />
    </aside>
  );
}
