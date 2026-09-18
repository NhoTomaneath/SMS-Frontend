"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { KitLogo } from "@/components/kit-logo";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ClipboardIcon,
  GearIcon,
  HelpCircleIcon,
  LogOutIcon,
  SearchIcon,
  type IconProps,
} from "@/components/icons";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  active: boolean;
}

export function DashboardShell({
  homeHref,
  navItems,
  userName,
  userRole,
  children,
}: {
  homeHref: string;
  navItems: DashboardNavItem[];
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-rose-100 bg-rose-50/60 px-5 py-6">
        <Link href={homeHref} className="flex items-center gap-2.5 px-2">
          <KitLogo className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight text-rose-800">
            KIT SMS
          </span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                item.active
                  ? "bg-rose-800 text-white shadow-sm"
                  : "text-stone-500 hover:bg-rose-100/70 hover:text-stone-700"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-rose-100 pt-5">
          <Link
            href="/account/help"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100/70"
          >
            <HelpCircleIcon className="h-5 w-5" />
            Help Center
          </Link>
          <Link
            href="/account/support"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100/70"
          >
            <ClipboardIcon className="h-5 w-5" />
            Support
          </Link>
          <Link
            href="/account/settings"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100/70"
          >
            <GearIcon className="h-5 w-5" />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100/70"
          >
            <LogOutIcon className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-6 border-b border-stone-200 bg-white px-8 py-4">
          <div className="relative max-w-md flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search student records..."
              className="w-full rounded-full border border-transparent bg-rose-50/70 py-2.5 pl-11 pr-4 text-sm text-stone-700 placeholder:text-stone-400 outline-none focus:border-rose-200"
            />
          </div>
          <div className="ml-auto flex items-center gap-5">
            <NotificationBell />
            <div className="h-8 w-px bg-stone-200" />
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-stone-800">
                {userName}
              </p>
              <p className="text-xs text-stone-400">{userRole}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
