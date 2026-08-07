import type { StudentRow } from "@/lib/students";
import { formatDate } from "@/lib/students-format";

export function exportStudentsCsv(students: StudentRow[]): void {
  const rows = [
    ["Student ID", "Name", "Grade & Section", "Gender", "Contact Number", "Status", "Attendance %", "Risk Level", "SF10", "Last Updated"],
    ...students.map((s) => [
      s.lrn,
      `${s.firstName} ${s.lastName}`,
      `${s.gradeLabel}${s.sectionName ? ` - ${s.sectionName}` : ""}`,
      s.sex,
      s.phone ?? "",
      s.accountStatus,
      s.attendance != null ? String(s.attendance) : "",
      s.riskLevel ?? "",
      s.sf10,
      s.lastUpdated ? formatDate(s.lastUpdated) : "",
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "students.csv";
  a.click();
  URL.revokeObjectURL(url);
}