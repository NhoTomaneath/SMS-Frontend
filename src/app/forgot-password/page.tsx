"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "@/components/icons";
import {
  AuthCard,
  AuthField,
  authInputClass,
  authInputWithIconClass,
} from "@/components/auth-card";
import { apiFetch, ApiRequestError } from "@/lib/api/client";

/**
 * Password reset is a three-step, cookie-backed flow:
 * request-password-reset → verify-password-reset (six-digit code) →
 * reset-password. Each step reads the httpOnly cookie set by the previous one,
 * which the same-origin proxy carries for us.
 */
type Step = "request" | "verify" | "reset" | "done";

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 429) {
      return err.retryAfterSeconds
        ? `Too many attempts. Try again in ${err.retryAfterSeconds}s.`
        : "Too many attempts. Please try again later.";
    }
    const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : null;
    return firstFieldError ?? err.message;
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/request-password-reset", {
        method: "POST",
        body: { email: email.trim() },
        skipRefresh: true,
      });
      setStep("verify");
      setNotice(
        `If an account exists for ${email.trim()}, a six-digit code is on its way.`,
      );
    } catch (err) {
      setError(messageFor(err, "Could not start a password reset."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/verify-password-reset", {
        method: "POST",
        body: { code: code.trim() },
        skipRefresh: true,
      });
      setStep("reset");
      setNotice(null);
    } catch (err) {
      setError(messageFor(err, "That code was not accepted."));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { newPassword },
        skipRefresh: true,
      });
      setStep("done");
    } catch (err) {
      setError(messageFor(err, "Could not reset your password."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <AuthCard
        title="Password Updated"
        subtitle="You can sign in with your new password."
      >
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircleIcon className="h-8 w-8" />
          </span>
          <p className="mt-5 text-sm text-stone-600">
            Any other sessions on this account have been signed out.
          </p>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-800 py-3 font-semibold text-white hover:bg-rose-900"
          >
            Go to Sign In
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </AuthCard>
    );
  }

  if (step === "reset") {
    return (
      <AuthCard title="Set a New Password" subtitle="Choose a password you have not used before.">
        <form onSubmit={handleReset} className="space-y-5">
          <AuthField id="newPassword" label="New Password">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${authInputWithIconClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </AuthField>

          {error && (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-800 py-3 font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update Password"}
          </button>
        </form>
      </AuthCard>
    );
  }

  if (step === "verify") {
    return (
      <AuthCard title="Check Your Email" subtitle="Enter the six-digit code we sent.">
        <form onSubmit={handleVerify} className="space-y-5">
          {notice && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
              {notice}
            </p>
          )}

          <AuthField id="code" label="Reset Code">
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${authInputClass} text-center font-mono text-lg tracking-[0.4em]`}
            />
          </AuthField>

          {error && (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-800 py-3 font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify Code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("request");
              setCode("");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-sm font-medium text-rose-700 hover:underline"
          >
            Use a different email
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="We will email you a code to reset it."
      footer={
        <span className="text-stone-500">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-medium text-rose-700 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleRequest} className="space-y-5">
        <AuthField id="email" label="Email">
          <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputWithIconClass}
          />
        </AuthField>

        {error && (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-800 py-3 font-semibold text-white transition-colors hover:bg-rose-900 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send Reset Code"}
          {!busy && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>
    </AuthCard>
  );
}
