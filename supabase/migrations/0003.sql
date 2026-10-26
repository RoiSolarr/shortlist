-- =============================================================================
-- 0003  Row Level Security and table permissions
--
-- Two layers, both must allow an action:
--   1. GRANTs decide WHAT a role may do (which tables, which columns).
--   2. RLS policies decide WHICH ROWS: always user_id = auth.uid().
--
-- anon:           no grants at all (and no usage on schema app, see 0001)
-- authenticated:  own rows only; cannot create postings or applications
--                 (only n8n does that) and cannot edit AI fields or user_id
-- service_role:   used only by n8n; bypasses RLS by design
-- =============================================================================

alter table app.resumes      enable row level security;
alter table app.job_postings enable row level security;
alter table app.applications enable row level security;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke all on all tables in schema app from public, anon, authenticated;

-- resumes: users manage their own versions (paste text, rename, switch, delete)
grant select, insert, delete on app.resumes to authenticated;
grant update (label, resume_text, is_active) on app.resumes to authenticated;

-- job_postings: read and delete only
grant select, delete on app.job_postings to authenticated;

-- applications: read, delete, and update the tracking columns only
grant select, delete on app.applications to authenticated;
grant update (status, notes, cover_letter, applied_at, board_position) on app.applications to authenticated;

grant all on all tables in schema app to service_role;

-- -----------------------------------------------------------------------------
-- Policies. (select auth.uid()) is evaluated once per query instead of per row.
-- -----------------------------------------------------------------------------
create policy "resumes: read own" on app.resumes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "resumes: add own" on app.resumes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "resumes: edit own" on app.resumes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "resumes: delete own" on app.resumes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "job_postings: read own" on app.job_postings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "job_postings: delete own" on app.job_postings
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "applications: read own" on app.applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "applications: edit own" on app.applications
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "applications: delete own" on app.applications
  for delete to authenticated using ((select auth.uid()) = user_id);