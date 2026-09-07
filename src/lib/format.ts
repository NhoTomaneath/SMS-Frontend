/**
 * Presentation helpers shared by every portal's adapter layer.
 *
 * These turn wire values into what tables and cards render: initials, a stable
 * avatar tint, and dates in the viewer's locale.
 */

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

/** Stable hash so the same person keeps the same tint across pages and reloads. */
function hashOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hashOf(seed) % AVATAR_COLORS.length];
}

export function initialsOf(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "??";
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

/** "12 Jun 2026" — for dates where the time of day is noise. */
export function formatDate(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "12 Jun, 3:45 PM" — for audit trails and activity feeds. */
export function formatDateTime(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "3 days ago" — coarse, for feeds where exactness does not matter. */
export function formatRelative(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;

  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secondsPer] of units) {
    if (Math.abs(seconds) >= secondsPer) {
      return rtf.format(-Math.round(seconds / secondsPer), unit);
    }
  }
  return rtf.format(-seconds, "second");
}

/**
 * Reads the clock face off a Postgres `time` value.
 *
 * Prisma serialises those as a full ISO timestamp on 1970-01-01 UTC, so parsing
 * it as a Date would shift the value by the viewer's timezone offset. Only the
 * "HH:mm" substring is meaningful.
 */
export function clockTime(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? iso.slice(0, 5);
}

/** "08:00 – 10:00" for a timetable or exam slot. */
export function timeRange(startIso: string, endIso: string): string {
  return `${clockTime(startIso)} – ${clockTime(endIso)}`;
}

/** Rounds to a whole percentage, guarding the divide-by-zero case. */
export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** Downloads rows as a CSV file. Values are quoted; embedded quotes doubled. */
export function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>,
): void {
  const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Turns SCREAMING_SNAKE enum values into "Title Case" for display. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
