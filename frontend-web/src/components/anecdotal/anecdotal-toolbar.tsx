import { CustomSelect } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { categoryList, type AnecdotalCategory } from "@/lib/anecdotal";
import styles from "./anecdotal-toolbar.module.css";

interface AnecdotalToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
}

const categoryOptions = [
  { value: "all", label: "All Categories" },
  ...categoryList().map((c: AnecdotalCategory) => ({ value: c, label: c })),
];

export default function AnecdotalToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: AnecdotalToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search records…"
        aria-label="Search anecdotal records"
        className={styles.search}
      />
      <CustomSelect
        value={category}
        options={categoryOptions}
        onChange={onCategoryChange}
        size="sm"
        showCheck={false}
        className={styles.filter}
      />
    </div>
  );
}
