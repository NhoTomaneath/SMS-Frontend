export function formatTimeSlot(timeStr?: string | null): string {
  if (!timeStr) return "--:--";
  const trimmed = timeStr.trim();

  // Already formatted 12-hour time (e.g. "9:30 AM" or "10:00 PM")
  if (/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(trimmed)) {
    return trimmed;
  }

  // ISO timestamp (e.g. "1970-01-01T10:00:00.000Z")
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const h = d.getUTCHours();
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHours = h % 12 || 12;
      return `${displayHours}:${m} ${ampm}`;
    }
  }

  // 24-hour time string (e.g. "14:30:00" or "09:00")
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHours = h % 12 || 12;
      const minStr = String(m).padStart(2, "0");
      return `${displayHours}:${minStr} ${ampm}`;
    }
  }

  return trimmed;
}
