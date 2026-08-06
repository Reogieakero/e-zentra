"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useClickOutside } from "@/lib/use-click-outside";
import styles from "./select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  label?: React.ReactNode;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "default" | "sm";
}

export function CustomSelect({ id, label, value, options, placeholder = "Select…", onChange, className, size = "default" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const selected = options.find((o) => o.value === value);

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? styles.value : styles.placeholder}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className={styles.menu} role="listbox" tabIndex={-1}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {active ? <Check size={14} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}