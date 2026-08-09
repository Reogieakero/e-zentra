"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
import styles from "./shell.module.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.content}>
        <Topbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
