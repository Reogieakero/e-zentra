"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { MONTHS } from "@/constants/dates";
import styles from "./month-picker.module.css";

interface MonthPickerProps {
  id?: string;
  label?: React.ReactNode;

  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: "default" | "sm";
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const [y, m] = value.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MonthPicker({ id, label, value, onChange, placeholder = "All time", className, size = "default" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, 1);
    }
    return new Date();
  });
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const year = view.getFullYear();

  function selectMonth(monthIndex: number) {
    onChange(`${year}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  }
  function reset() {
    onChange("");
    setOpen(false);
  }

  return (
    <div className={`${styles.field} ${className ?? ""}`} ref={ref}>
      {label ? (
        <label className={styles.label} id={id ? `${id}-label` : undefined}>
          {label}
        </label>
      ) : null}
      <button
        type="button"
        className={`${styles.trigger} ${size === "sm" ? styles.triggerSm : ""} ${open ? styles.triggerOpen : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? styles.value : styles.placeholder}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarDays size={16} className={styles.calIcon} aria-hidden />
      </button>
      {open ? (
        <div className={styles.popover} role="dialog" aria-label={typeof label === "string" ? label : "Month picker"}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Previous year"
              onClick={() => setView(new Date(year - 1, view.getMonth(), 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.title}>{year}</span>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Next year"
              onClick={() => setView(new Date(year + 1, view.getMonth(), 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.grid} role="grid">
            {MONTHS.map((monthName, i) => {
              const iso = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = iso === value;
              const isCurrent = iso === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`${styles.month} ${selected ? styles.monthSelected : ""} ${
                    isCurrent && !selected ? styles.monthCurrent : ""
                  }`}
                  onClick={() => selectMonth(i)}
                >
                  {mNameShort(monthName)}
                </button>
              );
            })}
          </div>
          <button type="button" className={styles.reset} onClick={reset}>
            <RotateCcw size={12} aria-hidden />
            All time
          </button>
        </div>
      ) : null}
    </div>
  );
}

function mNameShort(name: string): string {
  return name.slice(0, 3).toUpperCase();
}