# Frontend — Principal's Dashboard

**Status: DONE**

This is the home screen the Principal sees after signing in. It is a
"command center" — one page that shows how the school is doing today.

## What it does

- **The top bar** always shows who you are and where you are, for example
  **Principal / Dashboard**. The bar updates on every page, so you never
  get lost.
- **Four KPI cards.** At a glance:
  - **Enrollment** (headcount + ADM learners)
  - **Attendance & ADM today** (present + absent)
  - **Action Items** (pending + at risk)
  - **Documentation** (anecdotal records + SF10)
  - Hover over any number and a plain-English tip explains what it measures.
- **At-Risk Students panel.** A quick list of up to three students who need
  follow-up, showing their section and attendance rate. Students below the
  85% threshold are flagged.
- **Quick Actions panel.** Shortcuts such as Add Student, Scan Attendance,
  Generate SF10, Anecdotal Report, ADM Records, and Export Reports.
- **ADM for Approval panel.** Alternative-Delivery-Mode (ADM) learner profiles
  waiting for the Principal's signature.
- **Performance & Attendance Analytics.**
  - A daily/weekly trend chart of the attendance rate against a 95% target line.
  - A section heatmap that color-codes each section's attendance intensity per
    weekday, so weak days stand out.
  - A Present vs Absent bar chart comparing sections.
- **Month picker** to view a different month.
- **Loading skeletons** (ghost cards) while the page loads, so the screen
  never looks broken.
- **Info button ("What You See")** opens a plain-English guide to every number.

## What's working today

- [x] Four KPI cards with hover explanations
- [x] At-risk students list with section and attendance rate
- [x] Quick Actions shortcuts
- [x] ADM profiles waiting for approval
- [x] Trend chart with the 95% target line
- [x] Section heatmap
- [x] Present vs Absent bar chart
- [x] Month filter
- [x] Loading skeletons + error / retry states
- [x] Auto-refresh from the server so numbers stay current
- [x] Dynamic top bar (Principal / current page)