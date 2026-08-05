"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api<{ data: LoginResponse }>(endpoint, {
        method: "POST",
        body: { email, password },
      });
      setTokens(data.tokens);
      setUser(data.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      if (env.supabaseConfigured) {
        await googleSignIn(portal);
        return;
      }
      setError("Google sign-in is not configured yet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
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
            <a href="#" className={styles.forgot} onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
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

        {error ? (
          <div className={`${styles.error} ${styles.errorVisible}`} role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : "Sign In"}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
      </div>

      <button type="button" className={styles.google} onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading ? <span className={styles.spinner} /> : <GoogleIcon size={18} />}
        Continue with Google
      </button>
    </>
  );
}