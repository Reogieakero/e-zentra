
CREATE TYPE "BackupKind" AS ENUM ('manual', 'automatic');


CREATE TYPE "BackupStatus" AS ENUM ('running', 'succeeded', 'failed');


CREATE TABLE "google_drive_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT NOT NULL,
    "token_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "folder_id" VARCHAR(200),
    "connected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "google_drive_links_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "backup_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "BackupKind" NOT NULL DEFAULT 'manual',
    "status" "BackupStatus" NOT NULL DEFAULT 'running',
    "file_id" VARCHAR(200),
    "file_name" VARCHAR(200),
    "size_bytes" BIGINT,
    "error_message" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX "google_drive_links_user_id_key" ON "google_drive_links"("user_id");


CREATE INDEX "backup_jobs_status_created_at_idx" ON "backup_jobs"("status", "created_at");


ALTER TABLE "google_drive_links" ADD CONSTRAINT "google_drive_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;