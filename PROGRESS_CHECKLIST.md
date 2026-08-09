ZENTRA - WHAT WE HAVE BUILT (PROGRESS CHECKLIST)

A friendly tour of everything done so far, written for people who don't read code.

HOW TO READ THIS DOCUMENT

Zentra is a school records system. It has three parts working together:

  1. The Website (Frontend) - the pages people open in their browser.
  2. The Server (Backend) - the brain that checks, stores, and protects all the records.
  3. The Database and Helpers (Other) - where records are safely kept, plus email,
     file storage, OCR reading, and fast short-term memory (Redis).

Each item below is tagged so you know which part it lives in:
  (Backend)  - the server / brain / database rules
  (Frontend) - the pages and screens people see and click
  (Other)    - separate services, deployment, or documentation
Some items are (Backend + Frontend) when both parts work together.

WHAT "DONE" MEANS
  [DONE]   - finished and working
  [PLAN]   - still planned / open

------------------------------------------------------------
1. LOGGING IN AND ACCOUNTS
------------------------------------------------------------

[DONE] Email + password sign-in (Backend + Frontend)
  - Students, parents, teachers, and office staff can log in with a school email and password.

[DONE] "Sign in with Google" (Backend + Frontend)
  - Users can log in with their Google account instead of a password.
  - Needs a Supabase project to switch on; the button hides itself when not configured.

[DONE] Forgot password (Backend + Frontend)
  - Users can request a reset link by email. The link is time-limited and can only be used once.

[DONE] Registration for students, parents, and teachers (Backend + Frontend)
  - New accounts are created with the right school details (grade level, LRN, section,
    relationship, employee ID, and so on).

[DONE] Nine different roles (Backend + Frontend)
  - The system knows who is who and shows each person only what they should see.
  - Roles: Student, Parent, Teacher, Registrar, Record Keeper, ADM Coordinator,
    Guidance Counselor, Principal, Nurse.

[DONE] Account approvals (Backend + Frontend)
  - New student and teacher accounts start as "pending" until the right office approves them.

[DONE] Ownership by grade band (Backend)
  - Junior High (Grades 7-10) is managed by the Record Keeper.
  - Senior High (Grades 11-12) is managed by the Registrar.
  - Trying to change records from the wrong office is refused.

[DONE] Passwords protected (Backend)
  - Passwords are scrambled (hashed) with a modern secure method (Argon2id),
    so even the system's own staff cannot read them.

[DONE] Session expiry and inactivity warning (Frontend + Backend)
  - If you are idle, the website asks "Are you still there?" with a countdown.
  - Offers "I'm still here" to stay signed in, or signs out.
  - Auto signs out if there is no response, so an unattended open screen can't be misused.

------------------------------------------------------------
2. STUDENTS, SECTIONS, AND SCHOOL SETUP
------------------------------------------------------------

[DONE] One record per learner (Backend + Frontend)
  - Each student has a single profile: name, LRN, birthdate, sex, grade level,
    section, contact details, and photo.

[DONE] Sections (Backend + Frontend)
  - Classes are created per school year and grade band, and students are assigned to them.

[DONE] School years and terms (Backend + Frontend)
  - The system manages the active school year and its terms, which decide
    what counts as "current" data.

[DONE] Subjects, assignments, and grade components (Backend + Frontend)
  - The building blocks for grading are defined per section and term.

[DONE] Demo data seeder (Backend)
  - One command fills the system with realistic users, sections, terms, subjects,
    grades, and records so it can be demonstrated immediately.

------------------------------------------------------------
3. ATTENDANCE
------------------------------------------------------------

[DONE] Daily attendance logging (Backend + Frontend)
  - Teachers mark students Present, Absent, Late, or Excused for a session
    (morning/afternoon) on a given date.

[DONE] Bulk logging (Backend + Frontend)
  - Attendance for a whole section can be entered at once.

[DONE] Edit a status (Backend + Frontend)
  - A mistaken "Absent" can be corrected by the section adviser.

[DONE] Parent alerts (Backend)
  - Parents are automatically notified when their child is marked Absent or Late.

[DONE] Today's dashboard numbers (Backend + Frontend)
  - The principal's dashboard shows, at a glance, how many are Present, Absent, Late,
    and Excused today, plus the present rate.

[DONE] Weekly trend chart (Backend + Frontend)
  - The dashboard plots the attendance rate for each school day of the current week
    (Mon-Fri) with date labels, against a 95% target line.

[DONE] Section heatmap (Backend + Frontend)
  - A color-coded grid shows each section's attendance intensity per weekday,
    so weak days stand out instantly.

[DONE] Needs-attention report (Backend + Frontend)
  - A report page lists students whose attendance is low, sorted by lowest
    rate first, tagged High Risk (below 70%) or At Risk (70-79%).

[DONE] Adviser alerts (Backend + Frontend)
  - The Principal can alert the class advisers of low-attendance students in
    one click, and see each alert's status (Alerted / Acknowledged / Replied).

------------------------------------------------------------
4. GRADING AND REPORT CARDS (SF10)
------------------------------------------------------------

[DONE] Grades by subject and term (Backend + Frontend)
  - Grades are entered per student, subject, and term using grade components.

[DONE] Final grade computation (Backend)
  - The system calculates final grades following the school's grading rules.

[DONE] Report card generation (Backend + Frontend)
  - Report cards (SF10 / Form 137) are generated from final grades and marked Ready or Released.

[DONE] Scanned report-card reading (Other + Backend)
  - A separate OCR microservice (PaddleOCR) reads scanned report cards and extracts
    fields like LRN, student name, grades, and remarks, with confidence scores.
  - Low-confidence scans are routed to human review.

[DONE] Uploads with checks (Backend + Other)
  - Uploaded files (photos, report cards, ADM photos) are verified by their actual
    content, size-limited, and stored on the server or in cloud storage (Supabase).

------------------------------------------------------------
5. ANECDOTAL RECORDS, REFERRALS, AND CASE WORK
------------------------------------------------------------

[DONE] Anecdotal / behavior records (Backend + Frontend)
  - Behavior incidents and observations are recorded per student and shown in their file.

[DONE] Referrals to specialist staff (Backend + Frontend)
  - A record can be referred to the Guidance Counselor, Nurse, ADM Coordinator,
    or Principal as appropriate.

[DONE] Record flags with escalation (Backend)
  - Important flags can escalate to the Principal automatically if left unresolved
    for a set number of days.

------------------------------------------------------------
6. THE ADM (ALTERNATIVE DELIVERY MODE) PROCESS
------------------------------------------------------------

[DONE] ADM learner profiles (Backend + Frontend)
  - Alternative-learning-mode profiles are created and submitted by staff.

[DONE] Approval workflow (Backend + Frontend)
  - Submitted ADM profiles wait for the Principal's approval.
  - The dashboard shows how many are pending.

[DONE] ADM photo uploads (Backend + Other)
  - Learner photos are uploaded and stored with the profile.

------------------------------------------------------------
7. STUDENT RISK AND SUPPORT
------------------------------------------------------------

[DONE] Risk assessment (Backend)
  - Students are assessed and rated Low / Moderate / High risk based on
    attendance and records.

[DONE] Recomputation on new data (Backend)
  - Risk levels are recalculated when attendance changes.

[DONE] "At Risk" list on the dashboard (Backend + Frontend)
  - The principal sees up to three at-risk students with their section and
    attendance rate, flagged below the 85% threshold.

[DONE] Nurse and counselor module support (Backend + Frontend)
  - Specialist roles have their own records and workflows (health notes, home visitation).

------------------------------------------------------------
8. PRINCIPAL DASHBOARD AND REPORTING
------------------------------------------------------------

[DONE] Four KPI cards (Backend + Frontend)
  - Enrollment (Total + ADM)
  - Attendance and ADM (Absent + Present)
  - Action Items (Pending + At Risk)
  - Documentation (Anecdotal + SF10)
  - Hover any number for a plain-English explanation of what it measures.

[DONE] At Risk Students panel (Backend + Frontend)
  - Quick list of who needs follow-up.

[DONE] Quick Actions panel (Frontend)
  - Shortcuts to Add Student, Scan Attendance, Generate SF10, Anecdotal Report,
    ADM Records, and Export Reports.

[DONE] ADM for Approval panel (Backend + Frontend)
  - Profiles awaiting the principal's signature.

[DONE] Performance and Attendance Analytics (Backend + Frontend)
  - Daily trend chart, section heatmap, and a Present vs Absent bar chart per section,
    all with tooltips and legends.

[DONE] "What You See" info button (Frontend)
  - The info button on the dashboard opens a plain-language guide to every number on the page.

[DONE] Loading skeletons (Frontend)
  - While the dashboard loads, placeholder ghost cards shimmer so the screen
    doesn't look broken.

[DONE] Side navigation and dynamic top bar (Frontend)
  - A permanent left menu stays visible on every screen size, and the top bar
    always shows who you are (e.g. Principal) and which page you're on
    (e.g. Attendance) instead of a hardcoded label.

------------------------------------------------------------
9. SECURITY AND TRUST
------------------------------------------------------------

[DONE] Login attempt limits (Backend)
  - Too many wrong passwords slows down and locks the account briefly,
    protecting against guessing attacks.

[DONE] Rate limiting (Backend)
  - The server counts requests per minute and blocks floods on login
    and other sensitive actions.

[DONE] Refresh-token rotation (Backend)
  - Every session refresh issues a new token and invalidates the old one.
  - Reused tokens are treated as possible theft and shut down.

[DONE] Audit log (Backend)
  - Every change (who, what, when) is written down so the school can see exactly
    what happened.

[DONE] File safety (Backend)
  - Uploads are content-checked (not just name-checked), and files are only handed
    out to the person who should see them.

[DONE] API documentation (Backend)
  - Every action the website can trigger on the server is auto-documented and
    viewable at /api-docs.

[DONE] Headers and hardening (Backend)
  - The server sends protective settings on every reply and only accepts requests
    from approved websites.

[DONE] Confidential records (Backend + Frontend)
  - Report cards and sensitive records stay restricted to the student, their confirmed
    parents, and the records/staff roles.

------------------------------------------------------------
10. PERFORMANCE AND CACHING
------------------------------------------------------------

[DONE] Frontend caching (SWR) (Frontend)
  - The dashboard shows instantly from a quick memory cache, then quietly refreshes
    in the background (every 60 seconds, on tab focus, and on reconnection).
  - Each user has their own cache so one person's numbers never appear in
    another person's session.

[DONE] Backend caching (Redis) (Backend)
  - The dashboard's heavy math is stored in Redis for 30 seconds, so repeated
    requests don't hammer the database.
  - Logging attendance instantly refreshes that cache.

[DONE] Layers separated (Other)
  - PostgreSQL for permanent records, Redis for fast short-term memory,
    and cloud/disk storage for files.

------------------------------------------------------------
11. QUALITY AND TESTING
------------------------------------------------------------

[DONE] Automated test suite - 99 tests (Backend)
  - A robot repeatedly checks logging in, permissions, uploads, password resets,
    attendance, grading, and more before anything ships.

[DONE] Type checking (Backend + Frontend)
  - Code is spell-checked for mistakes on both the server and the website
    before deployment.

[DONE] CI on every pull request (Other)
  - Every proposed change is automatically tested; a change can only be merged
    when the tests pass.

[DONE] GitHub security scanning (Other)
  - Secrets and credentials are scanned automatically.

[DONE] Plain-English documentation (Other)
  - This checklist, the tech stack guide, and the per-module frontend guides in
    docs/frontend explain the system without jargon.

------------------------------------------------------------
12. STILL PLANNED / OPEN
------------------------------------------------------------

[PLAN] Google sign-in fully configured for a real deployment (Other)
  - Needs a live Supabase project URL and keys.

[PLAN] Email delivery connected to a real mailbox (Other)
  - Reset emails and alerts are coded and tested, but a live SMTP/Gmail
    account is needed in production.

[PLAN] Live cloud file-storage bucket (Other)
  - Uploads currently fall back to local disk unless the storage keys and
    bucket are configured.

[PLAN] Remaining feature screens in the website (Frontend)
  - The backend has the full API; some role-specific screens (student and parent
    portals beyond login, specialist module pages) are scaffolded but not fully built.

[PLAN] Production deployment (Other)
  - A Docker stack is ready; deploying to a live host, domain, and HTTPS
    is the final step.

------------------------------------------------------------
ONE-LINE SUMMARY
------------------------------------------------------------

A secure, role-aware school records system with attendance, grading, report cards,
behavior and referrals, ADM approval, risk flags, a live principal dashboard and
reporting with adviser alerts, a backups & export feature, and full plain-English
documentation, with 99 automated tests guarding every change.
