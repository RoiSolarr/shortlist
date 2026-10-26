-- =============================================================================
-- 0001  Schemas and base permissions
--
-- Layout of the database:
--   app      this project's data (resumes, job postings, applications, history)
--   n8n      n8n's own tables, written only by n8n (DB_POSTGRESDB_SCHEMA=n8n)
--   storage  Supabase Storage (resume PDFs), managed by Supabase
--   auth     Supabase Auth (user accounts), managed by Supabase
--   public   intentionally left empty
--
-- Run the migration files in order, once, in the Supabase SQL Editor.
-- =============================================================================

-- Remove the tables from the first version of this project (they held no data).
drop table if exists public.jobs cascade;
drop table if exists public.resumes cascade;
drop function if exists public.set_updated_at() cascade;

create schema if not exists app;
create schema if not exists n8n;

comment on schema app is 'AI Job Application Assistant: resumes, job postings, applications, status history';
comment on schema n8n is 'Internal tables of the n8n automation server. Do not edit by hand.';

-- Signed out visitors (anon) get nothing in app, not even the right to look inside.
revoke all on schema app from public;
revoke all on schema app from anon;
grant usage on schema app to authenticated, service_role;

-- Postgres lets every role execute new functions by default. Turn that off for app,
-- so each function below has to be granted on purpose.
alter default privileges in schema app revoke execute on functions from public;