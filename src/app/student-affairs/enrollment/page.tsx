"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { FileDropzone, UploadedFileRow } from "@/components/file-upload";
import {
  CameraIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  GraduationCapIcon,
  InfoIcon,
  UserIcon,
} from "@/components/icons";
import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import type {
  CreateStudentBody,
  DepartmentDTO,
  DocumentTypeDTO,
  StudentDocumentDTO,
  StudentDTO,
  StudentSummaryDTO,
} from "@/lib/api/types";
import {
  DOCUMENT_UPLOAD_TYPES,
  IMAGE_UPLOAD_TYPES,
  type UploadedFileDTO,
} from "@/lib/api/upload";
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from "@/lib/student-affairs/students";

const SAO_KEY = ["student-affairs"] as const;
const DEPARTMENTS_KEY = ["lookups", "departments"] as const;

function TextField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  max,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  max?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500"
      >
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        {...(max ? { max } : {})}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500"
      >
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-stone-50"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>
    </div>
  );
}

const emptyForm = {
  studentNumber: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  personalEmail: "",
  contactDetails: "",
  guardianName: "",
  guardianContact: "",
  bloodGroup: "",
  enrollmentDate: "",
  status: "ENROLLED",
  departmentId: "",
};

type FormState = typeof emptyForm;

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<StudentDTO | null>(null);

  // Files upload immediately (they need no student), but a document row can
  // only be attached once the record exists — so hold them until then.
  const [portrait, setPortrait] = useState<UploadedFileDTO | null>(null);
  const [pendingDocs, setPendingDocs] = useState<
    Array<{ name: string; url: string; size: number | null; documentType: DocumentTypeDTO }>
  >([]);
  const [docType, setDocType] = useState<DocumentTypeDTO>("ID_CARD");
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachedCount, setAttachedCount] = useState(0);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const departmentsQuery = useApiQuery<DepartmentDTO[]>(
    DEPARTMENTS_KEY,
    "/student-affairs/departments",
  );
  const departments = departmentsQuery.data?.data ?? [];

  // The student number is the one field the backend will not invent, and it
  // must be unique — suggest the next in sequence from the current total.
  const summaryQuery = useApiQuery<StudentSummaryDTO>(
    [...SAO_KEY, "students", "summary"],
    "/student-affairs/students/summary",
  );
  const suggestedNumber = `KIT-${new Date().getFullYear()}-${String(
    (summaryQuery.data?.data.total ?? 0) + 1001,
  ).padStart(4, "0")}`;

  const createMutation = useMutation({
    mutationFn: (body: CreateStudentBody) =>
      apiFetch<StudentDTO>("/student-affairs/students", { method: "POST", body }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: SAO_KEY });
      setCreated(res.data);
      setFormError(null);
      if (pendingDocs.length > 0) attachDocuments.mutate(res.data.id);
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
        setFormError(firstFieldError ?? err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    },
  });

  /**
   * Documents are attached after creation because the endpoint is scoped to a
   * student id. Each is a separate POST, so report partial failures rather
   * than losing the whole batch.
   */
  const attachDocuments = useMutation({
    mutationFn: async (studentId: string) => {
      const results = await Promise.allSettled(
        pendingDocs.map((doc) =>
          apiFetch<StudentDocumentDTO>(
            `/student-affairs/students/${studentId}/documents`,
            { method: "POST", body: { documentType: doc.documentType, fileUrl: doc.url } },
          ),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { attached: results.length - failed, failed };
    },
    onSuccess: ({ attached, failed }) => {
      setAttachedCount(attached);
      setPendingDocs([]);
      setAttachError(
        failed > 0 ? `${failed} document(s) could not be attached.` : null,
      );
    },
    onError: () => setAttachError("Could not attach the documents."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const studentNumber = form.studentNumber.trim() || suggestedNumber;

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First and last name are required.");
      return;
    }

    // Only send fields the user actually filled — the backend rejects empty
    // strings where it expects a date, an email or a UUID.
    const body: CreateStudentBody = {
      studentNumber,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      ...(form.gender ? { gender: form.gender as CreateStudentBody["gender"] } : {}),
      ...(form.personalEmail.trim() ? { personalEmail: form.personalEmail.trim() } : {}),
      ...(form.contactDetails.trim() ? { contactDetails: form.contactDetails.trim() } : {}),
      ...(form.guardianName.trim() ? { guardianName: form.guardianName.trim() } : {}),
      ...(form.guardianContact.trim() ? { guardianContact: form.guardianContact.trim() } : {}),
      ...(form.bloodGroup ? { bloodGroup: form.bloodGroup as CreateStudentBody["bloodGroup"] } : {}),
      ...(form.enrollmentDate ? { enrollmentDate: form.enrollmentDate } : {}),
      ...(form.status ? { status: form.status as CreateStudentBody["status"] } : {}),
      ...(form.departmentId ? { departmentId: form.departmentId } : {}),
    };

    setFormError(null);
    createMutation.mutate(body);
  }

  // ── Success view ──────────────────────────────────────────────────────────

  if (created) {
    return (
      <div>
        <PageHeader
          breadcrumb={[
            { label: "Dashboard", href: "/student-affairs" },
            { label: "Enrollment" },
          ]}
          title="Student Enrolled"
          description="The record has been created and is now searchable in the directory."
        />
        <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircleIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-stone-900">
            {created.firstName} {created.lastName}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {created.department?.name ?? "No department"} ·{" "}
            {created.status.toLowerCase()}
          </p>

          <dl className="mt-6 rounded-xl bg-stone-50 p-5 text-left text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Student number</dt>
              <dd className="font-mono font-bold text-rose-700">
                {created.studentNumber}
              </dd>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <dt className="text-stone-500">Record ID</dt>
              <dd className="font-mono text-xs text-stone-500">{created.id}</dd>
            </div>
          </dl>

          {(attachDocuments.isPending || attachedCount > 0 || attachError) && (
            <p
              className={`mt-4 text-sm ${attachError ? "text-rose-600" : "text-stone-500"}`}
            >
              {attachDocuments.isPending
                ? "Attaching documents…"
                : attachError
                  ? attachError
                  : `${attachedCount} document${attachedCount === 1 ? "" : "s"} attached.`}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setForm(emptyForm);
                setPortrait(null);
                setPendingDocs([]);
                setAttachedCount(0);
                setAttachError(null);
              }}
              className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Enroll Another
            </button>
            <Link
              href="/student-affairs"
              className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Dashboard", href: "/student-affairs" },
          { label: "Enrollment" },
        ]}
        title="New Student Enrollment"
        description="Register a new student into the academic management system."
        actions={
          <>
            <button
              type="button"
              onClick={() => router.push("/student-affairs")}
              className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="enrollment-form"
              disabled={createMutation.isPending}
              className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {createMutation.isPending ? "Saving…" : "Create Student Record"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form id="enrollment-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <UserIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900">Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <TextField
                id="firstName"
                label="First Name"
                placeholder="e.g. Sophea"
                value={form.firstName}
                onChange={set("firstName")}
                required
              />
              <TextField
                id="lastName"
                label="Last Name"
                placeholder="e.g. Sok"
                value={form.lastName}
                onChange={set("lastName")}
                required
              />
              <TextField
                id="dateOfBirth"
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={set("dateOfBirth")}
                max={new Date().toISOString().slice(0, 10)}
              />
              <SelectField
                id="gender"
                label="Gender"
                value={form.gender}
                onChange={set("gender")}
                options={GENDER_OPTIONS}
                placeholder="Select gender"
              />
              <TextField
                id="personalEmail"
                label="Personal Email"
                type="email"
                placeholder="sophea.sok@example.com"
                value={form.personalEmail}
                onChange={set("personalEmail")}
              />
              <TextField
                id="contactDetails"
                label="Mobile Number"
                placeholder="+855 12 345 678"
                value={form.contactDetails}
                onChange={set("contactDetails")}
              />
              <TextField
                id="guardianName"
                label="Guardian Name"
                placeholder="e.g. Dara Sok"
                value={form.guardianName}
                onChange={set("guardianName")}
              />
              <TextField
                id="guardianContact"
                label="Guardian Contact"
                placeholder="+855 12 987 654"
                value={form.guardianContact}
                onChange={set("guardianContact")}
              />
              <SelectField
                id="bloodGroup"
                label="Blood Group"
                value={form.bloodGroup}
                onChange={set("bloodGroup")}
                options={BLOOD_GROUP_OPTIONS}
                placeholder="Select blood type"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <GraduationCapIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900">Academic Placement</h2>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <SelectField
                id="departmentId"
                label="Department"
                value={form.departmentId}
                onChange={set("departmentId")}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder={
                  departmentsQuery.isLoading ? "Loading…" : "Select department"
                }
                disabled={departmentsQuery.isLoading}
              />
              <SelectField
                id="status"
                label="Enrollment Status"
                value={form.status}
                onChange={set("status")}
                options={STUDENT_STATUS_OPTIONS}
                placeholder="Select status"
              />
              <TextField
                id="enrollmentDate"
                label="Enrollment Date"
                type="date"
                value={form.enrollmentDate}
                onChange={set("enrollmentDate")}
              />
              <TextField
                id="studentNumber"
                label="Student Number"
                placeholder={suggestedNumber}
                value={form.studentNumber}
                onChange={set("studentNumber")}
              />
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
              Leave the student number blank to use{" "}
              <span className="font-mono font-semibold">{suggestedNumber}</span>. It
              must be unique — the backend rejects duplicates.
            </p>

            {formError && (
              <p className="mt-4 text-sm font-medium text-rose-600">{formError}</p>
            )}
          </section>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Program &amp; Major
            </h3>
            <p className="mt-3 text-sm text-stone-500">
              Majors and semesters are assigned by Academic Affairs once the record
              exists. Create the student here first.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Student Portrait
            </h3>
            {portrait ? (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portrait.url}
                  alt="Student portrait"
                  className="mx-auto h-40 w-40 rounded-2xl object-cover"
                />
                <div className="mt-3">
                  <UploadedFileRow
                    name="Portrait"
                    url={portrait.url}
                    size={portrait.size}
                    onRemove={() => setPortrait(null)}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <FileDropzone
                  compact
                  accept={IMAGE_UPLOAD_TYPES}
                  acceptLabel="JPG, PNG, WEBP or GIF, up to 5 MB"
                  onUploaded={(file) => setPortrait(file)}
                />
              </div>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
              <CameraIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Stored on upload. The student record does not carry a portrait
              field yet, so this is kept with the record&apos;s documents.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Supporting Documents
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Uploaded now, attached to the record once it is created.
            </p>

            <label
              htmlFor="doc-type"
              className="mt-4 mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500"
            >
              Document Type
            </label>
            <select
              id="doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentTypeDTO)}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400"
            >
              <option value="ID_CARD">ID Card</option>
              <option value="TRANSCRIPT">Transcript</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="OTHER">Other</option>
            </select>

            <div className="mt-3">
              <FileDropzone
                compact
                accept={DOCUMENT_UPLOAD_TYPES}
                acceptLabel="PDF, CSV or spreadsheet, up to 5 MB"
                onUploaded={(file, original) =>
                  setPendingDocs((docs) => [
                    ...docs,
                    {
                      name: original.name,
                      url: file.url,
                      size: file.size,
                      documentType: docType,
                    },
                  ])
                }
              />
            </div>

            {pendingDocs.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pendingDocs.map((doc, i) => (
                  <li key={doc.url}>
                    <UploadedFileRow
                      name={`${doc.name} · ${doc.documentType.replace("_", " ").toLowerCase()}`}
                      url={doc.url}
                      size={doc.size}
                      onRemove={() =>
                        setPendingDocs((docs) => docs.filter((_, j) => j !== i))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
