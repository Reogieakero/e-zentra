"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import { getPasswordStrength } from "@/lib/password";
import { PasswordInput } from "@/components/ui/password-input";
import styles from "./auth-form.module.css";
import resetStyles from "./password-reset.module.css";

type Status = "verifying" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const wasSatisfiedRef = useRef(false);
  const passwordToastRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmMatchRef = useRef<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (passwordToastRef.current) sileo.dismiss(passwordToastRef.current);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ data: { email: string } }>(`/auth/password-reset/verify/${encodeURIComponent(token)}`)
      .then((res) => {
        if (cancelled) return;
        setEmail(res.data.email);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function dismissPasswordToast() {
    if (passwordToastRef.current) {
      sileo.dismiss(passwordToastRef.current);
      passwordToastRef.current = null;
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!value) {
      dismissPasswordToast();
      wasSatisfiedRef.current = false;
      return;
    }

    const { satisfied, rules } = getPasswordStrength(value);

    if (satisfied) {
      dismissPasswordToast();
      if (!wasSatisfiedRef.current) {
        wasSatisfiedRef.current = true;
        sileo.success({
          title: "Great password!",
          description: "All requirements are met.",
          icon: <ShieldCheck size={18} />,
        });
      }
      return;
    }

    wasSatisfiedRef.current = false;
    const missing = rules.filter((r) => !r.met).map((r) => r.label);

    debounceRef.current = setTimeout(() => {
      dismissPasswordToast();
      passwordToastRef.current = sileo.info({
        title: "Password must include",
        description: missing.join(", "),
        icon: <ShieldCheck size={18} />,
      });
    }, 200);
  }

  function handleConfirmChange(value: string) {
    setConfirm(value);
    if (!value) {
      confirmMatchRef.current = null;
      return;
    }
    const matches = value === password;
    if (matches !== confirmMatchRef.current) {
      confirmMatchRef.current = matches;
      if (matches) {
        sileo.success({
          title: "Passwords match",
          description: "Your confirmation matches the password.",
          icon: <Check size={18} />,
        });
      } else {
        sileo.error({
          title: "Passwords don't match",
          description: "Confirm password must match the password.",
          icon: <X size={18} />,
        });
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { satisfied } = getPasswordStrength(password);
    if (!satisfied) {
      sileo.error({
        title: "Password too weak",
        description: "Meet all password requirements to continue.",
        icon: <ShieldCheck size={18} />,
      });
      return;
    }
    if (confirm !== password) {
      sileo.error({
        title: "Passwords don't match",
        description: "Your confirm password must match the password.",
        icon: <X size={18} />,
      });
      return;
    }

    setSubmitting(true);
    try {
      await sileo.promise(
        api<{ data: Record<string, never> }>("/auth/password-reset/confirm", {
          method: "POST",
          body: { token, newPassword: password },
        }),
        {
          loading: {
            title: "Updating password…",
            description: "Applying your new password.",
          },
          success: {
            title: "Password updated!",
            description: "You can now sign in with your new password.",
            icon: <Check size={18} />,
            button: {
              title: "Go to sign in",
              onClick: () => router.push("/login"),
            },
          },
          error: (err) => ({
            title: "Reset failed",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.",
          }),
        }
      );
} catch {
      } finally {
      setSubmitting(false);
    }
  }

  if (status === "verifying") {
    return (
      <div className={resetStyles.verifying}>
        <span className={resetStyles.spinner} />
        <span>Checking your reset link…</span>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className={resetStyles.errorCard} role="alert">
        <div className={resetStyles.errorTitle}>
          <X size={16} />
          Invalid or expired link
        </div>
        <p className={resetStyles.errorText}>
          This password reset link is invalid, expired, or has already been used. Request a new one to continue.
        </p>
        <button type="button" className={resetStyles.errorBtn} onClick={() => router.push("/forgot-password")}>
          Request a new link
        </button>
      </div>
    );
  }

  return (
    <>
      {email ? (
        <p className={resetStyles.successText} style={{ marginTop: 16 }}>
          Resetting the password for <strong>{email}</strong>.
        </p>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <PasswordInput
          id="newPassword"
          label="New password"
          value={password}
          required
          showStrength
          autoComplete="new-password"
          placeholder="Create a strong password"
          onChange={handlePasswordChange}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          value={confirm}
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
          onChange={handleConfirmChange}
        />

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : "Update password"}
        </button>
      </form>
    </>
  );
}
