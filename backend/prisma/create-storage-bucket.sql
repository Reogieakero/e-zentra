-- Creates the private object-storage bucket used for file uploads
-- (profile photos, report cards, ADM photos).
--
-- RLS notes (verified on the live Supabase project):
--   * storage.objects has Row Level Security ENABLED by default.
--   * The bucket is created with public = false.
--   * There are zero access policies on storage.objects for this project, so
--     anon / authenticated clients are denied everything; ONLY the backend
--     service role (which bypasses RLS) can read or write objects. The API
--     proxies file bytes through the authz-gated GET /uploads/... endpoint.
--   * Do NOT add anon/authenticated policies to this bucket.
--
-- Idempotent: safe to run multiple times. Run with:
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/create-storage-bucket.sql
-- (uses DATABASE_URL from backend/.env, i.e. the production Supabase Postgres)

insert into storage.buckets (id, name, "public")
values ('zentra-uploads', 'zentra-uploads', false)
on conflict (id) do nothing;
