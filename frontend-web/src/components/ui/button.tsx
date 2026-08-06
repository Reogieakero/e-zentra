import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light" | "outlineLight";
type ButtonSize = "sm" | "md";

type ButtonProps = {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled" | "onClick">;

export function Button(props: ButtonProps) {
  const { href, variant = "primary", size = "md", className, children, onClick, disabled, type, ...rest } = props;
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");

  if (typeof href === "string") {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  );
}