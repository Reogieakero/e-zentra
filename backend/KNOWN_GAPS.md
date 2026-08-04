# KNOWN GAPS & Deviations

This document records intentional deviations from the "Zentra — Complete Schema Data Dictionary
(Realigned)" dated August 4, 2026, plus known gaps and the reasoning behind each choice.

## 1. Computed fields live in the service layer (not DB GENERATED)

Dictionary intent: `student_risk_assessments.risk_count` / `risk_level` are derived from other records.

- **Implementation:** computed in `src/services/risk.service.ts` (`computeRiskSignals` / `upsertRiskAssessment`)
  and never accepted from clients. `final_grades` averages / initial / transmuted grades are also computed
  server-side in `src/services/grading.service.ts` using `src/utils/gradeComputation.ts`.
- **Why:** Postgres `GENERATED ALWAYS AS (expr) STORED` cannot reference other tables. Keeping the
  computation in one service layer keeps the invariant testable and avoids trigger recursion when grades,
  attendance, or anecdotal records change.
- **Invariant:** `risk_count` = number of true among {academic, attendance, behavioral}; `risk_level` is
  `low` (0), `moderate` (1), `high` (2+).

## 2. `refresh_tokens` is auth infrastructure, not a dictionary table

Dictionary has no refresh-token table; a production auth system needs one.

- **Implementation:** `refresh_tokens` table (user_id, token_hash, expires_at, revoked_at,
  replaced_by_token_hash). Tokens are stored hashed (argon2), rotated on every use, and revoked on logout /
  password change.

## 3. Grade component weights: DB trigger made DEFERRABLE

Dictionary: `grade_components.weight_percentage` must sum to 100 per (subject, term).

- The original trigger (`20260803180000_triggers`) enforced sum=100 per **statement**, which broke
  replacing a component set and single-row creation.
- Migration `20260804100000_deferrable_grade_trigger` re-creates the trigger as a
  `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`, so the full set is validated at commit.
- The API therefore exposes `POST /grade-components` as a **bulk set** operation: it replaces the complete
  component set for a subject/term atomically inside one transaction and rejects any set that does not sum
  to 100.

## 4. Referral auto-completion

Dictionary: a referral completes when a linked `health_records`, `home_visitation_records`, or
`adm_learner_profiles` row is inserted.

- **Implementation:** Postgres `AFTER INSERT` trigger `auto_complete_referral()` in
  `20260803180000_triggers` sets `referrals.status = 'completed'` for linked `pending`/`in_progress`
  referrals. Verified by an integration test.

## 5. Rate limiting & lockout in test mode

Rate limits are relaxed when `NODE_ENV=test` so the integration suite is not throttled. In production,
global (100/min/IP) and auth (5/min/IP) limits apply, plus a 5-attempt / 15-minute per-account login lockout.

## 6. Notifications are best-effort and in-process

`notification.service.ts` writes rows synchronously but swallows individual failures (logged). There is no
out-of-band delivery (email/push) in this scope. If `notify` is called without a valid source record UUID,
the row is skipped and warned.

## 7. Auto-escalation job

`src/jobs/flagEscalation.ts` runs `runFlagEscalation()` immediately on boot and then every 60 seconds.
Open record flags older than `RECORD_FLAG_ESCALATION_DAYS` (default 7) are marked
`escalated_to_principal` and all principals are notified. The job is gated by
`RECORD_FLAG_ESCALATION_ENABLED` and is covered by an integration test in `tests/integration/gaps.test.ts`.

## 8. Upload endpoints

`multer` disk storage is wired at `POST /api/v1/uploads/:kind` for kinds `profile-photo`, `report-card`,
and `adm-photo`. Each kind restricts which roles may upload and which MIME types are accepted
(`ALLOWED_IMAGE_MIMES`; report cards also accept `application/pdf`). `profile-photo` uploads update
`users.profile_photo_url`, all uploads are audited (`UPLOAD`), and files are served statically from
`UPLOAD_DIR` at `/uploads/...`. Files are stored on local disk (or the container volume) — object storage
(S3/R2) is a deployment concern, not in this scope.

## 9. OpenAPI coverage

`src/openapi.ts` documents every route group (72 paths) including the upload, parent-link, and report-card
generation endpoints. Request/response schemas are defined for the auth, upload, parent-link and attendance
operations; other operations remain compact reference entries. The spec is served at `/api-docs`.

## 10. Parent links & report card generation

- Parent-student linking is fully exposed: `POST /parent-links` (by `studentId` or LRN), `GET /parent-links`
  (parent sees own; custodians/Principal may filter), and `POST /parent-links/:id/confirm|reject`
  (linked parent via `parent_app`, or `record_keeper`/`registrar`/`principal` via `staff_recorded`).
- Report cards can be auto-generated from final grades: `POST /report-cards/generate` creates one
  `system_generated`, `ready` card per student that has a final grade for the term (skipping students who
  already have one) and notifies the student and confirmed parents.

## 11. Required environment variables

- `DATABASE_URL` must point to the Supabase pooled PostgreSQL connection string.
- `REDIS_URL` must point to an Upstash connection string (`rediss://...`) — the app uses only
  command/INCR-based semantics (no `EVAL`/Lua, no `KEYS`) so it works on Upstash.
- `docker-compose.yml` starts only PostgreSQL (via `compose.yaml`); Redis is not bundled because Upstash is
  the production store. `REDIS_URL` is required (`${REDIS_URL:?}`).

## 12. OCR pipeline (added Phase 4)

- **Async, DB-backed worker.** OCR jobs are tracked in `ocr_jobs` (queued → processing →
  succeeded/partial/failed) and processed by an in-process polling worker (`startOcrWorker`, default
  2s interval) — intentionally *not* BullMQ, preserving the project's "no EVAL/Lua" Upstash convention
  (see §11). `processQueuedOcrJobs()` claims up to `OCR_JOB_BATCH_SIZE` queued jobs per pass.
- **Engine abstraction.** `src/services/ocr/` defines an `OcrEngine` interface (extract → normalized
  `OcrResult`) with three implementations selected by `OCR_ENGINE`: `fake` (deterministic, default for
  tests), `paddle` (HTTP client for the PaddleOCR microservice in `ocr-service/`), `textract` (future
  cloud fallback, same HTTP contract). The rest of the app depends only on the interface.
- **Staging, never authoritative.** OCR output is stored in `report_card_extractions`
  (`needs_review`/`approved`/`rejected`) with per-field confidence. Raw extraction is never an official
  record: on approval, verified grades are written to `final_grades` and the card moves
  `pending → ready`. Corrections are recorded on the extraction for audit.
- **Hooks.** `createReportCard` with `source=scanned_upload` + `fileUrl` enqueues an OCR job and sets
  `report_cards.ocr_status`. Review/approve/reject endpoints live in `src/routes/ocr.routes.ts`,
  band-asserted via `assertRecordCustodianBand`. Uploaded files must exist (hash is computed at enqueue).
- **No frontend yet.** The pipeline is exercised end-to-end by the integration suite via the `fake`
  engine; `POST /report-cards/:id/extraction/approve` writes final grades, so verification happens
  purely through the API. The PaddleOCR service (`ocr-service/`) is scaffolded but not wired into CI.
- **Known limits.** (1) Auto-approve still requires a custodian one-click confirm — no auto-release.
  (2) Approving writes `final_grades` only for subject codes that resolve to known subjects and only
  when no final grade already exists for the (student, subject, term). (3) A scanned card created
  without a `fileUrl` (legacy test path) simply stays `ocr_status=queued` with no job.
