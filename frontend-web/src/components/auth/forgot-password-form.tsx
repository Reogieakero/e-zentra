"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, KeyRound, Mail, ShieldAlert } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import type { Portal } from "@/lib/auth";
import styles from "./auth-form.module.css";
import resetStyles from "./password-reset.module.css";

interface ResetRequestResult {
  delivered: boolean;
  devResetUrl: string | null;
  mismatch: Portal | null;
}

const PORTAL_LABEL: Record<Portal, string> = {
  student: "student",
  parent: "parent",
  staff: "staff",
};

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const portal = (searchParams.get("portal") as Portal | null) ?? undefined;
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api<{ data: ResetRequestResult }>("/auth/password-reset/request", {
        method: "POST",
        body: { email, portal },
      });

      // The email belongs to a different role than the page you're on.
      if (data.mismatch) {
        const actual = PORTAL_LABEL[data.mismatch];
        sileo.error({
          title: "Wrong account type",
          description:
            portal === data.mismatch
              ? `This email belongs to a ${actual} account. Use the ${actual} sign-in page to reset it.`
              : `This email is a ${actual} account, not a ${PORTAL_LABEL[portal ?? "staff"]} account. Use the ${actual} sign-in page to reset it.`,
          icon: <ShieldAlert size={18} />,
        });
        return;
      }

      if (data.devResetUrl) {
        sileo.info({
          title: "SMTP isn't configured",
          description: "In development, your reset link is shown below instead of being emailed.",
          icon: <KeyRound size={18} />,
        });
      } else {
        sileo.success({
          title: portal ? `Reset link sent for ${PORTAL_LABEL[portal]} accounts` : "Reset link sent",
          description: data.delivered
            ? portal
              ? `A reset link was sent to this email to reset your ${PORTAL_LABEL[portal]} account. Check your inbox.`
              : "Check your inbox for instructions to reset your password."
            : portal
              ? `If this email belongs to a ${PORTAL_LABEL[portal]} account, a reset link is on its way.`
              : "If an account exists for that email, reset instructions are on their way.",
          icon: <Mail size={18} />,
        });
      }

      setDevResetUrl(data.devResetUrl);
      setSent(true);
    } catch (err) {
      sileo.error({
        title: "Request failed",
        description: err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.",
      });
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

      {portal ? (
        <p className={resetStyles.hint}>
          Reset links are only sent for <strong>{PORTAL_LABEL[portal]}</strong> accounts.
        </p>
      ) : null}

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
