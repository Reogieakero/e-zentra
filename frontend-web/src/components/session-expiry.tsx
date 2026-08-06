"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, getTokens, getUser, setTokens, type AuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import styles from "./session-expiry.module.css";

const IDLE_WARN_MS = 5 * 60 * 1000;
const EXPIRY_WARN_MS = 60_000;
const AUTO_LOGOUT_MS = 60_000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

type Reason = "idle" | "expiry";

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
  const [reason, setReason] = useState<Reason>("expiry");
  const [extending, setExtending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_LOGOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);
  const showRef = useRef(false);

  const clearAutoLogout = useCallback(() => {
    if (autoLogoutRef.current) {
      clearTimeout(autoLogoutRef.current);
      autoLogoutRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      void api("/auth/logout", { method: "POST", body: { refreshToken: tokens.refreshToken } }).catch(() => undefined);
    }
    clearSession();
    router.replace(loginRedirect(getUser()?.role));
  }, [router]);

  const startAutoLogout = useCallback(() => {
    clearAutoLogout();
    setSecondsLeft(AUTO_LOGOUT_MS / 1000);
    autoLogoutRef.current = setTimeout(() => {
      handleLogout();
    }, AUTO_LOGOUT_MS);
  }, [clearAutoLogout, handleLogout]);

  const openOverlay = useCallback(
    (next: Reason) => {
      if (showRef.current) return;
      showRef.current = true;
      setReason(next);
      setShow(true);
      startAutoLogout();
    },
    [startAutoLogout]
  );

  const closeOverlay = useCallback(() => {
    showRef.current = false;
    setShow(false);
    lastActivityRef.current = Date.now();
    clearAutoLogout();
  }, [clearAutoLogout]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const tokens = getTokens();
    if (!tokens?.accessToken) return;
    const exp = accessTokenExpiry(tokens.accessToken);
    if (exp == null) return;
    const remaining = exp - Date.now();
    const delay = Math.max(0, remaining - EXPIRY_WARN_MS);
    timerRef.current = setTimeout(() => openOverlay("expiry"), delay);
  }, [openOverlay]);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    schedule();
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    intervalRef.current = setInterval(() => {
      if (showRef.current) return;
      const tokens = getTokens();
      if (!tokens?.accessToken) return;
      if (Date.now() - lastActivityRef.current >= IDLE_WARN_MS) openOverlay("idle");
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoLogoutRef.current) clearTimeout(autoLogoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [schedule, openOverlay]);

  useEffect(() => {
    if (!show) return;
    const tick = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [show]);

  async function handleStay() {
    setExtending(true);
    const tokens = getTokens();
    try {
      const { data } = await api<{ data: AuthTokens }>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: tokens?.refreshToken },
      });
      setTokens(data);
      closeOverlay();
      schedule();
    } catch {
      clearSession();
      router.replace(loginRedirect(getUser()?.role));
    } finally {
      setExtending(false);
    }
  }

  if (!show) return null;

  const isIdle = reason === "idle";

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Session expiring">
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Clock className={styles.icon} />
        </div>
        <h2 className={styles.title}>{isIdle ? "Are you still there?" : "Your session is about to expire"}</h2>
        <p className={styles.message}>
          {isIdle
            ? "You've been idle for a while. Select \"I'm still here\" to keep your session active, or sign out now."
            : "For security, you'll be signed out shortly. Select \"I'm still here\" to stay signed in, or sign out now."}{" "}
          {secondsLeft > 0 && `You'll be signed out automatically in ${secondsLeft}s if you don't respond.`}
        </p>
        <div className={styles.actions}>
          <Button variant="primary" size="md" onClick={handleStay} disabled={extending}>
            {extending ? <span className={styles.spinner} /> : <UserCheck className={styles.btnIcon} />}
            {extending ? "Extending…" : "I'm still here"}
          </Button>
          <Button variant="secondary" size="md" onClick={handleLogout}>
            <LogOut className={styles.btnIcon} />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}