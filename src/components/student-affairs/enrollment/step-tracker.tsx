"use client";

export const ENROLLMENT_STEPS = [
  { id: 1, label: "Personal Details" },
  { id: 2, label: "Academic Background" },
  { id: 3, label: "ID Assignment & Review" },
] as const;

interface StepTrackerProps {
  currentStep: 1 | 2 | 3;
  assignedId: string | null;
  onSelectStep: (step: 1 | 2 | 3) => void;
}

export function StepTracker({
  currentStep,
  assignedId,
  onSelectStep,
}: StepTrackerProps) {
  return (
    <nav aria-label="Enrollment Steps" className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-4 shadow-sm">
      {ENROLLMENT_STEPS.map((step, index) => {
        const isCompleted = assignedId ? true : currentStep > step.id;
        const isActive = assignedId ? step.id === 3 : currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onSelectStep(step.id)}
              disabled={!!assignedId}
              className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-80 disabled:cursor-default"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-rose-800 text-white shadow"
                    : isCompleted
                      ? "bg-rose-100 text-rose-700 font-semibold"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {isCompleted && !isActive ? "✓" : step.id}
              </span>
              <span
                className={`text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-rose-800 font-bold"
                    : isCompleted
                      ? "text-stone-800"
                      : "text-stone-400"
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < ENROLLMENT_STEPS.length - 1 && (
              <span className="h-px w-8 bg-stone-200" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
