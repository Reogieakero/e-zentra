# Frontend — SF10 Report-Card Records

**Status: DONE**

This page is the Principal's view of the school's **SF10** records — the
official student report cards (Form 137) filed by the office.

## What it does

- **Header with totals.** Shows the school year and the overall record count.
- **Folder overview.** A set of folder-style cards per grade, each showing how
  many records are **Complete**, **Pending**, or **Missing** for that grade.
  Click a grade to filter the list.
- **Search.** Type a student's name and the list narrows as you type
  (with a short delay so it stays smooth).
- **Filters.** Grade, **Status** (Complete / Pending / Missing), and **School
  Year**.
- **Sorting.** By Last Updated, by Name (A–Z), or by Status.
- **Record list.** A paginated table showing each student's record, its status
  badge, and when it was last updated. Click a row to preview it.
- **Preview panel.** Selecting a record opens a preview panel with the record's
  details.
- **Friendly states.** Loading skeletons, an empty result message, and an
  error screen with "Try again" are in place.

## What's working today

- [x] School-year header + total record count
- [x] Per-grade folders with Complete / Pending / Missing counts
- [x] Click a grade folder to filter
- [x] Search by student name
- [x] Filter by grade, status, and school year
- [x] Sort by last updated, name, or status
- [x] Paginated record list
- [x] Record preview on row click
- [x] Loading skeletons, empty state, error-with-retry