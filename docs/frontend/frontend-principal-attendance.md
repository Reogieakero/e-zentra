# Frontend — Principal's Attendance

**Status: DONE**

This page shows the Principal how attendance is going across the school — by
month or by day, filtered by grade and section.

## What it does

- **Monthly or Daily toggle.** Switch between looking at a whole month or a
  single day. A date picker appears when you pick "daily."
- **Grade & Section filters.** Start with all grades, or narrow to one grade
  and one section.
- **Today's key numbers.** A row of summary cards shows today's counts:
  Present, Absent, Late, Excused, (and rounds where the teacher hasn't logged).
- **Monthly trend.** A chart of the attendance rate through the month, against
  the target line.
- **Section heatmap.** A color-coded grid shows attendance across sections and
  weekdays, so weak days stand out instantly.
- **Drill into a section.** When you pick a specific section, the page switches
  into a focused view: a per-student attendance table, that section's heatmap,
  and its "needs attention" list.
- **Perfect & Low attendance lists.** Two lists show sections with perfect
  attendance and sections that need attention or follow-up.
- **Top sections.** A list of the best-performing sections.
- **It remembers your choices.** The filters you pick are saved in your
  browser, so your view is still there next time you visit.
- **Friendly states.** Loading skeletons, an empty state, and an error screen
  with "Try again" are all in place.

## What's working today

- [x] Monthly / daily view with date picker
- [x] Filter by grade and by section
- [x] Today's Present / Absent / Late / Excused counts
- [x] Monthly trend chart
- [x] Section heatmap
- [x] Drill-down per section (student table + heatmap + needs-attention list)
- [x] Perfect-attendance and needs-attention lists
- [x] Top sections ranking
- [x] Browser remembers your filters
- [x] Loading skeletons, empty state, error screen with retry