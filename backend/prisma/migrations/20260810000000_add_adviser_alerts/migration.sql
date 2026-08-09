-- CreateEnum
CREATE TYPE "AdviserAlertStatus" AS ENUM ('pending', 'acknowledged', 'commented');

-- CreateTable
CREATE TABLE "adviser_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "adviser_id" UUID NOT NULL,
    "school_year_id" UUID NOT NULL,
    "status" "AdviserAlertStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "rate" INTEGER NOT NULL,
    "tone" VARCHAR(10) NOT NULL,
    "issued_by_id" UUID NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "adviser_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adviser_alerts_student_id_school_year_id_key" ON "adviser_alerts"("student_id", "school_year_id");

-- CreateIndex
CREATE INDEX "adviser_alerts_section_id_idx" ON "adviser_alerts"("section_id");

-- CreateIndex
CREATE INDEX "adviser_alerts_adviser_id_idx" ON "adviser_alerts"("adviser_id");

-- CreateIndex
CREATE INDEX "adviser_alerts_school_year_id_idx" ON "adviser_alerts"("school_year_id");

-- AddForeignKey
ALTER TABLE "adviser_alerts" ADD CONSTRAINT "adviser_alerts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_alerts" ADD CONSTRAINT "adviser_alerts_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_alerts" ADD CONSTRAINT "adviser_alerts_adviser_id_fkey" FOREIGN KEY ("adviser_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_alerts" ADD CONSTRAINT "adviser_alerts_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_alerts" ADD CONSTRAINT "adviser_alerts_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;