"use client";

interface AssignmentFormFieldsProps {
  title: string;
  maxScore: string;
  dueDate: string;
  description: string;
  errors: Record<string, string>;
  onTitleChange: (v: string) => void;
  onMaxScoreChange: (v: string) => void;
  onDueDateChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

export function AssignmentFormFields({
  title,
  maxScore,
  dueDate,
  description,
  errors,
  onTitleChange,
  onMaxScoreChange,
  onDueDateChange,
  onDescriptionChange,
}: AssignmentFormFieldsProps) {
  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Title</label>
        <input
          placeholder="e.g. Midterm Project"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
            errors.title ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Max Score</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={maxScore}
            onChange={(e) => onMaxScoreChange(e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
              errors.maxScore ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
            }`}
          />
          {errors.maxScore && <p className="mt-1 text-xs text-rose-600">{errors.maxScore}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none ${
              errors.dueDate ? "border-rose-400 bg-rose-50/20" : "border-stone-300"
            }`}
          />
          {errors.dueDate && <p className="mt-1 text-xs text-rose-600">{errors.dueDate}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-stone-500">Description</label>
        <textarea
          rows={2}
          placeholder="Optional instructions..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none"
        />
      </div>
    </div>
  );
}
