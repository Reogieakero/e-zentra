"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useStudents,
  useStudentDetail,
  type StudentsPage,
  type StudentDetail,
} from "@/lib/students";
import { ApiClientError } from "@/lib/api";
import styles from "./students.module.css";

const GRADE_OPTIONS = [
  { value: "all", label: "All Grades" },
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

function initials(first: string, last: string): string {
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}` || "?";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RiskBadge({ tone }: { tone: string | null }) {
  if (!tone || tone === "neutral") return <span className={styles.muted}>No data</span>;
  const badgeTone = tone === "high" ? "danger" : tone === "moderate" ? "warning" : "brand";
  return <Badge tone={badgeTone}>{tone} risk</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "brand" : status === "pending" ? "warning" : "neutral";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge tone={tone}>{label}</Badge>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  danger = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className={`${styles.statCard} ${danger ? styles.statCardDanger : ""}`}>
      <div className={styles.statIconWrap}>
        <Icon className={danger ? styles.statIconDanger : styles.statIcon} />
      </div>
      <div className={styles.statBody}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={`${styles.statNote} ${danger ? styles.statNoteDanger : ""}`}>{note}</div>
      </div>
    </div>
  );
}

function StatGridLoading({ cards }: { cards: number }) {
  return (
    <div className={styles.statGrid}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={`${styles.statCard} ${styles.skeletonCard}`}>
          <div className={`${styles.skeleton} ${styles.skStatIcon}`} />
          <div className={styles.statBody}>
            <div className={`${styles.skeleton} ${styles.skStatLabel}`} />
            <div className={`${styles.skeleton} ${styles.skStatValue}`} />
            <div className={`${styles.skeleton} ${styles.skStatNote}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentDrawer({
  student,
  onClose,
}: {
  student: StudentDetail["data"] | undefined;
  onClose: () => void;
}) {
  const flags = student?.risk
    ? [
        { label: "Academic average", ok: !student.risk.academicRisk, text: student.risk.academicRisk ? "below 75" : "above 75" },
        { label: "Attendance rate", ok: !student.risk.attendanceRisk, text: student.risk.attendanceRisk ? "below 80%" : "above 80%" },
        { label: "Behavioral incidents", ok: !student.risk.behavioralRisk, text: student.risk.behavioralRisk ? "logged concerns" : "0 logged" },
      ]
    : [];

  return (
    <div className={styles.drawerRoot} role="dialog" aria-modal="true">
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Student Information</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close drawer">
            <X className={styles.iconBtnIcon} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          {!student ? (
            <div className={styles.drawerLoading}>
              <div className={`${styles.skeleton} ${styles.skAvatar}`} />
              <div className={`${styles.skeleton} ${styles.skName}`} />
              <div className={`${styles.skeleton} ${styles.skSub}`} />
            </div>
          ) : (
            <>
              <div className={styles.drawerProfile}>
                {student.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.photoUrl} alt={student.fullName} className={styles.drawerAvatar} />
                ) : (
                  <div className={styles.drawerAvatar}>
                    {initials(student.firstName, student.lastName)}
                  </div>
                )}
                <div className={styles.drawerName}>{student.fullName}</div>
                <div className={styles.drawerBadges}>
                  <StatusBadge status={student.accountStatus} />
                  {student.risk && <RiskBadge tone={student.risk.riskLevel} />}
                </div>
              </div>

              <div className={styles.quickStats}>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.attendance != null ? `${student.attendance}%` : "—"}</div>
                  <div className={styles.quickStatLabel}>Attendance</div>
                </div>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.generalAverage != null ? student.generalAverage : "—"}</div>
                  <div className={styles.quickStatLabel}>General Average</div>
                </div>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.anecdotalCount}</div>
                  <div className={styles.quickStatLabel}>Anecdotal{student.anecdotalCount === 1 ? " Entry" : " Entries"}</div>
                </div>
              </div>

              <section className={styles.drawerSection}>
                <div className={styles.sectionLabelRow}>
                  <span className={styles.sectionLabel}>Risk Snapshot</span>
                  {student.risk ? (
                    <span className={`${styles.riskChip} ${styles[`riskChip_${student.risk.riskLevel}`]}`}>
                      {student.risk.riskLevel} · {student.risk.termLabel ?? ""}
                    </span>
                  ) : (
                    <span className={styles.muted}>No assessment</span>
                  )}
                </div>
                <div className={styles.riskPanel}>
                  {flags.length === 0 ? (
                    <span className={styles.muted}>No risk assessment recorded for this student yet.</span>
                  ) : (
                    flags.map((row) => (
                      <div key={row.label} className={styles.riskRow}>
                        <span className={styles.riskRowLabel}>{row.label}</span>
                        <span className={styles.riskRowValue}>{row.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {student.academicRecord.length > 0 && (
                <section className={styles.drawerSection}>
                  <span className={styles.sectionLabel}>Academic Performance</span>
                  {student.academicRecord.map((term) => (
                    <div key={term.termLabel} className={styles.academicGroup}>
                      <div className={styles.academicTermRow}>
                        <span className={styles.academicTerm}>{term.termLabel}</span>
                        <span className={styles.academicAvg}>Average {term.average ?? "—"}</span>
                      </div>
                      <div className={styles.academicList}>
                        {term.grades.slice(0, 5).map((g) => (
                          <div key={g.subjectName} className={styles.subjectRow}>
                            <span className={styles.subjectName}>{g.subjectName}</span>
                            <span className={styles.subjectGrade}>{g.grade}</span>
                          </div>
                        ))}
                        {term.grades.length === 0 && <span className={styles.muted}>No grades posted yet.</span>}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {student.recentAttendance.length > 0 && (
                <section className={styles.drawerSection}>
                  <div className={styles.sectionLabelRow}>
                    <span className={styles.sectionLabel}>Attendance Records</span>
                    <span className={styles.sectionHint}>Last 7 days</span>
                  </div>
                  <div className={styles.attendanceHeader}>
                    <span>Date</span>
                    <span>AM</span>
                    <span>PM</span>
                  </div>
                  <div className={styles.attendanceList}>
                    {student.recentAttendance.map((day) => (
                      <div key={day.date} className={styles.attendanceRow}>
                        <span className={styles.attendanceDate}>{formatDate(day.date)}</span>
                        <span className={`${styles.attendanceSlot} ${day.morning ? styles[`attendance_${day.morning}`] : ""}`}>
                          {day.morning ?? "—"}
                        </span>
                        <span className={`${styles.attendanceSlot} ${day.afternoon ? styles[`attendance_${day.afternoon}`] : ""}`}>
                          {day.afternoon ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className={styles.drawerSection}>
                <span className={styles.sectionLabel}>Personal Information</span>
                <div className={styles.infoList}>
                  <InfoRow label="Student ID" value={student.lrn} />
                  <InfoRow label="Full Name" value={student.fullName} />
                  <InfoRow label="Grade & Section" value={`${student.gradeLabel}${student.sectionName ? ` - ${student.sectionName}` : ""}`} />
                  <InfoRow label="Adviser" value={student.adviserName ?? "—"} />
                  <InfoRow
                    label="Parent/Guardian"
                    value={student.parents.length > 0 ? student.parents.map((p) => p.name).join(", ") : "—"}
                  />
                  <InfoRow label="Contact Number" value={student.phone ?? "—"} />
                  <InfoRow label="Address" value={student.address ?? "—"} />
                  <InfoRow label="Birthdate" value={student.birthdate ? formatDate(student.birthdate) : "—"} />
                </div>
              </section>

              <div className={styles.drawerActions}>
                <button className={styles.drawerActionBtn}>
                  <CalendarCheck2 size={16} className={styles.drawerActionIcon} /> View Attendance
                </button>
                <button className={styles.drawerActionBtn}>
                  <FolderOpen size={16} className={styles.drawerActionIcon} /> View SF10
                </button>
                <button className={styles.drawerActionBtn}>
                  <FileText size={16} className={styles.drawerActionIcon} /> Anecdotal Records
                </button>
                <button className={styles.drawerActionBtn}>
                  <Pencil size={16} className={styles.drawerActionIcon} /> Edit Student
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

function Root({ page, onSelect }: { page: NonNullable<StudentsPage>; onSelect: (id: string) => void }) {
  const students = page.data;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.tableHeadRow}>
            <th className={styles.th}>Student ID</th>
            <th className={styles.th}>Student</th>
            <th className={styles.th}>Grade & Section</th>
            <th className={styles.th}>Gender</th>
            <th className={styles.th}>Contact Number</th>
            <th className={styles.th}>Enrollment Status</th>
            <th className={styles.th}>SF10</th>
            <th className={styles.th}>Attendance</th>
            <th className={styles.th}>Risk Level</th>
            <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
          </tr>
        </thead>
          <tbody className={styles.tableBody}>
            {students.map((s) => (
              <tr key={s.studentId} className={styles.tableRow}>
                <td className={styles.td}>
                  <span className={styles.tdId}>{s.lrn}</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.studentCell}>
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoUrl} alt={s.firstName} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatar}>{initials(s.firstName, s.lastName)}</div>
                    )}
                    <div className={styles.studentCellInfo}>
                      <div className={styles.studentName}>
                        {s.firstName} {s.lastName}
                      </div>
                      <div className={styles.studentLrn}>{s.lrn}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.tdText}>
                    {s.gradeLabel}
                    {s.sectionName ? ` - ${s.sectionName}` : ""}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={styles.tdText}>{s.sex.charAt(0).toUpperCase() + s.sex.slice(1)}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.tdText}>{s.phone ?? "—"}</span>
                </td>
                <td className={styles.td}>
                  <StatusBadge status={s.accountStatus} />
                </td>
                <td className={styles.td}>
                  <Badge tone="neutral">{capitalize(s.sf10)}</Badge>
                </td>
                <td className={styles.td}>
                  <span className={styles.attendanceValue}>{s.attendance != null ? `${s.attendance}%` : "—"}</span>
                </td>
                <td className={styles.td}>
                  <RiskBadge tone={s.riskLevel ?? "neutral"} />
                </td>
                <td className={`${styles.td} ${styles.tdRight}`}>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => onSelect(s.studentId)}
                      title="View"
                      aria-label={`View ${s.firstName} ${s.lastName}`}
                    >
                      <Eye size={15} />
                    </button>
                    <button className={styles.iconBtn} title="Edit" aria-label={`Edit ${s.firstName} ${s.lastName}`}>
                      <Pencil size={15} />
                    </button>
                    <button className={styles.iconBtn} title="More" aria-label={`More actions for ${s.firstName} ${s.lastName}`}>
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    grade: "all",
    sectionId: "",
    schoolYearId: "",
    status: "all",
  });
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setQuery((q) => ({ ...q, search }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, refresh } = useStudents({
    page: query.page,
    pageSize: query.pageSize,
    search: debounced,
    grade: query.grade === "all" ? undefined : query.grade,
    sectionId: query.sectionId || undefined,
    schoolYearId: query.schoolYearId || undefined,
    status: query.status === "all" ? undefined : query.status,
  });

  const detail = useStudentDetail(selectedId);
  const selectedDetail: StudentDetail["data"] | undefined = detail.data?.data ?? undefined;

  const setFilter = (patch: Partial<typeof query>) => setQuery((q) => ({ ...q, ...patch, page: 1 }));

  const sections = data?.filters.sections.filter(
    (s) => (query.grade === "all" || s.gradeLevel === query.grade) && (!query.schoolYearId || s.schoolYearId === query.schoolYearId)
  ) ?? [];

  const stats = data?.stats;

  const totalCount = data?.total ?? 0;
  const pageSize = query.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (query.page - 1) * pageSize + 1;
  const to = Math.min(query.page * pageSize, totalCount);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Student ID", "Name", "Grade & Section", "Gender", "Contact Number", "Status", "Attendance %", "Risk Level", "SF10", "Last Updated"],
      ...data.data.map((s) => [
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
  };

  if (error && !data) {
    const message = error instanceof ApiClientError ? error.message : "Could not load student records. Please try again.";
    return (
      <div className={styles.errorCard}>
        <AlertTriangle className={styles.errorIcon} />
        <p className={styles.errorText}>{message}</p>
        <button className={styles.retryButton} onClick={() => refresh()}>
          <RefreshCw size={14} className={styles.retryIcon} /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeading}>
          <h1 className={styles.pageTitle}>Students</h1>
          <p className={styles.pageSubtitle}>Manage student information, enrollment records, and academic documents.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportButton} onClick={exportCsv} disabled={!data}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {!data ? (
        <StatGridLoading cards={5} />
      ) : (
        <div className={styles.statGrid}>
          <StatCard
            icon={Users}
            label="Total Students"
            value={stats?.total.toLocaleString() ?? "0"}
            note="All enrolled records"
          />
          <StatCard
            icon={UserCheck}
            label="Active Students"
            value={stats?.active.toLocaleString() ?? "0"}
            note="Currently enrolled"
          />
          <StatCard
            icon={UserPlus}
            label="New Enrollees"
            value={stats?.newEnrollees.toLocaleString() ?? "0"}
            note="Active school year"
          />
          <StatCard
            icon={GraduationCap}
            label="Graduated Students"
            value={stats?.graduated.toLocaleString() ?? "0"}
            note="All-time total"
          />
          <StatCard
            icon={AlertTriangle}
            label="At-Risk Students"
            value={stats?.atRiskTotal.toLocaleString() ?? "0"}
            note={`${stats?.atRiskHigh ?? 0} high · ${stats?.atRiskModerate ?? 0} moderate`}
            danger
          />
        </div>
      )}

      {data ? (
      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <h2 className={styles.cardTitle}>Student Records</h2>
            <p className={styles.cardSubtitle}>Manage all enrolled students.</p>
          </div>
          <div className={styles.toolbarFilters}>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} aria-hidden />
              <input
                className={styles.searchInput}
                placeholder="Search student name or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <CustomSelect
              value={query.grade}
              options={GRADE_OPTIONS}
              onChange={(v) => setFilter({ grade: v, sectionId: v === "all" ? "" : query.sectionId })}
              size="sm"
              showCheck={false}
              className={styles.filterSelect}
            />
            <CustomSelect
              value={query.sectionId}
              options={[
                { value: "", label: "Section: All" },
                ...sections.map((s) => ({ value: s.id, label: s.sectionName })),
              ]}
              onChange={(v) => setFilter({ sectionId: v })}
              size="sm"
              showCheck={false}
              className={styles.filterSelect}
            />
            <CustomSelect
              value={query.schoolYearId}
              options={[
                { value: "", label: "Year: All" },
                ...(data.filters.years.map((y) => ({ value: y.id, label: y.yearLabel })) ?? []),
              ]}
              onChange={(v) => setFilter({ schoolYearId: v })}
              size="sm"
              showCheck={false}
              className={styles.filterSelect}
            />
            <CustomSelect
              value={query.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setFilter({ status: v })}
              size="sm"
              showCheck={false}
              className={styles.filterSelect}
            />
          </div>
        </div>

        {data.data.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Users size={26} />
            </div>
            <p className={styles.emptyTitle}>No students found.</p>
            <p className={styles.emptyText}>Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <Root page={data} onSelect={setSelectedId} />
        )}

        {data.data.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Showing {from}–{to} of {totalCount} students
            </span>
            <div className={styles.paginationControls}>
              <button
                className={styles.pageArrow}
                disabled={query.page <= 1}
                onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`${styles.pageNum} ${pageNum === query.page ? styles.pageNumActive : ""}`}
                    onClick={() => setQuery((q) => ({ ...q, page: pageNum }))}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className={styles.pageEllipsis}>…</span>}
              <button
                className={styles.paginationArrow}
                disabled={query.page >= totalPages}
                onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.skeleton} style={{ width: 160, height: 14 }} />
          </div>
          <div className={styles.skeleton} style={{ height: 320, borderRadius: 0 }} />
        </div>
      )}

      {selectedId && (
        <StudentDrawer student={selectedDetail} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}