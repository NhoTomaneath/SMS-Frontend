"use client";

import { ChevronDownIcon } from "@/components/icons";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-colors ${
          error
            ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-200"
            : "border-stone-200 bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-colors ${
            error
              ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-200"
              : "border-stone-200 bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          }`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
