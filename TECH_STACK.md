# Zentra — Tech Stack (Plain English)

A guide to the building blocks behind Zentra, written for people who aren't programmers.
Each entry says **what it is**, **what job it does for Zentra**, and **why we chose it**.

---

## The big picture

Zentra is a website ("the app") that talks to a brain ("the server") which stores and protects
all the school's data in a database. Just like a restaurant has a **kitchen** (where the food is
made), a **waiter** (who takes your order and brings it to you), and a **pantry** (where
ingredients are kept), Zentra has three layers:

| Layer | Restaurant analogy | What it is in Zentra |
|---|---|---|
| Frontend | The dining room / menu you see | The pages you open in your browser |
| Backend | The kitchen + waiter | The server that thinks, checks, and stores |
| Database | The pantry + refrigerator | Where all records are safely kept |

---

## Backend — "the kitchen and the waiter"

### Node.js
- **What:** A program that lets JavaScript run outside the browser — on a server.
- **Job:** It is the engine that powers the whole backend. When a request comes in, Node.js is
  what runs all the code that decides what to do with it.
- **Why:** Fast, lightweight, and the same language family as the frontend, so the whole team
  writes one language.

### TypeScript
- **What:** A stricter version of JavaScript that checks your code for mistakes before it runs.
- **Job:** Acts like spell-check for code. It stops typos and wrong guesses from becoming bugs
  that affect real student records.
- **Why:** Zentra handles sensitive data — we can't afford silent mistakes. The safety net is
  worth it.

### Express.js
- **What:** A popular "framework" for building servers — a toolbox of ready-made parts.
- **Job:** The waiter. It receives a request (e.g. "log me in" or "give me report cards"),
  routes it to the right piece of kitchen code, and hands the reply back.
- **Why:** Simple, battle-tested, and used by thousands of companies, so there's a huge amount
  of proven know-how behind it.

### Prisma
- **What:** A tool called an "Object-Relational Mapper" (ORM) — it translates between code and
  database tables.
- **Job:** Lets us read and write records (students, grades, reports) using normal code instead
  of hand-writing fragile database commands. It also blocks common database-attack tricks.
- **Why:** Keeps database work safer and far easier to maintain than writing raw SQL everywhere.

### PostgreSQL (hosted by Supabase)
- **What:** A database — a very organized digital filing cabinet.
- **Job:** The pantry. Stores every student, parent, teacher, grade, report card, and setting.
- **Why:** Rock-solid, free, open source, and Supabase hosts it for us in the cloud so we don't
  manage servers ourselves.

### Supabase Storage
- **What:** Supabase's cloud "file room" — like Google Drive for your project.
- **Job:** Holds uploaded files: profile photos, scanned report cards, and ADM photos.
- **Why:** Storing files in the database itself gets slow and bloated. Keeping them in a secure,
  private cloud file room is faster and easier to scale.

### Supabase Auth (Google login)
- **What:** Supabase's ready-made login system.
- **Job:** Powers the "sign in with Google" option, so users don't need a separate Zentra
  password for that path.
- **Why:** Reusing a proven, secure login system is safer than building one from scratch.

### JSON Web Tokens (JWT)
- **What:** A digital "stamp" you get after logging in.
- **Job:** Like a wristband at a festival. Once you've signed in, your browser shows the stamp on
  every request so the server knows who you are without asking for the password again. It
  expires, so it can't be used forever.
- **Why:** Lets the server recognise you safely without storing your password on the phone/laptop.

### Argon2id (password hashing)
- **What:** A recipe for scrambling passwords into unreadable goo.
- **Job:** When you set a password, it is scrambled so that even if the database is ever stolen,
  no one can read the actual passwords — only the scrambled version.
- **Why:** Chosen over the older "bcrypt" because it's the current best-practice, designed by the
  people who win password-cracking contests.

### Zod
- **What:** A "bouncer" for data.
- **Job:** Every piece of data coming into the server is checked against strict rules (e.g.
  "email must look like an email", "grade must be a number"). Anything wrong is turned away.
- **Why:** Stops malformed or malicious input before it can do damage.

### Multer
- **What:** A file-receiving tool.
- **Job:** Catches files that people upload (photos, PDFs) at the door and passes them to the
  kitchen for inspection and storage.
- **Why:** Handles the messy details of file uploads so we don't reinvent the wheel.

### Helmet
- **What:** A security headgear set for the server's replies.
- **Job:** Adds protective settings to every web response that block a range of browser-based
  attacks (like sneaky scripts injected through a page).
- **Why:** One small line gives us a whole bundle of well-tested protections.

### CORS
- **What:** A "guest list" rule for who is allowed to talk to the server.
- **Job:** Ensures only approved websites (our own frontend) can call our API, stopping other
  websites from making requests on your behalf.
- **Why:** Prevents a common attack where a random website tricks your browser into talking to
  Zentra.

### Pino
- **What:** A diary/logger for the server.
- **Job:** Quietly writes down what the server did (who asked for what, and whether it worked) in
  a clean, searchable format.
- **Why:** Makes it possible to investigate problems and prove what happened — without ever
  writing down passwords or secrets.

### Nodemailer (email)
- **What:** The mailroom.
- **Job:** Sends emails from the server — like the password-reset link when someone forgets their
  password.
- **Why:** Gmail/SMTP is used, so reset emails arrive reliably with no extra service to pay for.

### Redis (via Upstash)
- **What:** A super-fast short-term memory store.
- **Job:** Two things: (1) rate-limiting — it counts how many requests you make per minute and
  slows down password-guessing attempts; (2) small queues for background work like notifications
  and document scanning.
- **Why:** These jobs are perfect for a fast scratchpad, and Upstash hosts it in the cloud so we
  don't run it ourselves.

### Swagger / OpenAPI
- **What:** A self-writing instruction manual for the API.
- **Job:** Every button the frontend can push on the server is documented automatically, and you
  can view it live at `/api-docs`.
- **Why:** Keeps the "how to talk to the server" guide always up to date for developers.

### Jest (testing)
- **What:** A robot that repeatedly checks the server's work.
- **Job:** Runs ~100 automated tests before anything ships — logging in, permissions, uploads,
  resets — so a change that breaks something gets caught instantly.
- **Why:** The safety net that lets us change code confidently.

---

## Frontend — "the dining room and the menu"

### Next.js
- **What:** A framework for building web pages — the engine behind the whole website.
- **Job:** Renders every page (login, signup, forgot-password, dashboards), loads them quickly,
  and keeps everything snappy.
- **Why:** Industry standard, fast, and well-supported.

### React
- **What:** A library for building interactive screens out of reusable pieces (buttons, forms,
  cards).
- **Job:** Lets us build each part of the screen once and reuse it, so the UI stays consistent
  (e.g. the same login box everywhere) and updates instantly when you click.
- **Why:** The most popular UI library in the world — huge community and hiring pool.

### TypeScript (frontend)
- **What:** The same spell-check language used in the backend.
- **Job:** Catches mistakes in the frontend code before users ever see them.
- **Why:** Consistency and safety across the whole project.

### Lucide React (icons)
- **What:** A set of clean, simple icons.
- **Job:** The little pictures (key, mail, alert) that make buttons and messages friendly.
- **Why:** Free, consistent, and easy to swap.

### Sileo (toasts)
- **What:** A small library for on-screen pop-up messages.
- **Job:** The "toasts" that appear after an action — e.g. "Reset link sent" or "Wrong account
  type".
- **Why:** Small and focused; gives instant feedback without building pop-ups by hand.

### Supabase JS (frontend client)
- **What:** The browser-side helper for talking to Supabase.
- **Job:** Handles the Google sign-in flow from the browser side.
- **Why:** Reuses Supabase's battle-tested login code instead of writing OAuth ourselves.

### Built-in `fetch` (our API helper)
- **What:** The browser's built-in way to talk to servers.
- **Job:** Our app uses a small custom helper (`src/lib/api.ts`) to call the backend API and
  translate any server error into a friendly message.
- **Why:** Keeps the app lean — no extra dependency needed for something the browser already
  does well.

---

## How the layers fit together

1. You open a Zentra page (**Next.js/React** frontend).
2. You sign in; the frontend asks the backend (`POST /api/v1/auth/login`).
3. The backend checks the password against its scrambled copy (**Argon2id**) and, if correct,
   issues a login wristband (**JWT**).
4. When you upload a photo or open a report card, the backend checks your permission (**roles +
   grade bands**), then saves the file to the private file room (**Supabase Storage**) and records
   it in the filing cabinet (**PostgreSQL** via **Prisma**).
5. Files are only handed out through a guarded door (**`/uploads` endpoint**) that double-checks
   who is asking, so a parent can't peek at another family's report card.
