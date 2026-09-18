"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { ApiRequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserSettingsDTO } from "@/lib/api/types";

const fieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100";

const SETTINGS_KEY = ["account", "settings"] as const;

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useApiMutation<{ firstName: string; lastName: string }>(
    "/users/me",
    {
      method: "PATCH",
      onSuccess: async () => {
        await refreshUser();
        setStatus("Profile updated.");
        setError(null);
      },
      onError: (err) => {
        setError(err instanceof ApiRequestError ? err.message : "Update failed.");
        setStatus(null);
      },
    },
  );

  return (
    <SectionCard title="Profile" description="Your name as shown across the system.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setStatus(null);
          mutation.mutate({ firstName, lastName });
        }}
        className="space-y-4"
      >
        <div className="flex gap-3">
          <label className="flex-1 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">First name</span>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex-1 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Last name</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input
            disabled
            value={user?.email ?? ""}
            className={`${fieldClass} cursor-not-allowed bg-stone-50 text-stone-400`}
          />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {status && <p className="text-sm text-emerald-700">{status}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </SectionCard>
  );
}

function PasswordSection() {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useApiMutation<{ currentPassword: string; newPassword: string }>(
    "/users/change-password",
    {
      onSuccess: () => setDone(true),
      onError: (err) => {
        setError(err instanceof ApiRequestError ? err.message : "Change failed.");
      },
    },
  );

  if (done) {
    return (
      <SectionCard title="Password" description="Change your account password.">
        <p className="text-sm text-emerald-700">
          Password changed. You&apos;ll need to sign in again.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
        >
          Sign in again
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Password" description="Change your account password.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
          }
          mutation.mutate({ currentPassword, newPassword });
        }}
        className="space-y-4"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">Current password</span>
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="flex gap-3">
          <label className="flex-1 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">New password</span>
            <input
              required
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex-1 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Confirm new password</span>
            <input
              required
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
        >
          {mutation.isPending ? "Changing…" : "Change password"}
        </button>
      </form>
    </SectionCard>
  );
}

function NotificationPreferencesForm({ initial }: { initial: UserSettingsDTO }) {
  const [emailNotifications, setEmailNotifications] = useState(initial.emailNotifications);
  const [inAppNotifications, setInAppNotifications] = useState(initial.inAppNotifications);
  const [status, setStatus] = useState<string | null>(null);

  const mutation = useApiMutation<{ emailNotifications: boolean; inAppNotifications: boolean }>(
    "/users/me/settings",
    {
      method: "PATCH",
      invalidate: [SETTINGS_KEY],
      onSuccess: () => setStatus("Preferences saved."),
    },
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStatus(null);
        mutation.mutate({ emailNotifications, inAppNotifications });
      }}
      className="space-y-4"
    >
      <label className="flex items-center gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-rose-700 focus:ring-rose-300"
        />
        Email notifications
      </label>
      <label className="flex items-center gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={inAppNotifications}
          onChange={(e) => setInAppNotifications(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-rose-700 focus:ring-rose-300"
        />
        In-app notifications
      </label>
      {status && <p className="text-sm text-emerald-700">{status}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
      >
        {mutation.isPending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

function NotificationPreferencesSection() {
  const query = useApiQuery<UserSettingsDTO>(SETTINGS_KEY, "/users/me/settings");

  return (
    <SectionCard
      title="Notification preferences"
      description="Choose how you want to hear about activity on your account."
    >
      {query.isLoading && <p className="text-sm text-stone-400">Loading…</p>}
      {query.isError && (
        <p className="text-sm text-rose-600">Couldn&apos;t load your preferences.</p>
      )}
      {query.data?.data && <NotificationPreferencesForm initial={query.data.data} />}
    </SectionCard>
  );
}

export default function AccountSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, password, and notification preferences."
      />
      <div className="space-y-6">
        <ProfileSection />
        <PasswordSection />
        <NotificationPreferencesSection />
      </div>
    </div>
  );
}
