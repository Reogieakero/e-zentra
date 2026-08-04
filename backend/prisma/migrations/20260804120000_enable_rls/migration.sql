-- Enable Row Level Security on every business table.
--
-- Background: the API backend connects as the table owner ("postgres"), which
-- bypasses RLS by default, so application-level authorization (authenticate /
-- authorize middleware) continues to govern all access from the API.
--
-- What RLS now blocks: every other role — notably Supabase's built-in "anon" and
-- "authenticated" roles used by PostgREST. With the publishable (anon) key being
-- public by design, RLS with no policies for those roles closes the REST API
-- data-exposure hole (previously any anon request could read every row).
--
-- No policies are created: with RLS on and zero policies, anon/authenticated see
-- no rows, and INSERT/UPDATE/DELETE are rejected. The owner (backend) is exempt.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parent_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parent_student_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_subject_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "adviser_access_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anecdotal_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anecdotal_record_followups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "home_visitation_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "adm_learner_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "adm_parent_meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "adm_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grade_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "final_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_risk_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "record_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_reflections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
