"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { WEEKDAY_ABBREV } from "@/constants/dates";
import styles from "./date-picker.module.css";

interface DatePickerProps {
  id?: string;
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

const WEEKDAYS = WEEKDAY_ABBREV;

function toISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function DatePicker({ id, label, value, onChange, placeholder = "Select date", min, max, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? new Date(`${value}T00:00:00`) : startOfMonth(new Date())));
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const minDate = min ? new Date(`${min}T00:00:00`) : null;
  const maxDate = max ? new Date(`${max}T00:00:00`) : null;
  const todayISO = useMemo(() => toISO(new Date()), []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = startOfMonth(view).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canPrev = !minDate || startOfMonth(view) > startOfMonth(minDate);
  const canNext = !maxDate || startOfMonth(view) < startOfMonth(maxDate);

  function prevMonth() {
    if (!canPrev) return;
    setView(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    if (!canNext) return;
    setView(new Date(year, month + 1, 1));
  }
  function selectDay(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(<span key={`blank-${i}`} className={styles.blank} aria-hidden />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(`${iso}T00:00:00`);
    const disabled = !!((minDate && date < minDate) || (maxDate && date > maxDate));
    const selected = iso === value;
    const isToday = iso === todayISO;
    cells.push(
      <button
        key={iso}
        type="button"
        disabled={disabled}
        className={`${styles.day} ${selected ? styles.daySelected : ""} ${isToday && !selected ? styles.dayToday : ""}`}
        onClick={() => selectDay(iso)}
      >
        {day}
      </button>
    );
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
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? styles.value : styles.placeholder}>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarDays size={16} className={styles.calIcon} aria-hidden />
      </button>
      {open ? (
        <div className={styles.popover} role="dialog" aria-label={typeof label === "string" ? label : "Date picker"}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Previous month"
              disabled={!canPrev}
              onClick={prevMonth}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.title}>{monthLabel}</span>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Next month"
              disabled={!canNext}
              onClick={nextMonth}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.week}>
            {WEEKDAYS.map((d) => (
              <span key={d} className={styles.weekday}>
                {d}
              </span>
            ))}
          </div>
          <div className={styles.grid} role="grid">
            {cells}
          </div>
        </div>
      ) : null}
    </div>
  );
}