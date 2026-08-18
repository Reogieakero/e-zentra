"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, getTokens, getUser } from "@/lib/auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useTheme, type Theme } from "@/components/theme-provider";
import { SearchInput } from "@/components/ui/search-input";
import { Sf10Breadcrumb } from "./sf10-breadcrumb";
import styles from "./topbar.module.css";

const pageLabels: Record<string, string> = {
  "/principal/dashboard": "Dashboard",
  "/principal/students": "Students",
  "/principal/sf10": "SF10 Records",
  "/principal/attendance": "Attendance",
  "/principal/reports/attendance": "Attendance Report",
  "/principal/reports/attendance/needs-attention": "Needs Attention",
  "/principal/backup": "Data Backup",
};

function logoutPath(role?: string): string {
  switch (role) {
    case "student":
      return "/login/student";
    case "parent":
      return "/login/parent";
    case "principal":
    case "teacher":
    case "registrar":
    case "record_keeper":
    case "adm_coordinator":
    case "guidance_counselor":
    case "nurse":
      return "/login/staff";
    default:
      return "/login";
  }
}

const roleLabels: Record<string, string> = {
  principal: "Principal",
  teacher: "Teacher",
  registrar: "Registrar",
  record_keeper: "Record Keeper",
  adm_coordinator: "ADM Coordinator",
  guidance_counselor: "Guidance Counselor",
  nurse: "Nurse",
  student: "Student",
  parent: "Parent",
};

function currentPageLabel(pathname: string): string {
  const matches = Object.keys(pageLabels)
    .filter((href) => href !== "#" && pathname.startsWith(href))
    .sort((a, b) => b.length - a.length);
  return matches.length > 0 ? pageLabels[matches[0]] : "Dashboard";
}

function gradeLabel(value: string): string {
  return value.startsWith("grade_") ? `Grade ${value.replace("grade_", "")}` : value;
}

function crumbTail(pathname: string): string[] {
  if (!pathname.startsWith("/principal/sf10")) return [];
  const rest = pathname.replace("/principal/sf10", "").split("/").filter(Boolean);
  return rest.map((seg) => gradeLabel(decodeURIComponent(seg)));
}

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);
  const user = getUser();

  const handleLogout = () => {
    setMenuOpen(false);
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      void api("/auth/logout", { method: "POST", body: { refreshToken: tokens.refreshToken } }).catch(() => undefined);
    }
    clearSession();
    router.replace(logoutPath(user?.role));
  };

  const setThemeMode = (mode: Theme) => {
    setTheme(mode);
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.crumb}>{roleLabels[user?.role ?? ""] ?? "Principal"}</span>
        <span className={styles.separator}>/</span>
        {pathname.startsWith("/principal/sf10") ? (
          <Sf10Breadcrumb pathname={pathname} />
        ) : (
          <>
            {crumbTail(pathname).length === 0 ? (
              <span className={styles.crumbCurrent}>{currentPageLabel(pathname)}</span>
            ) : (
              <>
                <span className={styles.crumb}>{currentPageLabel(pathname)}</span>
                {crumbTail(pathname).map((label, i, arr) => (
                  <span key={label} className={styles.crumbGroup}>
                    <span className={styles.separator}>/</span>
                    {i === arr.length - 1 ? (
                      <span className={styles.crumbCurrent}>{label}</span>
                    ) : (
                      <span className={styles.crumb}>{label}</span>
                    )}
                  </span>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.right}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search..."
          aria-label="Search"
          className={styles.search}
        />

        <button className={styles.iconBtn} aria-label="Notifications">
          <Bell className={styles.icon} />
          <span className={styles.dot} />
        </button>

        <div className={styles.divider} />

        <div className={styles.profile} ref={menuRef}>
          <button className={styles.avatarBtn} onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Account menu">
            <div className={styles.avatar}>
              <User className={styles.avatarIcon} />
            </div>
            <ChevronDown className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`} />
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>Account</span>
                <span className={styles.menuSub}>{user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Signed in"}</span>
              </div>

              <div className={styles.menuSection}>
                <span className={styles.menuLabel}>System preferences</span>
                <div className={styles.themeRow}>
                  <span className={styles.themeLabel}>
                    <Moon className={styles.themeIcon} />
                    Theme
                  </span>
                  <div className={styles.optionGroup}>
                    <button
                      type="button"
                      className={`${styles.optionBtn} ${theme === "light" ? styles.optionActive : ""}`}
                      onClick={() => setThemeMode("light")}
                    >
                      <Sun className={styles.optionIcon} />
                      Light
                    </button>
                    <button
                      type="button"
                      className={`${styles.optionBtn} ${theme === "dark" ? styles.optionActive : ""}`}
                      onClick={() => setThemeMode("dark")}
                    >
                      <Moon className={styles.optionIcon} />
                      Dark
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.menuDivider} />

              <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                <LogOut className={styles.logoutIcon} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}