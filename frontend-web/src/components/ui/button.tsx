import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light" | "outlineLight";
type ButtonSize = "sm" | "md";

type ButtonProps = {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  loading?: boolean;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled" | "onClick">;

export function Button(props: ButtonProps) {
  const { href, variant = "primary", size = "md", className, loading = false, children, onClick, disabled, type, ...rest } = props;
  const classes = [styles.button, styles[variant], styles[size], loading ? styles.loading : "", className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <Loader2 className={styles.spinner} size={size === "sm" ? 12 : 14} /> : null}
      {children}
    </>
  );

  if (typeof href === "string") {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled || loading} className={classes} {...rest}>
      {content}
    </button>
  );
}