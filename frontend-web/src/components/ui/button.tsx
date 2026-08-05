import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light" | "outlineLight";
type ButtonSize = "sm" | "md";

interface ButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ href, variant = "primary", size = "md", children, className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}