import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import styles from "./topbar.module.css";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
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
        <div className={styles.search}>
          <Search className={styles.searchIcon} />
          <input type="text" placeholder="Search..." className={styles.searchInput} />
        </div>

        <button className={styles.iconBtn} aria-label="Notifications">
          <Bell className={styles.icon} />
          <span className={styles.dot} />
        </button>

        <div className={styles.divider} />

        <button className={styles.avatarBtn}>
          <div className={styles.avatar}>EV</div>
          <ChevronDown className={styles.chevron} />
        </button>
      </div>
    </header>
  );
}