"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  setAccessToken,
  setOnAuthLost,
} from "@/lib/api/client";
import type { LoginResponse, MeDTO } from "@/lib/api/types";

type AuthStatus = "loading" | "authed" | "anon";

interface AuthContextValue {
  user: MeDTO | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<MeDTO>;
  logout: () => Promise<void>;
  /** Re-fetch /users/me (e.g. after a profile edit) and refresh the cached identity. */
  refreshUser: () => Promise<MeDTO>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeDTO | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const bootstrapped = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("anon");
  }, []);

  // Wire the API client's "refresh failed" hook to this provider.
  useEffect(() => {
    setOnAuthLost(() => {
      clearSession();
    });
    return () => setOnAuthLost(null);
  }, [clearSession]);

  // On first mount: try to restore a session from the httpOnly refresh cookie.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        const refresh = await apiFetch<LoginResponse>("/auth/refresh-token", {
          method: "POST",
          skipRefresh: true,
        });
        setAccessToken(refresh.data.accessToken);
        const me = await apiFetch<MeDTO>("/users/me", { skipRefresh: true });
        setUser(me.data);
        setStatus("authed");
      } catch {
        clearSession();
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipRefresh: true,
    });
    setAccessToken(res.data.accessToken);
    const me = await apiFetch<MeDTO>("/users/me", { skipRefresh: true });
    setUser(me.data);
    setStatus("authed");
    return me.data;
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await apiFetch<MeDTO>("/users/me");
    setUser(me.data);
    return me.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST", skipRefresh: true });
    } catch {
      // Clearing local state below is what matters for the user.
    }
    clearSession();
    router.replace("/sign-in");
  }, [clearSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refreshUser }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
