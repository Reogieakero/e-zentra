"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./tooltip.module.css";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => setPos(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [pos]);

  const show = () => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;
    const rect = wrap.getBoundingClientRect();
    const tipWidth = tip.offsetWidth || 100;
    const tipHeight = tip.offsetHeight || 40;
    const gap = 8;
    const left = Math.max(gap, Math.min(rect.left + rect.width / 2 - tipWidth / 2, window.innerWidth - tipWidth - gap));
    const below = rect.top - tipHeight - gap < gap;
    const top = below ? rect.bottom + gap : rect.top - tipHeight - gap;
    setPos({ top, left, below });
  };

  const hide = () => setPos(null);

  return (
    <span
      ref={wrapRef}
      className={styles.tooltipWrap}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {mounted
        ? createPortal(
            <span
              ref={tipRef}
              className={`${styles.tooltip} ${pos?.below ? styles.tooltipBelow : ""}`}
              style={pos ? { top: pos.top, left: pos.left, opacity: 1 } : undefined}
              role="tooltip"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}