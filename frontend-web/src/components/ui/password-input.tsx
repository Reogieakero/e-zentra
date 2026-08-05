"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/password";
import styles from "./password-input.module.css";

interface PasswordInputProps {
  id: string;
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  required?: boolean;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  showStrength,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : null;
  const filledSegments = strength ? Math.round((strength.score / 5) * 4) : 0;

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className={styles.wrap}>
        <Lock size={16} className={styles.icon} aria-hidden />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && value.length > 0 && strength ? (
        <div className={styles.strength}>
          <div className={styles.meterRow}>
            <div className={styles.meter} role="meter" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={5}>
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className={`${styles.segment} ${i < filledSegments ? styles.segmentFilled : ""}`}
                  style={i < filledSegments ? { background: strength.color } : undefined}
                />
              ))}
            </div>
            {strength.label ? (
              <span className={styles.strengthLabel} style={{ color: strength.color }}>
                {strength.label}
              </span>
            ) : null}
          </div>
          <ul className={styles.ruleList}>
            {strength.rules.map((rule) => (
              <li key={rule.key} className={`${styles.rule} ${rule.met ? styles.ruleMet : ""}`}>
                {rule.met ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                <span>{rule.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}