# Frontend — Principal's Students

**Status: DONE**

This page is the school's student directory for the Principal. It helps you
find any student quickly and see their details.

## What it does

- **Summary cards at the top.** A few quick numbers (like how many students
  are enrolled) so you get the picture instantly.
- **Search box.** Type a student's name and the list narrows as you type.
- **Filters.** Choose a grade or a school year from the drop-down lists.
- **The student list.** A clear, paginated table with each student's name,
  grade & section, and LRN. Move between pages with the page buttons and a
  "Showing X–Y of Z students" counter.
- **View a student's profile.** Click a row and a profile panel opens with
  that student's details.
- **Friendly states.** An empty list shows a helpful message; a problem shows
  an error screen with a "Try again" button; while loading, skeleton cards
  shimmer so the page never looks broken.
- **Live data.** The list and counts always come from the server, so they are
  current.

## What's working today

- [x] Search by student name
- [x] Filter by section and school year
- [x] Paginated student table with a "showing X–Y of Z" counter
- [x] Click a row to open the student's profile panel
- [x] Summary stat cards
- [x] Loading skeletons, empty state, and error-with-retry state