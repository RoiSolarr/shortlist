-- =============================================================================
-- 0006  Storage for resume PDFs
--
-- Private bucket. Files live at  resumes/<user id>/<resume id>.pdf
-- A signed in user can only touch files inside their own folder. n8n never
-- sees the bucket; it downloads one file through a link that expires in 5 minutes.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies from the first version used the same names; replace them.
drop policy if exists "resume files: read own" on storage.objects;
drop policy if exists "resume files: upload own" on storage.objects;
drop policy if exists "resume files: update own" on storage.objects;
drop policy if exists "resume files: delete own" on storage.objects;

create policy "resume files: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume files: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume files: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Ask the Supabase API to reload its view of the database after these migrations.
notify pgrst, 'reload schema';