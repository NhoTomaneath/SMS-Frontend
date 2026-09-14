"use client";

import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, so a search box drives one request per pause
 * rather than one per keystroke.
 *
 * The setState here is deliberate: it is the timer firing, not a render-time
 * derivation, which is exactly the synchronisation an effect is for.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
