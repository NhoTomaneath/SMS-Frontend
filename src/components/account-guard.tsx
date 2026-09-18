"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ScreenMessage } from "@/components/query-states";

/**
 * Client-side gate for the shared /account/* pages (Settings, Support, Help),
 * which any authenticated user can reach regardless of role. Mirrors
 * <PortalGuard> but without the role check.
 */
export function AccountGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "anon") {
      router.replace("/sign-in");
    }
  }, [status, router]);

  if (status === "loading") {
    return <ScreenMessage>Loading…</ScreenMessage>;
  }
  if (status === "anon" || !user) {
    return <ScreenMessage>Redirecting…</ScreenMessage>;
  }
  return <>{children}</>;
}
