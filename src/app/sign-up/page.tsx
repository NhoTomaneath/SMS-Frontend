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
  UserIcon,
} from "@/components/icons";
import {
  AuthCard,
  AuthField,
  authInputClass,
  authInputWithIconClass,
} from "@/components/auth-card";
import { apiFetch, ApiRequestError } from "@/lib/api/client";

/**
 * Registration is a two-step, cookie-backed flow: POST /auth/register sets an
 * httpOnly verification cookie and emails a six-digit code, then
 * POST /auth/verify-email confirms it. The same-origin proxy carries the cookie.
 */
type Step = "details" | "verify" | "done";

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

export default function SignUpPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        },
        skipRefresh: true,
      });
      setStep("verify");
      setNotice(`We sent a six-digit code to ${form.email.trim()}.`);
    } catch (err) {
      setError(messageFor(err, "Could not create your account."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/verify-email", {
        method: "POST",
        body: { verificationCode: code.trim() },
        skipRefresh: true,
      });
      setStep("done");
    } catch (err) {
      setError(messageFor(err, "Could not verify that code."));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await apiFetch("/auth/resend-email-verification", {
        method: "POST",
        skipRefresh: true,
      });
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(messageFor(err, "Could not resend the code."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <AuthCard title="Account Verified" subtitle="You can now sign in to the portal.">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircleIcon className="h-8 w-8" />
          </span>
          <p className="mt-5 text-sm text-stone-600">
            Your email is confirmed. An administrator assigns your role before
            you can reach a portal.
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

  if (step === "verify") {
    return (
      <AuthCard
        title="Verify Your Email"
        subtitle="Enter the six-digit code we emailed you."
      >
        <form onSubmit={handleVerify} className="space-y-5">
          {notice && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
              {notice}
            </p>
          )}

          <AuthField id="code" label="Verification Code">
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
            {busy ? "Verifying…" : "Verify Email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={busy}
            className="w-full text-sm font-medium text-rose-700 hover:underline disabled:text-stone-400"
          >
            Resend code
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create Account"
      subtitle="Register for the KIT student management portal."
      footer={
        <span className="text-stone-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-rose-700 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <AuthField id="firstName" label="First Name">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              id="firstName"
              required
              autoComplete="given-name"
              placeholder="Sophea"
              value={form.firstName}
              onChange={(e) => set("firstName")(e.target.value)}
              className={authInputWithIconClass}
            />
          </AuthField>
          <AuthField id="lastName" label="Last Name">
            <input
              id="lastName"
              required
              autoComplete="family-name"
              placeholder="Sok"
              value={form.lastName}
              onChange={(e) => set("lastName")(e.target.value)}
              className={authInputClass}
            />
          </AuthField>
        </div>

        <AuthField id="email" label="Email">
          <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            className={authInputWithIconClass}
          />
        </AuthField>

        <AuthField id="password" label="Password">
          <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
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
          {busy ? "Creating account…" : "Create Account"}
          {!busy && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>
    </AuthCard>
  );
}
