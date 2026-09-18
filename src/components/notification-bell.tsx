"use client";

import { useEffect, useRef, useState } from "react";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { NotificationDTO } from "@/lib/api/types";
import { BellIcon, CheckCircleIcon } from "@/components/icons";

const NOTIFICATIONS_KEY = ["notifications"] as const;

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = useApiQuery<NotificationDTO[]>(NOTIFICATIONS_KEY, "/notifications", {
    query: { limit: 10 },
    refetchInterval: 60_000,
  });

  // Accurate badge count: the list above is capped at 10, which would
  // undercount once there are more unread items than that. `pagination.total`
  // on an `unreadOnly` fetch gives the real total regardless of page size.
  const unreadQuery = useApiQuery<NotificationDTO[]>(
    [...NOTIFICATIONS_KEY, "unread-count"],
    "/notifications",
    { query: { unreadOnly: true, limit: 1 }, refetchInterval: 60_000 },
  );

  const markReadMutation = useApiMutation<{ id: string }>(
    ({ id }) => `/notifications/${id}/read`,
    { method: "PATCH", invalidate: [NOTIFICATIONS_KEY] },
  );

  const markAllReadMutation = useApiMutation<void>("/notifications/read-all", {
    method: "PATCH",
    invalidate: [NOTIFICATIONS_KEY],
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const notifications = query.data?.data ?? [];
  const unreadCount = unreadQuery.data?.pagination?.total ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative text-stone-500 hover:text-stone-700"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-stone-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-bold text-stone-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.isLoading && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">Loading…</p>
            )}
            {query.isError && (
              <p className="px-4 py-8 text-center text-sm text-rose-600">
                Couldn&apos;t load notifications.
              </p>
            )}
            {!query.isLoading && !query.isError && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircleIcon className="h-6 w-6 text-stone-300" />
                <p className="text-sm text-stone-400">You&apos;re all caught up.</p>
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.isRead) markReadMutation.mutate({ id: n.id });
                }}
                className={`block w-full border-b border-stone-50 px-4 py-3 text-left last:border-b-0 hover:bg-stone-50 ${
                  n.isRead ? "" : "bg-rose-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-800">{n.title}</p>
                  {!n.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{n.body}</p>
                <p className="mt-1 text-[11px] text-stone-400">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
