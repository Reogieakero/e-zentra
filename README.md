# Zentra — School Information System

Zentra is a DepEd-aligned school management system for Junior and Senior High School — one record per
learner, scoped to every role that needs it. It covers identity & registration, academic structure,
anecdotal records, referrals, specialist modules (health, home visitation), the ADM process, attendance &
grading, risk classification, access control & oversight, student-facing records, and notifications.

> **New here?** If you just want the plain-English overview of the tech and what the system does, read
> [`TECH_STACK.md`](./TECH_STACK.md).

## Repository layout

```
├── backend/           Express + TypeScript + Prisma REST API (port 3000)
├── frontend-web/      Next.js 16 + React + TypeScript app (port 3001; backend owns 3000)
├── ocr-service/       Self-hosted PaddleOCR microservice (port 8000) — optional
├── docker-compose.yml Production-style compose (API + Postgres)
└── TECH_STACK.md      Plain-English tech guide
```

## Stack at a glance

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · CSS Modules (no Tailwind) |
| Backend | Node.js 20+ · Express 4 · TypeScript · Prisma 6 · Zod |
| Database | PostgreSQL (Supabase in prod; local Postgres for dev/tests) |
| Cache / rate limit | Redis via Upstash (ioredis) |
| File storage | Supabase Storage (falls back to local disk in dev) |
| Auth | JWT (rotated, hashed refresh tokens) + Argon2id + Supabase Google OAuth |
| OCR | Self-hosted PaddleOCR microservice (`OCR_ENGINE=paddle`) |
| Email | Nodemailer / SMTP |
| Docs | Swagger / OpenAPI at `/api-docs` |
| Tests | Jest (integration + unit) — 99 tests across 15 suites |

## Prerequisites

Install these before starting:

- **Node.js 20+** (tested with the LTS line) — https://nodejs.org
- **npm** (bundled with Node)
- **PostgreSQL** — local install (e.g. https://www.postgresql.org) for dev and the test suite; production uses Supabase
- **Redis 7+** — local Redis for dev/tests, or an **Upstash Redis** instance for prod-style setups
- **Git** — https://git-scm.com
- (Optional) **Docker Desktop** — for the `docker-compose.yml` production-style stack
- (Optional) **Supabase** project — needed only for Google OAuth and cloud file storage

## Quick start (local development)

> Two services are involved: the **backend API** and the **frontend**. Run the backend first,
> then the frontend. Each needs its own terminal.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env` at minimum:

- `DATABASE_URL` — your local Postgres URL, e.g. `postgresql://postgres:postgres@localhost:5432/zentra`
- `REDIS_URL` — local `redis://localhost:6379` or your Upstash connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random strings (32+ chars)

Then create the database and seed demo data:

```bash
# creates DB schema from migrations (apply to DATABASE_URL)
npx prisma migrate deploy

# seed demo users, sections, subjects, terms
npm run seed

# start the API on http://localhost:3000
npm run dev
```

Verify it is up:

- Health check: http://localhost:3000/health
- API docs: http://localhost:3000/api-docs

### 2. Frontend

```bash
cd frontend-web
npm install
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3001 (the backend API runs on 3000; the frontend dev server takes 3001).

`.env.local` defaults already point the frontend at `http://localhost:3000/api/v1`, so no edits are needed
unless your backend runs elsewhere. Supabase keys are only required for Google sign-in — leave them blank to
disable that button.

### 3. Seed logins

After `npm run seed` (default password for all seeded users: `Zentra@2026!`):

| Role | Email |
|---|---|
| Principal | `principal@zentra.edu` |
| Registrar | `registrar@zentra.edu` |
| Record Keeper | `record.keeper@zentra.edu` |
| ADM Coordinator | `adm@zentra.edu` |
| Guidance Counselor | `counselor@zentra.edu` |
| Nurse | `nurse@zentra.edu` |
| Teacher (JHS) | `teacher.jhs@zentra.edu` |
| Teacher (SHS) | `teacher.shs@zentra.edu` |
| Student (G7–G12) | `student.g7@zentra.edu` … `student.g12@zentra.edu` |
| Parent | `parent.g7@zentra.edu`, `parent.g12@zentra.edu` |

## Common commands

### Backend (`cd backend`)

| Command | What it does |
|---|---|
| `npm run dev` | Start API with auto-reload (tsx watch) |
| `npm run build` | Type-check + compile to `dist/` |
| `npm start` | Run the compiled production build |
| `npm test` | Run the full Jest suite (integration + unit, runInBand) |
| `npm run lint` | TypeScript type-check only (`tsc --noEmit`) |
| `npm run seed` | Seed demo data |
| `npx prisma migrate dev` | Create a migration from schema changes |
| `npx prisma migrate deploy` | Apply migrations to the configured DB |
| `npx prisma studio` | Browse the database in a web UI |

### Frontend (`cd frontend-web`)

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (also runs ESLint) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Running the test suite

The integration tests hit a **separate** database and Redis so they never touch your dev data.

1. Create a test database, e.g. `zentra_test`.
2. In `backend/.env`, set:
   - `TEST_DATABASE_URL` — e.g. `postgresql://postgres:postgres@localhost:5432/zentra_test`
   - `TEST_REDIS_URL` — e.g. `redis://localhost:6379/1`
3. Run `cd backend && npm test`.

Jest's `globalSetup` applies the migrations to the test DB automatically. All 99 tests across 15 suites
should pass.

> **Windows note:** if `npx prisma generate` fails with `EPERM` on `query_engine-windows.dll.node`, the
> backend dev server is holding a lock on the Prisma engine. Stop the backend process, regenerate, then
> restart it.

## OCR (optional)

The backend supports scanned report-card extraction. Three engines via `OCR_ENGINE`:

- `fake` (default) — deterministic fake results, used in tests/demo, no extra services
- `paddle` — the self-hosted microservice
- `textract` — AWS Textract

To run PaddleOCR locally (see `ocr-service/README.md`):

```bash
cd ocr-service
docker build -t zentra-ocr .
docker run --rm -p 8000:8000 -e OCR_SERVICE_TOKEN=change-me zentra-ocr
```

Then set in `backend/.env`: `OCR_ENGINE=paddle`, `OCR_SERVICE_URL=http://localhost:8000`,
`OCR_SERVICE_TOKEN=change-me`.

## Production-style stack (Docker)

`docker-compose.yml` runs the API container plus Postgres. It expects your secrets as environment
variables (or a `.env` next to the file):

```bash
# Required
REDIS_URL=rediss://default:<token>@<host>.upstash.io:6379
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars>
# Optional
POSTGRES_PASSWORD=change-me
CORS_ORIGINS=http://localhost:3000

docker compose up --build
```

The API container applies migrations on boot (`npx prisma migrate deploy && node dist/server.js`).

## Security conventions

- **Never commit `.env` files** — they are gitignored.
- JWT access tokens expire in 15m by default; refresh tokens are rotated on every use, stored hashed,
  and revoked on logout.
- Every state-changing request writes an audit-log entry.
- Uploads are validated by magic bytes and stored either locally or in Supabase Storage, then served
  only through an auth + per-role gated `/uploads` endpoint.
- Authorization is built on **roles** (9 roles) and **grade-band ownership** (Record Keeper owns JHS,
  Registrar owns SHS) — cross-band writes return `403`.

## Contributing (workflow)

1. Create a feature branch: `git checkout -b feat/your-change`
2. Commit, push: `git push -u origin feat/your-change`
3. Open a PR with `gh pr create --base main`
4. Wait for the `test` CI job to pass
5. Merge with `gh pr merge <n> --merge` (keep the branch)

Lint before finishing: backend `npm run lint`; frontend `npm run lint` + `npm run build`.
