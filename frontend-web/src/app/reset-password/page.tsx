import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Zentra",
  description: "Choose a new password for your Zentra account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick a strong password for your Zentra account. You'll be signed out of your other sessions."
      footNote={
        <>
          Remembered it?{" "}
          <a href="/login" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Sign in
          </a>
        </>
      }
    >
      <Suspense fallback={<div aria-hidden />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
