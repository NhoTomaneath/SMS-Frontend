/**
 * Thin fetch wrapper around the SMS-Backend API (proxied at /api/backend/*).
 *
 * - Attaches the in-memory access token as `Authorization: Bearer`.
 * - Unwraps the `{ success, data, pagination }` envelope.
 * - On 401, transparently calls /auth/refresh-token once (single-flight) and
 *   retries the original request.
 */

import type { ApiEnvelope, ApiPagination } from "./types";

const BASE = "/api/backend";

// ─── Shared access-token holder ────────────────────────────────────────────
// Kept module-level so the AuthProvider and this client agree without importing
// each other. AuthProvider owns the lifecycle; everything else just reads it.

let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered by AuthProvider; called when a refresh attempt fails. */
export function setOnAuthLost(cb: (() => void) | null): void {
  onAuthLost = cb;
}

// ─── Error type ────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─── Request options ───────────────────────────────────────────────────────

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON-serialised, unless it is a FormData — then sent as multipart. */
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Skip the 401 -> refresh -> retry dance (used by auth calls themselves). */
  skipRefresh?: boolean;
}

export interface ApiResult<T> {
  data: T;
  pagination?: ApiPagination;
  message?: string;
}

// ─── Single-flight refresh ─────────────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh-token`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
        if (!body.success) return false;
        setAccessToken(body.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        // Clear on the next tick so concurrent callers share this result.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

// ─── Core ──────────────────────────────────────────────────────────────────

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const url = new URL(
    `${BASE}${path.startsWith("/") ? path : `/${path}`}`,
    window.location.origin,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

async function rawFetch(
  path: string,
  opts: ApiFetchOptions,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const isMultipart = opts.body instanceof FormData;

  // The browser must set Content-Type for FormData so it can append the
  // multipart boundary; setting it by hand breaks the upload.
  if (opts.body !== undefined && !isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const body = isMultipart
    ? (opts.body as FormData)
    : opts.body !== undefined
      ? JSON.stringify(opts.body)
      : undefined;

  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    body,
    signal: opts.signal,
  });
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && !opts.skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, opts);
    } else {
      setAccessToken(null);
      onAuthLost?.();
    }
  }

  // 204 / empty body
  if (res.status === 204) {
    return { data: undefined as T };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  // Standard envelope
  if (body && typeof body === "object" && "success" in body) {
    const env = body as ApiEnvelope<T>;
    if (env.success) {
      return {
        data: env.data,
        pagination: env.pagination,
        message: env.message,
      };
    }
    throw new ApiRequestError(
      res.status,
      env.message || "Request failed.",
      env.errors,
      parseRetryAfter(res),
    );
  }

  // Off-envelope shapes: global 500 handler `{ error, message }`, or nothing.
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : null) ??
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ??
      `Request failed (${res.status}).`;
    throw new ApiRequestError(res.status, message, undefined, parseRetryAfter(res));
  }

  return { data: body as T };
}

function parseRetryAfter(res: Response): number | undefined {
  const header = res.headers.get("Retry-After");
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}
