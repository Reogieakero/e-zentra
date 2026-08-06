"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheckBig, ShieldQuestion, UserPlus } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import { clearSession, setTokens, setUser, type LoginResponse, type Portal } from "@/lib/auth";
import { setGoogleIdentity, type GoogleIdentity } from "@/lib/google";
import { getSupabase } from "@/lib/supabase";
import { env } from "@/lib/env";

interface GoogleCallbackResponse {
  needsSignup?: boolean;
  identity?: GoogleIdentity;
  user?: LoginResponse["user"];
  tokens?: LoginResponse["tokens"];
}

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    async function handle() {
      if (started.current) return;
      started.current = true;

      const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
      const portal = (searchParams.get("portal") ?? "staff") as Portal;

      if (!window.location.hash && !searchParams.get("code")) {
        sileo.info({
          title: "No Google sign-in found",
          description: "Taking you back to sign in.",
          icon: <ShieldQuestion size={18} />,
        });
        setTimeout(() => router.replace(mode === "signup" ? "/signup" : "/login"), 1500);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? (await exchangeCode()) ?? null;

        if (error || !token) {
          throw new Error("Could not obtain a Google session.");
        }

        const { data: result } = await api<{ data: GoogleCallbackResponse }>("/auth/oauth/google/callback", {
          method: "POST",
          body: { accessToken: token, portal: mode === "login" ? portal : undefined, mode },
        });

        if (result.needsSignup && result.identity) {
          setGoogleIdentity({ accessToken: token, email: result.identity.email, name: result.identity.name, avatarUrl: result.identity.avatarUrl });
          sileo.info({
            title: "No Zentra account yet",
            description: mode === "signup" ? "Complete your profile to create your account." : "We didn't find an account for this Google email — let's create one.",
            icon: <UserPlus size={18} />,
          });
          setTimeout(() => router.replace("/signup?method=google"), 1500);
          return;
        }

        if (!result.user || !result.tokens) {
          throw new Error("Sign-in did not return a valid session.");
        }

        sileo.success({
          title: `Signed in${result.user.firstName ? `, ${result.user.firstName}` : ""}!`,
          description: "Welcome to Zentra.",
          icon: <CircleCheckBig size={18} />,
        });

        setTokens(result.tokens);
        setUser(result.user);
        router.replace(result.user.role === "principal" ? "/principal/dashboard" : "/");
      } catch (err) {
        clearSession();

        const message =
          err instanceof ApiClientError || err instanceof Error ? err.message : "Sign-in failed.";

        if (!env.supabaseConfigured || /does not exist/i.test(message)) {
          sileo.action({
            title: "Account not found",
            description: message,
            icon: <UserPlus size={18} />,
            button: {
              title: "Create an account",
              onClick: () => router.replace("/signup"),
            },
          });
        } else {
          sileo.error({ title: "Sign-in failed", description: message });
        }

        setTimeout(() => router.replace("/login"), 2500);
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
        Completing your sign-in…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}