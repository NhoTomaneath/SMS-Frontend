"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { LoadingRow, ErrorRow, EmptyRow } from "@/components/query-states";
import { PlusIcon, SendIcon, XIcon } from "@/components/icons";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { ApiRequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { SupportTicketDTO } from "@/lib/api/types";

const TICKETS_KEY = ["account", "support", "tickets"] as const;

const fieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100";

const STATUS_STYLES: Record<SupportTicketDTO["status"], string> = {
  OPEN: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  CLOSED: "bg-stone-100 text-stone-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useApiMutation<{ subject: string; message: string }, SupportTicketDTO>(
    "/support/tickets",
    {
      invalidate: [TICKETS_KEY],
      onSuccess: onClose,
      onError: (err) => setError(err instanceof ApiRequestError ? err.message : "Failed to submit."),
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate({ subject, message });
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-stone-900/5"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-stone-900">New support ticket</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Subject</span>
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Message</span>
            <textarea
              required
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            {mutation.isPending ? "Submitting…" : "Submit ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TicketThread({ ticket, onClose }: { ticket: SupportTicketDTO; onClose: () => void }) {
  const { user } = useAuth();
  const [reply, setReply] = useState("");

  const mutation = useApiMutation<{ message: string }>(`/support/tickets/${ticket.id}/replies`, {
    invalidate: [TICKETS_KEY],
    onSuccess: () => setReply(""),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-stone-900/5">
        <div className="flex items-start justify-between border-b border-stone-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{ticket.subject}</h3>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}
            >
              {ticket.status.replace("_", " ")}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-lg bg-stone-50 p-3">
            <p className="text-sm text-stone-700">{ticket.message}</p>
            <p className="mt-1 text-xs text-stone-400">{formatDate(ticket.createdAt)}</p>
          </div>
          {ticket.replies.map((r) => {
            const mine = r.userId === user?.id;
            return (
              <div key={r.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    mine ? "bg-rose-800 text-white" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  <p className="text-xs font-semibold opacity-80">
                    {r.user.firstName} {r.user.lastName}
                  </p>
                  <p className="mt-0.5 text-sm">{r.message}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-rose-100" : "text-stone-400"}`}>
                    {formatDate(r.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {ticket.status !== "CLOSED" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) mutation.mutate({ message: reply.trim() });
            }}
            className="flex items-center gap-2 border-t border-stone-100 p-4"
          >
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply…"
              maxLength={4000}
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={mutation.isPending || !reply.trim()}
              aria-label="Send reply"
              className="shrink-0 rounded-lg bg-rose-800 p-2.5 text-white hover:bg-rose-900 disabled:opacity-50"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicketDTO | null>(null);

  const query = useApiQuery<SupportTicketDTO[]>(TICKETS_KEY, "/support/tickets", {
    query: { page: 1, limit: 50 },
  });

  const tickets = query.data?.data ?? [];
  // Keep the open modal's data fresh after a reply/refetch.
  const liveOpenTicket = openTicket ? tickets.find((t) => t.id === openTicket.id) ?? openTicket : null;

  return (
    <div>
      <PageHeader
        title="Support"
        description="Open a ticket if you run into an issue and track replies here."
        actions={
          <button
            type="button"
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-2 rounded-lg bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            <PlusIcon className="h-4 w-4" />
            New ticket
          </button>
        }
      />

      <section className="rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wide text-stone-400">
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {query.isLoading && <LoadingRow colSpan={3} />}
            {query.isError && (
              <ErrorRow colSpan={3} message={query.error.message} onRetry={() => query.refetch()} />
            )}
            {!query.isLoading &&
              !query.isError &&
              tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="cursor-pointer hover:bg-stone-50"
                >
                  <td className="px-6 py-4 font-semibold text-stone-800">{t.subject}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-500">{formatDate(t.updatedAt)}</td>
                </tr>
              ))}
            {!query.isLoading && !query.isError && tickets.length === 0 && (
              <EmptyRow colSpan={3} label="No support tickets yet." />
            )}
          </tbody>
        </table>
      </section>

      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} />}
      {liveOpenTicket && (
        <TicketThread ticket={liveOpenTicket} onClose={() => setOpenTicket(null)} />
      )}
    </div>
  );
}
