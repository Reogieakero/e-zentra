"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, getTokens, getUser } from "@/lib/auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useTheme, type Theme } from "@/components/theme-provider";
import { SearchInput } from "@/components/ui/search-input";
import styles from "./topbar.module.css";

interface TopbarProps {
  onMenuClick: () => void;
}

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

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
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
        <button onClick={onMenuClick} className={styles.iconBtn} aria-label="Open sidebar">
          <Menu className={styles.icon} />
        </button>
        <span className={styles.crumb}>School Admin</span>
        <span className={styles.separator}>/</span>
        <span className={styles.crumbCurrent}>Dashboard</span>
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