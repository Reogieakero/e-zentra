"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, getTokens, getUser, setTokens, type AuthTokens } from "@/lib/auth";
import styles from "./session-expiry.module.css";

const WARNING_MS = 60_000;

function accessTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = JSON.parse(json) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function loginRedirect(role?: string): string {
  switch (role) {
    case "principal":
    case "teacher":
    case "registrar":
    case "record_keeper":
    case "adm_coordinator":
    case "guidance_counselor":
    case "nurse":
      return "/login/staff";
    case "student":
      return "/login/student";
    case "parent":
      return "/login/parent";
    default:
      return "/login";
  }
}

export function SessionExpiry() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [expired, setExpired] = useState(false);
  const [extending, setExtending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const tokens = getTokens();
    if (!tokens?.accessToken) return;
    const exp = accessTokenExpiry(tokens.accessToken);
    if (exp == null) return;
    const remaining = exp - Date.now();
    const delay = Math.max(0, remaining - WARNING_MS);
    timerRef.current = setTimeout(() => {
      setExpired(remaining <= 0);
      setShow(true);
    }, delay);
  }, []);

  useEffect(() => {
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  async function handleStay() {
    setExtending(true);
    const tokens = getTokens();
    try {
      const { data } = await api<{ data: AuthTokens }>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: tokens?.refreshToken },
      });
      setTokens(data);
      setShow(false);
      setExpired(false);
      schedule();
    } catch {
      clearSession();
      router.replace(loginRedirect(getUser()?.role));
    } finally {
      setExtending(false);
    }
  }

  function handleLogout() {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      void api("/auth/logout", { method: "POST", body: { refreshToken: tokens.refreshToken } }).catch(() => undefined);
    }
    clearSession();
    router.replace(loginRedirect(getUser()?.role));
  }

  if (!show) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Session expiring">
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Clock className={styles.icon} />
        </div>
        <h2 className={styles.title}>{expired ? "Your session has expired" : "Your session is about to expire"}</h2>
        <p className={styles.message}>
          {expired
            ? "You've been signed out for security. Stay signed in to continue where you left off."
            : "For security, you'll be signed out shortly. Select \"I'm still here\" to stay signed in, or sign out now."}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.stayBtn} onClick={handleStay} disabled={extending}>
            {extending ? <span className={styles.spinner} /> : <UserCheck className={styles.btnIcon} />}
            {extending ? "Extending…" : "I'm still here"}
          </button>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut className={styles.btnIcon} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
