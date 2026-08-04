-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'parent', 'teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse');

-- CreateEnum
CREATE TYPE "ProvisioningType" AS ENUM ('self_registered', 'hardcoded');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('pending', 'active', 'inactive', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12');

-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('junior_high', 'senior_high');

-- CreateEnum
CREATE TYPE "TermNumber" AS ENUM ('term_1', 'term_2', 'term_3');

-- CreateEnum
CREATE TYPE "SchoolYearStatus" AS ENUM ('upcoming', 'active', 'completed');

-- CreateEnum
CREATE TYPE "TermStatus" AS ENUM ('upcoming', 'active', 'completed');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "AdviserAccessStatus" AS ENUM ('pending', 'approved', 'denied');

-- CreateEnum
CREATE TYPE "ConfidentialityLevel" AS ENUM ('confidential', 'internal_staff', 'parent_visible');

-- CreateEnum
CREATE TYPE "ReferredToRole" AS ENUM ('nurse', 'guidance_counselor', 'adm_coordinator', 'principal');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('rest_in_clinic', 'sent_home', 'referred_to_hospital', 'returned_to_class');

-- CreateEnum
CREATE TYPE "VisitContext" AS ENUM ('adm_followup', 'guidance_counseling');

-- CreateEnum
CREATE TYPE "AdmProfileStatus" AS ENUM ('draft', 'submitted', 'approved');

-- CreateEnum
CREATE TYPE "AdmModuleStatus" AS ENUM ('released', 'in_progress', 'submitted', 'student_returned');

-- CreateEnum
CREATE TYPE "Session" AS ENUM ('morning', 'afternoon');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('quiz', 'performance_task', 'exam');

-- CreateEnum
CREATE TYPE "FinalGradeRemarks" AS ENUM ('passed', 'failed', 'incomplete');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('high', 'moderate', 'low');

-- CreateEnum
CREATE TYPE "RecordFlagStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "ReportCardSource" AS ENUM ('system_generated', 'scanned_upload');

-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('pending', 'ready', 'released');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('new_anecdotal_record', 'new_referral', 'referral_completed', 'new_health_record', 'new_home_visitation', 'new_adm_profile', 'grade_posted', 'grade_finalized', 'grade_locked', 'attendance_alert', 'new_followup', 'record_flagged', 'record_flag_escalated', 'at_risk_flagged', 'adviser_access_requested', 'adviser_access_decided', 'account_approved', 'account_rejected', 'parent_link_confirmed', 'adm_module_released', 'adm_module_submitted', 'adm_certification_issued', 'report_card_ready');

-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('mother', 'father', 'guardian');

-- CreateEnum
CREATE TYPE "ParentLinkStatus" AS ENUM ('pending_confirmation', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "ConfirmedVia" AS ENUM ('parent_app', 'staff_recorded');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(150) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(10),
    "role" "Role" NOT NULL,
    "provisioning_type" "ProvisioningType" NOT NULL DEFAULT 'self_registered',
    "contact_number" VARCHAR(20),
    "profile_photo_url" TEXT,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "lrn" VARCHAR(20) NOT NULL,
    "birthdate" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "grade_level" "GradeLevel" NOT NULL,
    "section_id" UUID,
    "address" TEXT,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_profiles" (
    "id" UUID NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "occupation" VARCHAR(100),
    "address" TEXT,

    CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "ParentLinkStatus" NOT NULL DEFAULT 'pending_confirmation',
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_student_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "department" VARCHAR(100),
    "date_hired" DATE,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year_label" VARCHAR(9) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "SchoolYearStatus" NOT NULL DEFAULT 'upcoming',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_year_id" UUID NOT NULL,
    "grade_band" "GradeBand" NOT NULL,
    "term_number" "TermNumber" NOT NULL,
    "term_label" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "TermStatus" NOT NULL DEFAULT 'upcoming',
    "created_by" UUID NOT NULL,
    "status_updated_by" UUID,
    "status_updated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_name" VARCHAR(50) NOT NULL,
    "grade_level" "GradeLevel" NOT NULL,
    "adviser_id" UUID,
    "school_year_id" UUID NOT NULL,
    "max_students" INTEGER,
    "status" "SectionStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_name" VARCHAR(100) NOT NULL,
    "subject_code" VARCHAR(20) NOT NULL,
    "grade_level" "GradeLevel" NOT NULL,
    "status" "SubjectStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subject_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "school_year_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adviser_access_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adviser_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "status" "AdviserAccessStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "adviser_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anecdotal_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_reference" VARCHAR(20) NOT NULL DEFAULT 'GCForm-01',
    "observer_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "observation_date" DATE NOT NULL,
    "observation_time" TIME,
    "incident_description" TEXT NOT NULL,
    "location_setting" TEXT,
    "notes_recommendations_actions" TEXT,
    "class_performance" TEXT,
    "attendance_summary" TEXT,
    "confidentiality_level" "ConfidentialityLevel" NOT NULL DEFAULT 'confidential',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "anecdotal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anecdotal_record_followups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "anecdotal_record_id" UUID NOT NULL,
    "followed_up_by" UUID NOT NULL,
    "followup_date" DATE NOT NULL,
    "followup_notes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anecdotal_record_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "anecdotal_record_id" UUID NOT NULL,
    "referred_to_role" "ReferredToRole" NOT NULL,
    "referred_by" UUID NOT NULL,
    "reason_for_referral" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "confidentiality_level" "ConfidentialityLevel" NOT NULL DEFAULT 'confidential',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "referral_id" UUID,
    "visit_date" DATE NOT NULL,
    "visit_time" TIME,
    "reason_for_visit" TEXT NOT NULL,
    "vital_signs" JSONB,
    "diagnosis_assessment" TEXT,
    "treatment_given" TEXT,
    "medication_administered" TEXT,
    "recommendation" "Recommendation",
    "parent_notified" BOOLEAN NOT NULL DEFAULT false,
    "attended_by" UUID NOT NULL,
    "confidentiality_level" "ConfidentialityLevel" NOT NULL DEFAULT 'confidential',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visitation_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_reference" VARCHAR(20) NOT NULL DEFAULT 'GCForm-12',
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "referral_id" UUID,
    "visit_context" "VisitContext" NOT NULL,
    "person_visited_name" VARCHAR(150) NOT NULL,
    "relation_to_student" VARCHAR(50),
    "address" TEXT,
    "reason_for_visitation" TEXT NOT NULL,
    "visit_date" DATE NOT NULL,
    "visit_time" TIME,
    "home_condition_observation" TEXT,
    "family_condition_observation" TEXT,
    "details_of_concern" TEXT,
    "learner_agreement" TEXT,
    "family_agreement" TEXT,
    "conducted_by" UUID NOT NULL,
    "student_signed" BOOLEAN NOT NULL DEFAULT false,
    "parent_signed" BOOLEAN NOT NULL DEFAULT false,
    "adviser_signed" BOOLEAN NOT NULL DEFAULT false,
    "certification_issued" BOOLEAN NOT NULL DEFAULT false,
    "certification_purpose" TEXT,
    "certification_issued_date" DATE,
    "certified_by" UUID,
    "confidentiality_level" "ConfidentialityLevel" NOT NULL DEFAULT 'confidential',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "home_visitation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_learner_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "teacher_adviser_id" UUID,
    "photo_url" TEXT,
    "reason_for_adm" TEXT NOT NULL,
    "adm_intervention_description" TEXT NOT NULL,
    "adm_intervention_result" TEXT,
    "prepared_by" UUID NOT NULL,
    "alternate_adm_coordinator_id" UUID,
    "certification_issued" BOOLEAN NOT NULL DEFAULT false,
    "certification_issued_date" DATE,
    "certified_by" UUID,
    "approved_by" UUID,
    "confidentiality_level" "ConfidentialityLevel" NOT NULL DEFAULT 'confidential',
    "status" "AdmProfileStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "adm_learner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_parent_meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adm_learner_profile_id" UUID NOT NULL,
    "meeting_date" DATE NOT NULL,
    "parents_attended" BOOLEAN NOT NULL,
    "confirmed_by" UUID,
    "confirmed_via" "ConfirmedVia" NOT NULL DEFAULT 'staff_recorded',
    "minutes_of_meeting" TEXT,
    "attendance_logbook_reference" TEXT,
    "conducted_by" UUID NOT NULL,
    "adviser_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adm_parent_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adm_learner_profile_id" UUID NOT NULL,
    "release_date" DATE,
    "distribution_schedule" TEXT,
    "submission_deadline" DATE,
    "followup_counseling_notes" TEXT,
    "status" "AdmModuleStatus" NOT NULL DEFAULT 'released',
    "submitted_by" UUID,
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "adm_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "session" "Session" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "component_type" "ComponentType" NOT NULL,
    "weight_percentage" DECIMAL(5,2) NOT NULL,
    "term_id" UUID NOT NULL,

    CONSTRAINT "grade_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "component_type" "ComponentType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "max_score" DECIMAL(6,2) NOT NULL,
    "date_given" DATE NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,
    "remarks" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "quiz_average" DECIMAL(5,2),
    "performance_task_average" DECIMAL(5,2),
    "exam_average" DECIMAL(5,2),
    "initial_grade" DECIMAL(5,2) NOT NULL,
    "transmuted_grade" DECIMAL(5,2) NOT NULL,
    "remarks" VARCHAR(20),
    "finalized_by" UUID,
    "finalized_at" TIMESTAMPTZ(3),
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_by" UUID,
    "locked_at" TIMESTAMPTZ(3),
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "final_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_risk_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "academic_risk" BOOLEAN NOT NULL,
    "attendance_risk" BOOLEAN NOT NULL,
    "behavioral_risk" BOOLEAN NOT NULL,
    "risk_count" INTEGER NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_table" VARCHAR(50) NOT NULL,
    "source_record_id" UUID NOT NULL,
    "flagged_by" UUID NOT NULL,
    "flag_reason" TEXT NOT NULL,
    "status" "RecordFlagStatus" NOT NULL DEFAULT 'open',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "escalated_to_principal" BOOLEAN NOT NULL DEFAULT false,
    "escalated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "table_name" VARCHAR(50) NOT NULL,
    "record_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_reflections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "term_id" UUID,
    "subject_id" UUID,
    "prompt" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "source" "ReportCardSource" NOT NULL,
    "file_url" TEXT,
    "status" "ReportCardStatus" NOT NULL DEFAULT 'pending',
    "generated_at" TIMESTAMPTZ(3),
    "scanned_by" UUID,
    "managed_by" UUID,
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "source_table" VARCHAR(50) NOT NULL,
    "source_record_id" UUID NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_lrn_key" ON "student_profiles"("lrn");

-- CreateIndex
CREATE INDEX "student_profiles_section_id_idx" ON "student_profiles"("section_id");

-- CreateIndex
CREATE INDEX "parent_student_links_student_id_idx" ON "parent_student_links"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_links_parent_id_student_id_key" ON "parent_student_links"("parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employee_id_key" ON "staff_profiles"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_years_year_label_key" ON "school_years"("year_label");

-- CreateIndex
CREATE UNIQUE INDEX "terms_school_year_id_grade_band_term_number_key" ON "terms"("school_year_id", "grade_band", "term_number");

-- CreateIndex
CREATE INDEX "sections_school_year_id_idx" ON "sections"("school_year_id");

-- CreateIndex
CREATE INDEX "sections_adviser_id_idx" ON "sections"("adviser_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_subject_code_key" ON "subjects"("subject_code");

-- CreateIndex
CREATE INDEX "teacher_subject_assignments_section_id_idx" ON "teacher_subject_assignments"("section_id");

-- CreateIndex
CREATE INDEX "teacher_subject_assignments_subject_id_idx" ON "teacher_subject_assignments"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subject_assignments_teacher_id_subject_id_section_i_key" ON "teacher_subject_assignments"("teacher_id", "subject_id", "section_id", "school_year_id");

-- CreateIndex
CREATE INDEX "adviser_access_requests_section_id_idx" ON "adviser_access_requests"("section_id");

-- CreateIndex
CREATE INDEX "anecdotal_records_student_id_idx" ON "anecdotal_records"("student_id");

-- CreateIndex
CREATE INDEX "anecdotal_records_section_id_idx" ON "anecdotal_records"("section_id");

-- CreateIndex
CREATE INDEX "anecdotal_records_term_id_idx" ON "anecdotal_records"("term_id");

-- CreateIndex
CREATE INDEX "anecdotal_record_followups_anecdotal_record_id_idx" ON "anecdotal_record_followups"("anecdotal_record_id");

-- CreateIndex
CREATE INDEX "referrals_anecdotal_record_id_idx" ON "referrals"("anecdotal_record_id");

-- CreateIndex
CREATE INDEX "health_records_student_id_idx" ON "health_records"("student_id");

-- CreateIndex
CREATE INDEX "health_records_section_id_idx" ON "health_records"("section_id");

-- CreateIndex
CREATE INDEX "health_records_term_id_idx" ON "health_records"("term_id");

-- CreateIndex
CREATE INDEX "health_records_referral_id_idx" ON "health_records"("referral_id");

-- CreateIndex
CREATE INDEX "home_visitation_records_student_id_idx" ON "home_visitation_records"("student_id");

-- CreateIndex
CREATE INDEX "home_visitation_records_section_id_idx" ON "home_visitation_records"("section_id");

-- CreateIndex
CREATE INDEX "home_visitation_records_term_id_idx" ON "home_visitation_records"("term_id");

-- CreateIndex
CREATE INDEX "home_visitation_records_referral_id_idx" ON "home_visitation_records"("referral_id");

-- CreateIndex
CREATE INDEX "adm_learner_profiles_student_id_idx" ON "adm_learner_profiles"("student_id");

-- CreateIndex
CREATE INDEX "adm_learner_profiles_section_id_idx" ON "adm_learner_profiles"("section_id");

-- CreateIndex
CREATE INDEX "adm_learner_profiles_term_id_idx" ON "adm_learner_profiles"("term_id");

-- CreateIndex
CREATE INDEX "adm_parent_meetings_adm_learner_profile_id_idx" ON "adm_parent_meetings"("adm_learner_profile_id");

-- CreateIndex
CREATE INDEX "adm_modules_adm_learner_profile_id_idx" ON "adm_modules"("adm_learner_profile_id");

-- CreateIndex
CREATE INDEX "attendance_records_section_id_idx" ON "attendance_records"("section_id");

-- CreateIndex
CREATE INDEX "attendance_records_term_id_idx" ON "attendance_records"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_student_id_attendance_date_session_key" ON "attendance_records"("student_id", "attendance_date", "session");

-- CreateIndex
CREATE INDEX "grade_components_subject_id_idx" ON "grade_components"("subject_id");

-- CreateIndex
CREATE INDEX "grade_components_term_id_idx" ON "grade_components"("term_id");

-- CreateIndex
CREATE INDEX "assessments_section_id_idx" ON "assessments"("section_id");

-- CreateIndex
CREATE INDEX "assessments_term_id_idx" ON "assessments"("term_id");

-- CreateIndex
CREATE INDEX "assessments_subject_id_idx" ON "assessments"("subject_id");

-- CreateIndex
CREATE INDEX "student_grades_student_id_idx" ON "student_grades"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_grades_assessment_id_student_id_key" ON "student_grades"("assessment_id", "student_id");

-- CreateIndex
CREATE INDEX "final_grades_section_id_idx" ON "final_grades"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "final_grades_student_id_subject_id_term_id_key" ON "final_grades"("student_id", "subject_id", "term_id");

-- CreateIndex
CREATE INDEX "student_risk_assessments_section_id_idx" ON "student_risk_assessments"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_risk_assessments_student_id_term_id_key" ON "student_risk_assessments"("student_id", "term_id");

-- CreateIndex
CREATE INDEX "record_flags_source_table_source_record_id_idx" ON "record_flags"("source_table", "source_record_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_table_name_idx" ON "audit_log"("table_name");

-- CreateIndex
CREATE INDEX "student_reflections_student_id_idx" ON "student_reflections"("student_id");

-- CreateIndex
CREATE INDEX "report_cards_student_id_idx" ON "report_cards"("student_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_links" ADD CONSTRAINT "parent_student_links_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_status_updated_by_fkey" FOREIGN KEY ("status_updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_adviser_id_fkey" FOREIGN KEY ("adviser_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_access_requests" ADD CONSTRAINT "adviser_access_requests_adviser_id_fkey" FOREIGN KEY ("adviser_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_access_requests" ADD CONSTRAINT "adviser_access_requests_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_access_requests" ADD CONSTRAINT "adviser_access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_records" ADD CONSTRAINT "anecdotal_records_observer_id_fkey" FOREIGN KEY ("observer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_records" ADD CONSTRAINT "anecdotal_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_records" ADD CONSTRAINT "anecdotal_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_records" ADD CONSTRAINT "anecdotal_records_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_record_followups" ADD CONSTRAINT "anecdotal_record_followups_anecdotal_record_id_fkey" FOREIGN KEY ("anecdotal_record_id") REFERENCES "anecdotal_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anecdotal_record_followups" ADD CONSTRAINT "anecdotal_record_followups_followed_up_by_fkey" FOREIGN KEY ("followed_up_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_anecdotal_record_id_fkey" FOREIGN KEY ("anecdotal_record_id") REFERENCES "anecdotal_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_attended_by_fkey" FOREIGN KEY ("attended_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visitation_records" ADD CONSTRAINT "home_visitation_records_certified_by_fkey" FOREIGN KEY ("certified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_teacher_adviser_id_fkey" FOREIGN KEY ("teacher_adviser_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_alternate_adm_coordinator_id_fkey" FOREIGN KEY ("alternate_adm_coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_certified_by_fkey" FOREIGN KEY ("certified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_learner_profiles" ADD CONSTRAINT "adm_learner_profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_parent_meetings" ADD CONSTRAINT "adm_parent_meetings_adm_learner_profile_id_fkey" FOREIGN KEY ("adm_learner_profile_id") REFERENCES "adm_learner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_parent_meetings" ADD CONSTRAINT "adm_parent_meetings_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_parent_meetings" ADD CONSTRAINT "adm_parent_meetings_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_parent_meetings" ADD CONSTRAINT "adm_parent_meetings_adviser_id_fkey" FOREIGN KEY ("adviser_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_modules" ADD CONSTRAINT "adm_modules_adm_learner_profile_id_fkey" FOREIGN KEY ("adm_learner_profile_id") REFERENCES "adm_learner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_modules" ADD CONSTRAINT "adm_modules_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_modules" ADD CONSTRAINT "adm_modules_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_components" ADD CONSTRAINT "grade_components_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_components" ADD CONSTRAINT "grade_components_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_risk_assessments" ADD CONSTRAINT "student_risk_assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_risk_assessments" ADD CONSTRAINT "student_risk_assessments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_risk_assessments" ADD CONSTRAINT "student_risk_assessments_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_flags" ADD CONSTRAINT "record_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_flags" ADD CONSTRAINT "record_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_reflections" ADD CONSTRAINT "student_reflections_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_reflections" ADD CONSTRAINT "student_reflections_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_reflections" ADD CONSTRAINT "student_reflections_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_managed_by_fkey" FOREIGN KEY ("managed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
