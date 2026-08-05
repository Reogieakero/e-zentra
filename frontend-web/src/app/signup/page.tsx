import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupMethods } from "@/components/auth/signup-methods";

export const metadata: Metadata = {
  title: "Create an Account — Zentra",
  description: "Register as a teacher, student, or parent on Zentra. Accounts are reviewed by school administrators.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Register as a teacher, student, or parent. A school administrator will review and approve your account."
      footNote={
        <>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Sign in
          </a>
        </>
      }
    >
      <Suspense fallback={<div aria-hidden />}>
        <SignupMethods />
      </Suspense>
    </AuthShell>
  );
}