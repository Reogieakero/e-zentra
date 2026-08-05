import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — Zentra",
  description: "Request a link to reset your Zentra password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email linked to your account and we'll send you a link to choose a new password."
      footNote={
        <>
          Remembered it?{" "}
          <a href="/login" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Sign in
          </a>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
