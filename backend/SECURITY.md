# Zentra Backend — Security Model

This document describes the threat model, the security controls implemented, and the hardening
measures applied across the phased security review. It is a companion to `README.md` and
`KNOWN_GAPS.md`.

## Threat model

The primary threats this API defends against:

- **Authentication abuse** — credential stuffing, token theft, refresh-token replay/race, account
  takeover after token leakage.
- **Broken authorization** — horizontal/vertical privilege escalation across the nine roles and the
  JHS/SHS grade-band ownership split.
- **Injection & input abuse** — SQL, NoSQL, command, and mass-assignment style injection through
  validated request bodies, params, and file metadata.
- **Upload abuse** — arbitrary file upload, MIME spoofing / polyglot files, stored XSS via served
  content, and unbounded disk consumption.
- **Abuse of endpoints** — brute force, enumeration, resource exhaustion via unconstrained rate
  limits, and notification/link spam.
- **Sensitive data exposure** — leaking credentials, tokens, or student records through logs,
  headers, URLs, or insufficient error granularity.
- **Supply chain & deployment misconfig** — vulnerable or stale dependencies, weak default secrets,
  and accidental secret commitment.

## Security controls

### Authentication & sessions

- Argon2id password hashing (password-cost-tunable via env).
- Short-lived access tokens (JWT) plus refresh tokens that are **rotated on every use**, stored
  **hashed** in `refresh_tokens`, and revocable.
- Refresh rotation is transactional: a race where two concurrent requests reuse the same token is
  detected via a conditional `updateMany` inside a Prisma transaction; the losing request triggers
  `handleRefreshTokenReuse`, which revokes **all** of the user's tokens and records a
  `refresh_token_reuse` security event.
- Reuse of a previously-rotated token (the "detection cookie" window) revokes the entire token
  family and rejects the request with `401`.
- `change-password` requires the current password and is rate-limited per user.

### Authorization

- Role-based access control over nine roles with grade-band ownership: Record Keeper owns JHS
  (grades 7–10), Registrar owns SHS (grades 11–12) and approves teacher accounts.
- Authorization middleware runs per-route; wrong-band owners get `403`.
- Oversight roles can cross bands only through explicit, audited oversight endpoints.

### Upload hardening

- Uploads are gated behind authentication, constrained by **role** (e.g. `report-card` uploads are
  custodians-only) and **kind** (whitelist).
- Every file is content-sniffed by magic bytes (`utils/fileSniff.ts`) and rejected with `422` when
  the declared MIME does not match the actual content (blocks polyglot/spoofed files). The sniffing
  is unit-tested.
- Files are stored under `UPLOAD_DIR` with randomized filenames and served statically with
  content-type constraints; profile photos must be valid PNG/JPEG.
- **Per-user disk quota**: total storage per user is tracked in `users.storage_used_bytes`;
  uploads are rejected with `429` when `MAX_USER_UPLOAD_BYTES` (default 50 MB) would be exceeded.
  Replacing a profile photo releases the prior file's bytes.

### Rate limiting & abuse prevention

- User-scoped, **fail-open** rate limiter backed by Redis (Upstash-compatible; no `EVAL`/`KEYS`).
- Per-route limits, including tighter limits on `change-password`, notification `read-all`, and
  auth attempts.

### Observability & audit

- Every state-changing operation writes an audit-log entry.
- pino structured logging; error responses never leak stack traces or internal details.
- A nightly auto-escalation job surfaces stale open flags to principals.

### Supply chain & deployment

- CI runs `npm audit --omit=dev --audit-level=high` as a gate; `npm audit` reports zero
  vulnerabilities for the current lockfile.
- `docker-compose` (production profile) refuses to boot without explicitly provided JWT secrets;
  no `change-me-` default secrets ship in the compose file.
- Secrets are read from env only; nothing is committed to the repository.

## Deployment hardening checklist

- Set strong, unique values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and any rotation
  secrets in production.
- Use `TRUST_PROXY` behind a TLS-terminating reverse proxy so rate limiter client-IP detection is
  correct, and set `NODE_ENV=production`.
- Point `UPLOAD_DIR` at a dedicated volume with its own disk limits, and set
  `MAX_USER_UPLOAD_BYTES` to match your capacity plan.
- Run `prisma migrate deploy` in deployments and keep `DATABASE_URL` on the session pooler for
  IPv4 reachability.
- Treat the integration test suite as destructive: it runs only against `TEST_DATABASE_URL` /
  `TEST_REDIS_URL`, never against production data.

## Reporting vulnerabilities

Please do **not** open a public issue for security bugs. Report privately to the repository
maintainers with the affected endpoint, a minimal reproduction, and the expected impact.
