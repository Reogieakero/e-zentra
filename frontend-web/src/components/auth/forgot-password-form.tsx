"use client";

import { useState } from "react";
import { Check, KeyRound, Mail } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import styles from "./auth-form.module.css";
import resetStyles from "./password-reset.module.css";

interface ResetRequestResult {
  delivered: boolean;
  devResetUrl: string | null;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await sileo.promise(
        api<{ data: ResetRequestResult }>("/auth/password-reset/request", {
          method: "POST",
          body: { email },
        }),
        {
          loading: {
            title: "Sending reset link…",
            description: "Checking that email on our records.",
          },
          success: (res) =>
            res.data.devResetUrl
              ? {
                  title: "SMTP isn't configured",
                  description: "In development, your reset link is shown below instead of being emailed.",
                  icon: <KeyRound size={18} />,
                }
              : {
                  title: "Reset link sent",
                  description: res.data.delivered
                    ? "Check your inbox for instructions to reset your password."
                    : "If an account exists for that email, reset instructions are on their way.",
                  icon: <Mail size={18} />,
                },
          error: (err) => ({
            title: "Request failed",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.",
          }),
        }
      );

      setDevResetUrl(data.devResetUrl);
      setSent(true);
    } catch {
      // sileo.promise already surfaced the error toast
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!devResetUrl) return;
    try {
      await navigator.clipboard.writeText(devResetUrl);
      setCopied(true);
      sileo.success({
        title: "Link copied",
        description: "Paste it in your browser to reset your password.",
        icon: <Check size={18} />,
      });
    } catch {
      sileo.error({ title: "Copy failed", description: "Select and copy the link manually." });
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
            <Mail size={16} className={styles.inputIcon} aria-hidden />
            <input
              id="email"
              type="email"
              className={styles.input}
              required
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : "Send reset link"}
        </button>
      </form>

      {sent ? (
        <div className={resetStyles.successCard} role="status">
          <div className={resetStyles.successTitle}>
            <Check size={16} />
            Check your email
          </div>
          <p className={resetStyles.successText}>
            {devResetUrl
              ? "SMTP is not configured, so here is your reset link. It expires in 30 minutes."
              : "If an account exists for that email, you'll receive a reset link that expires in 30 minutes. If you don't see it, check your spam folder."}
          </p>
          {devResetUrl ? (
            <div className={resetStyles.devBox}>
              <span className={resetStyles.devLabel}>
                <KeyRound size={12} />
                Dev reset link
              </span>
              <span className={resetStyles.devUrl}>{devResetUrl}</span>
              <button type="button" className={resetStyles.copyBtn} onClick={handleCopy}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
