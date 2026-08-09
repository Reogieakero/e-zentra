"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useSectionRoster, useStudentAttendanceTrend } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { CloseButton } from "@/components/ui/close-button";
import { initials } from "@/lib/students-format";
import styles from "./attendance-student-modal.module.css";

const STATUS_ITEMS = [
  { key: "present", name: "Present", color: "#16a34a" },
  { key: "late", name: "Late", color: "#f59e0b" },
  { key: "absent", name: "Absent", color: "#ef4444" },
  { key: "excused", name: "Excused", color: "#3b82f6" },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
] as const;

type CountKey = (typeof STATUS_ITEMS)[number]["key"];

export function AttendanceStudentModal({
  sectionId,
  studentId,
  onClose,
}: {
  sectionId: string;
  studentId: string;
  onClose: () => void;
}) {
  const { data: roster } = useSectionRoster(sectionId);
  const { data: trend, isLoading } = useStudentAttendanceTrend(studentId);

  const student = roster.find((s) => s.studentId === studentId);

  const totals = trend.reduce(
    (acc, p) => {
      acc.present += p.present;
      acc.late += p.late;
      acc.absent += p.absent;
      acc.excused += p.excused;
      acc.notLogged += p.notLogged;
      acc.logged += p.logged;
      return acc;
    },
    { present: 0, late: 0, absent: 0, excused: 0, notLogged: 0, logged: 0 }
  );

  const denominator = totals.present + totals.late + totals.absent + totals.excused + totals.notLogged;
  const rate = denominator > 0 ? Math.round((totals.present / denominator) * 1000) / 10 : 0;
  const atRisk = student?.rate != null && student.rate < 80;

  const donutData = STATUS_ITEMS.map(({ key, name, color }) => ({ name, color, value: totals[key as CountKey] })).filter(
    (d) => d.value > 0
  );
  const shownData = donutData.length > 0 ? donutData : [{ name: "No records", color: "rgba(255,255,255,0.06)", value: 1 }];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Student attendance summary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrap}>
            {student ? (
              <div className={styles.studentCell}>
                <div className={styles.avatar}>{initials(student.firstName, student.lastName)}</div>
                <div>
                  <h2 className={styles.modalTitle}>
                    {student.firstName} {student.lastName}
                  </h2>
                  <p className={styles.modalSub}>
                    {student.gradeLabel}
                    {student.sectionName ? ` · ${student.sectionName}` : ""} · LRN {student.lrn}
                  </p>
                  {atRisk && (
                    <div className={styles.riskRow}>
                      <Badge tone={student!.rate! < 70 ? "danger" : "warning"}>Attendance Risk</Badge>
                      <span className={styles.riskNote}>
                        {student!.rate}% present rate (below 80% target)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <h2 className={styles.modalTitle}>Attendance Summary</h2>
            )}
          </div>
          <CloseButton onClose={onClose} />
        </div>

        <div className={styles.modalBody}>
          {isLoading ? (
            <div className={styles.skChart}>
              <div className={`${styles.skeleton} ${styles.skDonut}`} />
              <div className={`${styles.skeleton} ${styles.skLegendRow}`} />
              <div className={`${styles.skeleton} ${styles.skLegendRow}`} />
            </div>
          ) : trend.length === 0 ? (
            <p className={styles.empty}>No attendance records for this student yet.</p>
          ) : (
            <>
              <div className={styles.donutArea}>
                <div className={styles.donutContainer}>
                  <ResponsiveContainer key={`donut-${studentId}`} width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shownData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="70%"
                        outerRadius="100%"
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {shownData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.donutCenter}>
                  <span className={styles.donutCenterValue}>{rate.toFixed(1)}%</span>
                  <span className={styles.donutCenterLabel}>present</span>
                </div>
              </div>

              <div className={styles.legendList}>
                {STATUS_ITEMS.map(({ key, name, color }) => {
                  const value = totals[key as CountKey];
                  const pct = denominator > 0 ? Math.round((value / denominator) * 1000) / 10 : 0;
                  return (
                    <div key={key} className={styles.legendRow}>
                      <span className={styles.legendRowLabel}>
                        <span className={styles.legendRowDot} style={{ background: color }} />
                        {name}
                      </span>
                      <span className={styles.legendRowValue}>
                        {value.toLocaleString()}
                        <span className={styles.legendRowPct}> · {pct.toFixed(1)}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.chartFooter}>
                <span>Year-to-date attendance breakdown</span>
                <span className={styles.targetNote}>{trend.length} months tracked</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}