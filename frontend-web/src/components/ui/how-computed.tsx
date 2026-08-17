"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./how-computed.module.css";

export type HowComputedLine =
  | { type: "title"; text: string }
  | { type: "divider" }
  | { type: "row"; label: string; value: string };

interface HowComputedProps {
  computationText: string;
  lines: HowComputedLine[];
  label?: string;
  className?: string;
}

export function HowComputed({ computationText, lines, label = "How computed", className }: HowComputedProps) {
  const [show, setShow] = useState(false);
  const [typed, setTyped] = useState("");
  const [lineCount, setLineCount] = useState(0);
  const textRef = useRef(computationText);
  const linesRef = useRef(lines);

  useEffect(() => {
    textRef.current = computationText;
    linesRef.current = lines;
  });

  useEffect(() => {
    if (!show) {
      setTyped("");
      setLineCount(0);
      return;
    }
    setTyped("");
    setLineCount(0);
    let i = 0;
    let reveal: ReturnType<typeof setInterval> | undefined;
    const text = textRef.current;
    const totalLines = linesRef.current.length;
    const type = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(type);
        reveal = setInterval(() => {
          setLineCount((c) => {
            if (c >= totalLines) {
              if (reveal) clearInterval(reveal);
              return c;
            }
            return c + 1;
          });
        }, 420);
      }
    }, 14);
    const timeout = setTimeout(() => setShow(false), 10000);
    return () => {
      clearInterval(type);
      if (reveal) clearInterval(reveal);
      clearTimeout(timeout);
    };
  }, [show]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setShow((v) => !v)} className={`${styles.button} ${className ?? ""}`}>
        <Info className={styles.buttonIcon} />
        {label}
      </Button>

      {show && (
        <div className={styles.card} role="dialog" aria-label="How the average is computed">
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Info className={styles.cardIcon} />
              How it&apos;s computed
            </span>
            <button type="button" className={styles.close} onClick={() => setShow(false)} aria-label="Close">
              <X size={14} />
            </button>
          </div>
          <p className={styles.text}>
            {typed}
            <span className={styles.caret} />
          </p>
          <div className={styles.lines}>
            {lines.slice(0, lineCount).map((line, i) =>
              line.type === "title" ? (
                <p key={i} className={styles.lineTitle}>
                  {line.text}
                </p>
              ) : line.type === "divider" ? (
                <div key={i} className={styles.lineDivider} />
              ) : (
                <div key={i} className={styles.lineRow}>
                  <span className={styles.lineLabel}>{line.label}</span>
                  <span className={styles.lineValue}>{line.value}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}