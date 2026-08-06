"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
import styles from "./shell.module.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.content}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
