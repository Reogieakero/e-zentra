import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Student Sign In — Zentra",
  description: "Sign in to your Zentra student account to view grades, attendance, and risk alerts.",
};

export default function StudentLoginPage() {
  return (
    <AuthShell
      title="Welcome back, student"
      subtitle="Sign in to view your grades, attendance, and any risk alerts on your record."
      footNote={
        <>
          New to Zentra?{" "}
          <a href="/signup" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Create a student account
          </a>
        </>
      }
    >
      <LoginForm portal="student" endpoint="/auth/login/student" />
    </AuthShell>
  );
}
