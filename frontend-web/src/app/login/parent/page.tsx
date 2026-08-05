import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Parent Sign In — Zentra",
  description: "Sign in to your Zentra parent account to follow your child's attendance, grades, and well-being.",
};

export default function ParentLoginPage() {
  return (
    <AuthShell
      title="Welcome back, parent"
      subtitle="Sign in to follow your child's attendance, grades, and well-being at school."
      footNote={
        <>
          New to Zentra?{" "}
          <a href="/signup" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Create a parent account
          </a>
        </>
      }
    >
      <LoginForm portal="parent" endpoint="/auth/login/parent" />
    </AuthShell>
  );
}
