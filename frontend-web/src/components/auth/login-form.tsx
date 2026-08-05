"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import { setTokens, setUser, type LoginResponse, type Portal } from "@/lib/auth";
import { googleSignIn } from "@/lib/supabase";
import { env } from "@/lib/env";
import { GoogleIcon } from "./google-icon";
import styles from "./auth-form.module.css";

interface LoginFormProps {
  portal: Portal;
  endpoint: string;
}

export function LoginForm({ portal, endpoint }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await sileo.promise(
        api<{ data: LoginResponse }>(endpoint, {
          method: "POST",
          body: { email, password },
        }),
        {
          loading: {
            title: "Signing you in…",
            description: "Verifying your credentials.",
          },
          success: (res) => ({
            title: `Welcome back${res.data.user.firstName ? `, ${res.data.user.firstName}` : ""}!`,
            description: "You're now signed in to Zentra.",
            icon: <GraduationCap size={18} />,
          }),
          error: (err) => ({
            title: "Sign-in failed",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.",
          }),
        }
      );
      setTokens(data.tokens);
      setUser(data.user);
      router.push("/");
    } catch {
      // sileo.promise already surfaced the error toast
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgot() {
    router.push(`/forgot-password?portal=${portal}`);
  }

  async function handleGoogle() {
    if (!env.supabaseConfigured) {
      sileo.warning({
        title: "Google sign-in isn't configured",
        description: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    sileo.info({
      title: "Redirecting to Google…",
      description: "Authorize your Google account to continue.",
    });

    setGoogleLoading(true);
    try {
      await googleSignIn({ portal });
    } catch (err) {
      sileo.error({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <div className={styles.inputWrap}>
            <Mail size={16} className={styles.inputIcon} />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@school.edu.ph"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <button type="button" className={styles.forgot} onClick={handleForgot}>
              Forgot password?
            </button>
          </div>
          <div className={styles.inputWrap}>
            <Lock size={16} className={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`${styles.input} ${styles.inputPass}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={styles.showBtn}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className={styles.optionsRow}>
          <label className={styles.remember}>
            <input type="checkbox" name="remember" />
            <span>Remember me</span>
          </label>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : "Sign In"}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <div className={styles.dividerLine} />
      </div>

      <button type="button" className={styles.google} onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading ? <span className={styles.spinner} /> : <GoogleIcon size={18} />}
        Continue with Google
      </button>
    </>
  );
}