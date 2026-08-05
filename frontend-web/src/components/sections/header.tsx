import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./header.module.css";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#workflow", label: "How It Works" },
  { href: "#security", label: "Security" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`${styles.inner} ${styles.container}`}>
        <div className={styles.brandWrap}>
          <div className={styles.mark}>
            <GraduationCap size={17} />
          </div>
          <span className={styles.brand}>Zentra</span>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/login" className={styles.signIn}>
            Sign In
          </Link>
          <Button href="#contact" variant="primary" size="md">
            Request a Demo
          </Button>
        </div>
      </div>
    </header>
  );
}