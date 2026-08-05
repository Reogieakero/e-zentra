# Zentra School Information System — Backend

REST API for Zentra, a school information system. Covers identity & registration, academic structure,
anecdotal records, referrals, specialist modules (health, home visitation), the ADM process, attendance &
grading, risk classification, access control & oversight, student-facing records, and notifications.

Stack: Node.js + TypeScript, Express, Prisma + PostgreSQL, Upstash Redis (cache/rate limiting), Supabase Storage
(object storage for uploads), Argon2id password hashing, JWT auth (rotated hashed refresh tokens), Zod validation,
pino logging, Nodemailer/SMTP (email), Swagger/OpenAPI docs, Jest integration tests.

## Prerequisites

- Node.js 20+
- PostgreSQL (Supabase in production; local Postgres for the test suite)
- Upstash Redis (or local Redis 7+ for local development/testing)

## Setup

```bash
cd backend
npm install
cp .env.example .env        # adjust credentials / URLs
```

`.env` points `DATABASE_URL` at Supabase (session pooler, IPv4) and `REDIS_URL` at Upstash. The direct Supabase host
(`db.<ref>.supabase.co`) is IPv6-only and unreachable from many networks — use the pooler
(`aws-0-<region>.pooler.supabase.com:5432`). Tests run against a separate local Postgres DB
(`TEST_DATABASE_URL`) so the destructive Jest suite never touches Supabase data. See `.env.example`.

To enable Supabase Storage for uploads, add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_STORAGE_BUCKET` to `.env` and create the bucket (private) in the Supabase dashboard. Without the service
role key the API falls back to local disk under `UPLOAD_DIR`, so local development and tests need no Supabase setup.

The app only uses Redis commands that Upstash supports (no `EVAL`/Lua, no `KEYS`), so the rate limiter and
cache work against Upstash out of the box.

### Database

```bash
npx prisma migrate deploy   # apply migrations to the configured DATABASE_URL
npm run seed                # seed demo data (users, sections, subjects, terms)
```

The integration test suite needs a separate test database (`TEST_DATABASE_URL`) and a separate Redis index
(`TEST_REDIS_URL`); `jest.config.js` globalSetup runs `prisma migrate deploy` against the test DB automatically.

### Run

```bash
npm run dev                 # tsx watch (development)
npm run build               # tsc compile to dist/
npm start                   # node dist/server.js (production)
```

### Test

```bash
npm test                    # full integration + unit suite (runInBand)
npm run test:coverage       # with coverage report
npm run lint                # tsc --noEmit typecheck
```

## API

- Base path: `/api/v1`
- Interactive docs: `/api-docs` (OpenAPI 3.1 spec in `src/openapi.ts`)
- Health check: `/health`

Authentication uses a `Bearer` access token; refresh tokens are rotated on each use, stored hashed, and
revocable. Every state-changing operation writes an audit-log entry.

File uploads (`profile-photo`, `report-card`, `adm-photo`) are accepted as multipart at
`POST /api/v1/uploads/:kind`. Files are stored either to local disk (`UPLOAD_DIR`, default `./uploads`) or, when
`SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` are set, to Supabase Storage. In both cases they are served
through ``/uploads/...`, which is wrapped by authentication and per-role access checks (report cards stay restricted
to the student, their confirmed parents, and records/staff roles). Parent-student linking is exposed at
`/api/v1/parent-links`, and report cards can be auto-generated from final grades via
`POST /api/v1/report-cards/generate`.

## Roles & grade-band ownership

Nine roles: `student`, `parent`, `teacher`, `registrar`, `record_keeper`, `adm_coordinator`,
`guidance_counselor`, `principal`, `nurse`.

Grade-band ownership is central to authorization:

- **Record Keeper** owns Junior High records (grades 7–10) and approves JHS student accounts.
- **Registrar** owns Senior High records (grades 11–12), approves SHS student accounts, and approves all
  teacher accounts school-wide.
- Grade-banded write operations (sections, subjects, assignments, terms, grade components, account
  approvals) reject the wrong-band owner with `403`.

## Project layout

```
prisma/            schema.prisma, migrations, seed.ts
src/
  config/          env validation (zod)
  lib/             prisma, redis, logger clients
  middleware/      validate, authenticate, authorize, errorHandler, rateLimiter
  services/        domain logic (auth, sections, attendance, grading, risk, ADM, ...)
  routes/          HTTP layer (per-module routers)
  utils/           ApiError, pagination, grade band, grade computation, confidentiality
  app.ts           Express app assembly
  server.ts        boot + escalation job
tests/             integration (supertest) + unit suites, helpers, fixtures
```

## Data dictionary fidelity

The schema maps 1:1 to the "Zentra — Complete Schema Data Dictionary (Realigned)" dated August 4, 2026.
Intentional deviations (e.g. computed risk fields, the `refresh_tokens` infra table) are documented in
`KNOWN_GAPS.md`.
