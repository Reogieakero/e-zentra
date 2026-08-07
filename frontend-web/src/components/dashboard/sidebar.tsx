import {
  BookOpen,
  BarChart3,
  CalendarCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import styles from "./sidebar.module.css";

const mainNav = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/principal/dashboard", active: true },
  { key: "students", label: "Students", icon: Users, href: "#" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck2, href: "#" },
  { key: "sf10", label: "SF10 Records", icon: FileText, href: "#" },
  { key: "anecdotal", label: "Anecdotal", icon: FileText, href: "#" },
  { key: "adm", label: "ADM", icon: BookOpen, href: "#" },
];

const systemNav = [
  { key: "reports", label: "Reports", icon: BarChart3, href: "/principal/reports/attendance" },
  { key: "settings", label: "Settings", icon: Settings, href: "#" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`} onClick={onClose} />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandInner}>
            <div className={styles.brandLogo}>
              <GraduationCap className={styles.brandLogoIcon} />
            </div>
            <span className={styles.brandName}>Zentra</span>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close sidebar">
            <X className={styles.closeIcon} />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.groupLabel}>Main</div>
          {mainNav.map((item) => (
            <Link key={item.key} href={item.href} className={`${styles.navItem} ${item.active ? styles.navActive : ""}`}>
              <item.icon className={styles.navIcon} />
              <span>{item.label}</span>
            </Link>
          ))}

          <div className={styles.groupLabel}>System</div>
          {systemNav.map((item) => (
            <Link key={item.key} href={item.href} className={styles.navItem}>
              <item.icon className={styles.navIcon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.profile}>
            <div className={styles.avatar}>
              <User className={styles.avatarIcon} />
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>Elena Vance</span>
              <span className={styles.profileRole}>Administrator</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}