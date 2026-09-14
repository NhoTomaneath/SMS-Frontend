"use client";

import { apiFetch, ApiRequestError } from "./client";

/**
 * What `POST /media/upload` returns. Only `url` matters to callers — the API
 * stores links, so the URL is what gets written onto the owning record.
 */
export interface UploadedFileDTO {
  id: string;
  fileId: string;
  url: string;
  path: string;
  mimeType: string;
  type: "IMAGE" | "VIDEO";
  size: number | null;
  width: number | null;
  height: number | null;
  storage: {
    provider: "cloudinary";
    publicId: string;
    folder: string;
    resourceType: "image" | "video" | "raw";
  };
}

/** Mirrors CLOUDINARY_ALLOWED_MIME_TYPES on the backend. */
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const IMAGE_UPLOAD_TYPES = ALLOWED_UPLOAD_TYPES.filter((t) =>
  t.startsWith("image/"),
);

export const DOCUMENT_UPLOAD_TYPES = ALLOWED_UPLOAD_TYPES.filter(
  (t) => !t.startsWith("image/"),
);

/** Matches CLOUDINARY_UPLOAD_MAX_BYTES (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Rejects a file the server would reject anyway, so the user sees the reason
 * immediately instead of after a round trip.
 */
export function validateUpload(
  file: File,
  accept: string[] = ALLOWED_UPLOAD_TYPES,
): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  // Some browsers report an empty type for known extensions, so fall back to
  // the extension rather than blocking a legitimate file.
  if (file.type && !accept.includes(file.type)) {
    return `${file.type} is not an accepted file type.`;
  }
  if (!file.type && !/\.(jpe?g|png|webp|gif|pdf|csv|xlsx?|)$/i.test(file.name)) {
    return "That file type is not accepted.";
  }
  return null;
}

/** Uploads one file and returns the stored asset, URL included. */
export async function uploadFile(file: File): Promise<UploadedFileDTO> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<UploadedFileDTO>("/media/upload", {
    method: "POST",
    body: form,
  });
  return res.data;
}

/** Uploads the signed-in user's avatar, replacing any existing one. */
export async function uploadProfilePicture(file: File): Promise<UploadedFileDTO> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<UploadedFileDTO>("/media/user/profile-picture", {
    method: "POST",
    body: form,
  });
  return res.data;
}

export function uploadErrorMessage(err: unknown, fallback = "Upload failed."): string {
  if (err instanceof ApiRequestError) return err.message;
  return fallback;
}
