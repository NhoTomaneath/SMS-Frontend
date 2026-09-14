"use client";

import Link from "next/link";
import { KitLogo } from "@/components/kit-logo";

/** The centred card layout shared by sign-in, sign-up and password reset. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <KitLogo className="h-20 w-20" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-rose-800">
            {title}
          </h1>
          <p className="mt-2 text-stone-500">{subtitle}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-rose-100 bg-white p-8 shadow-sm">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}

        <div className="mt-10 flex items-center justify-center gap-6 border-t border-stone-200 pt-6 text-sm text-stone-500">
          <Link href="/sign-in" className="hover:text-rose-700">
            Sign In
          </Link>
          <Link href="/sign-up" className="hover:text-rose-700">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Field wrapper matching the sign-in page's input styling. */
export function AuthField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="relative mt-1.5">{children}</div>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-lg border border-rose-200 bg-white py-3 px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

export const authInputWithIconClass =
  "w-full rounded-lg border border-rose-200 bg-white py-3 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
