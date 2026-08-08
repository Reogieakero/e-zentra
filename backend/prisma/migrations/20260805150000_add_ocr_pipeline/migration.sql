


CREATE TYPE "OcrStatus" AS ENUM ('not_applicable', 'queued', 'processing', 'passed', 'partial', 'failed');
CREATE TYPE "OcrJobStatus" AS ENUM ('queued', 'processing', 'succeeded', 'partial', 'failed');
CREATE TYPE "ExtractionStatus" AS ENUM ('needs_review', 'approved', 'rejected');

ALTER TABLE "report_cards" ADD COLUMN "ocr_status" "OcrStatus" NOT NULL DEFAULT 'not_applicable';

CREATE TABLE "ocr_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "report_card_id" UUID NOT NULL,
    "kind" VARCHAR(50) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_hash" VARCHAR(128) NOT NULL,
    "status" "OcrJobStatus" NOT NULL DEFAULT 'queued',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "engine" VARCHAR(50) NOT NULL DEFAULT 'fake',
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocr_jobs_status_created_at_idx" ON "ocr_jobs"("status", "created_at");
CREATE INDEX "ocr_jobs_actor_id_idx" ON "ocr_jobs"("actor_id");
CREATE INDEX "ocr_jobs_report_card_id_idx" ON "ocr_jobs"("report_card_id");

ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_report_card_id_fkey" FOREIGN KEY ("report_card_id") REFERENCES "report_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "report_card_extractions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ocr_job_id" UUID NOT NULL,
    "report_card_id" UUID NOT NULL,
    "engine" VARCHAR(50) NOT NULL,
    "overall_confidence" DOUBLE PRECISION NOT NULL,
    "student_match" JSONB NOT NULL,
    "grade_rows" JSONB NOT NULL,
    "validation" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "corrections" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'needs_review',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_card_extractions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_card_extractions_ocr_job_id_key" ON "report_card_extractions"("ocr_job_id");
CREATE INDEX "report_card_extractions_report_card_id_idx" ON "report_card_extractions"("report_card_id");

ALTER TABLE "report_card_extractions" ADD CONSTRAINT "report_card_extractions_ocr_job_id_fkey" FOREIGN KEY ("ocr_job_id") REFERENCES "ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_card_extractions" ADD CONSTRAINT "report_card_extractions_report_card_id_fkey" FOREIGN KEY ("report_card_id") REFERENCES "report_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_card_extractions" ADD CONSTRAINT "report_card_extractions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ocr_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_card_extractions" ENABLE ROW LEVEL SECURITY;
