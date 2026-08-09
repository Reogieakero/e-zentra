# Frontend — Principal's Reports (Attendance + Needs Attention)

**Status: DONE**

This module has two pages under the "Reports" menu: the **Attendance Report**
and the **Needs Attention** page.

## 1. Attendance Report

A month-by-month (or day-by-day) report of attendance across the school.

- **Monthly / Daily toggle** and **grade & section filters** (like the
  attendance page).
- **Stat cards** up top: attendance rate, target rate, enrollment, and other
  headline numbers for the current view.
- **Trend chart** plotting the attendance rate against the 95% target line.
- **Data table** listing attendance rates with the target and enrollment so you
  can compare sections side by side.
- **Insights panel** on the right with plain-English takeaways (which sections
  are strong, which are falling behind, and so on), plus a by-grade summary.
- Friendly loading skeleton, error-with-retry, and an empty-data state.

## 2. Needs Attention (flagged students)

This page lists the students whose attendance is low, and helps the Principal
act on it.

- **Filter by grade and section**.
- **Stat cards**: total flagged, high-risk (below 70%), and at-risk (70–79%).
- **Flagged Students table**, sorted from the lowest attendance rate up, with:
  - each student's name, LRN, grade & section;
  - counts of Present / Late / Absent / Excused / Not logged;
  - the attendance **rate** and the **level** (High Risk in red, At Risk in amber);
  - the student's **adviser**.
- **Search and filter inside the table** by name/LRN and by level.
- **Alert Advisers button.** One click opens a confirmation box that lists the
  class advisers who will be notified (their names and sections). When you
  confirm, a message goes to each adviser, and a toast confirms success (or
  explains the error). The button is disabled while data is loading so you
  never double-send.
- **Alert status column.** Each flagged student shows the current state of the
  adviser alert: **Alerted**, **Acknowledged**, or **Replied** — so the
  Principal can see at a glance who has responded.
- **Click a row** to open that student's attendance detail for the full trend.

## What's working today

- [x] Attendance Report with toggle, filters, stat cards, trend chart, table, and insights
- [x] Needs Attention page with grade/section filters and stat cards
- [x] Flagged-students table sorted by lowest rate
- [x] Level badges (High Risk / At Risk)
- [x] Adviser column with alert status (Alerted / Acknowledged / Replied)
- [x] Search + level filter inside the table
- [x] "Alert Advisers" with confirmation listing adviser names & sections
- [x] Success/error toast messages when alerting advisers
- [x] Loading skeletons, empty state, error-with-retry