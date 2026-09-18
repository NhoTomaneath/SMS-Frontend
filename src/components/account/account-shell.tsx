"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KitLogo } from "@/components/kit-logo";
import { GearIcon, HelpCircleIcon, ClipboardIcon, LogOutIcon, ChevronLeftIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";
import { roleHome, roleLabel } from "@/lib/auth/roles";

const TABS = [
  { href: "/account/settings", label: "Settings", icon: GearIcon },
  { href: "/account/support", label: "Support", icon: ClipboardIcon },
  { href: "/account/help", label: "Help Center", icon: HelpCircleIcon },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href={user ? roleHome(user.role) : "/sign-in"}
            className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-700"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to portal
          </Link>
          <div className="h-6 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <KitLogo className="h-7 w-7" />
            <span className="text-lg font-extrabold tracking-tight text-rose-800">
              KIT SMS
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {user && (
              <div className="text-right leading-tight">
                <p className="text-sm font-bold text-stone-800">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-stone-400">{roleLabel(user.role)}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              aria-label="Sign out"
              className="text-stone-400 hover:text-rose-700"
            >
              <LogOutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="mb-8 flex gap-2 border-b border-stone-200">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-rose-700 text-rose-700"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
