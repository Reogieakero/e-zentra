export function initials(first: string, last: string): string {
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}` || "?";
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function sessionLabel(status: string): string {
  const label = capitalize(status);
  return status === "present" ? `Class Time (${label})` : label;
}