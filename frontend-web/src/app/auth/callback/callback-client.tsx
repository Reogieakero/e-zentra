"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import { clearSession, setTokens, setUser, type LoginResponse, type Portal } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing your sign-in…");
  const started = useRef(false);

  useEffect(() => {
    async function handle() {
      if (started.current) return;
      started.current = true;

      const portal = (searchParams.get("portal") ?? "staff") as Portal;
      if (!window.location.hash && !searchParams.get("code")) {
        setMessage("No Google sign-in was found. Redirecting…");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? (await exchangeCode()) ?? null;

        if (error || !token) {
          throw new Error("Could not obtain a Google session.");
        }

        const { data: loginData } = await api<{ data: LoginResponse }>("/auth/oauth/google/callback", {
          method: "POST",
          body: { accessToken: token, portal },
        });

        setTokens(loginData.tokens);
        setUser(loginData.user);
        router.replace("/");
      } catch (err) {
        clearSession();
        setMessage(err instanceof ApiClientError || err instanceof Error ? err.message : "Sign-in failed.");
        setTimeout(() => router.replace("/login"), 2000);
      }
    }

    async function exchangeCode(): Promise<string | null> {
      const code = searchParams.get("code");
      if (!code) return null;
      const supabase = getSupabase();
      const { data } = await supabase.auth.exchangeCodeForSession(code);
      return data.session?.access_token ?? null;
    }

    handle();
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-sans)",
        color: "var(--foreground)",
        background: "var(--muted)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          fontSize: 14,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            border: "3px solid var(--border-strong)",
            borderTopColor: "var(--brand-primary)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        {message}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}