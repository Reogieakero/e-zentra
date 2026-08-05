import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Presentation, Users } from "lucide-react";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign In — Zentra",
  description: "Choose how you sign in to Zentra: as a student, parent, or school staff.",
};

const PORTALS = [
  { href: "/login/student", icon: GraduationCap, label: "Student" },
  { href: "/login/parent", icon: Users, label: "Parent" },
  { href: "/login/staff", icon: Presentation, label: "Staff" },
];

export default function LoginIndexPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandWrap}>
          <span className={styles.mark}>
            <GraduationCap size={16} />
          </span>
          <span className={styles.brand}>Zentra</span>
        </div>

        <h1 className={styles.title}>How do you want to sign in?</h1>
        <p className={styles.subtitle}>Choose the portal that matches your role at school.</p>

        <div className={styles.grid}>
          {PORTALS.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className={styles.roleBtn}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <p className={styles.footNote}>
          New to Zentra?{" "}
          <Link href="/signup" className={styles.link}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}