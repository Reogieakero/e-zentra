import Link from "next/link";
import { GraduationCap, Mail, MapPin, ThumbsUp, Globe } from "lucide-react";
import styles from "./footer.module.css";

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#workflow", label: "How It Works" },
  { href: "#security", label: "Security" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Sign In" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Request a Demo" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div className={styles.brandWrap}>
              <div className={styles.mark}>
                <GraduationCap size={14} />
              </div>
              <span className={styles.brand}>Zentra</span>
            </div>
            <p className={styles.brandDesc}>
              A DepEd-aligned student information and ADM management system for Junior and Senior
              High School — one record per learner, scoped to every role that needs it.
            </p>
            <div className={styles.social}>
              <a href="#" aria-label="Facebook" className={styles.socialBtn}>
                <ThumbsUp size={14} />
              </a>
              <a href="#" aria-label="Email" className={styles.socialBtn}>
                <Mail size={14} />
              </a>
              <a href="#" aria-label="Website" className={styles.socialBtn}>
                <Globe size={14} />
              </a>
            </div>
          </div>

          <FooterCol title="Product" links={PRODUCT_LINKS} />
          <FooterCol title="Account" links={ACCOUNT_LINKS} />

          <div>
            <div className={styles.colTitle}>Contact</div>
            <ul className={styles.colList}>
              <li className={styles.contactItem}>
                <Mail size={14} className={styles.contactIcon} />
                hello@zentra.app
              </li>
              <li className={styles.contactItem}>
                <MapPin size={14} className={styles.contactIcon} />
                Bulacan, Philippines
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            &copy; 2026 Zentra. All rights reserved.
          </span>
          <span className={styles.tagline}>Built for Philippine public schools</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div className={styles.colTitle}>{title}</div>
      <ul className={styles.colList}>
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className={styles.colLink}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}