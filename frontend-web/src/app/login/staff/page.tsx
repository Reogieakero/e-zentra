import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Staff Sign In — Zentra",
  description: "Sign in to your Zentra staff account to manage records, attendance, grades, and ADM cases.",
};

export default function StaffLoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage records, attendance, grades, and ADM cases for your school."
      footNote={
        <>
          Teacher?{" "}
          <a href="/signup" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
            Create a teacher account
          </a>
          &nbsp;· Registrar, Record Keeper, Nurse, ADM Coordinator, Guidance Counselor, or Principal?
          Contact your school administrator for access.
        </>
      }
    >
      <LoginForm portal="staff" endpoint="/auth/login/staff" />
    </AuthShell>
  );
}
