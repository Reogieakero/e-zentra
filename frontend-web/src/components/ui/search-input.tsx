import { Search } from "lucide-react";
import styles from "./search-input.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className, "aria-label": ariaLabel }: SearchInputProps) {
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <Search size={15} className={styles.icon} aria-hidden />
      <input
        className={styles.input}
        placeholder={placeholder}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}