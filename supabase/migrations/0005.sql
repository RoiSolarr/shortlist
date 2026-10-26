-- =============================================================================
-- 0005  Database functions
--
-- For n8n (service_role only, granted to nobody else):
--   app.get_active_resume(p_user_id)            resume text to score against
--   app.save_analysis(p_user_id, ...)           posting + card in ONE transaction
--   app.save_resume_text(p_user_id, p_resume_id, p_text)
--
-- For the website (signed in users, runs with their own permissions and RLS):
--   app.set_active_resume(p_resume_id)
--
-- n8n bypasses RLS, so these functions always take p_user_id from the request
-- that the Next.js server built from the verified session. The composite
-- foreign keys from 0002 still reject any mix of two users' rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
create function app.get_active_resume(p_user_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_resume jsonb;
begin
  select jsonb_build_object('id', r.id, 'label', r.label, 'resume_text', r.resume_text)
    into v_resume
    from app.resumes r
   where r.user_id = p_user_id
     and r.is_active
     and r.extraction_status = 'ready'
     and coalesce(btrim(r.resume_text), '') <> '';

  if v_resume is null then
    raise exception 'No active resume with text for this user' using errcode = 'P0002';
  end if;
  return v_resume;
end;
$$;

-- -----------------------------------------------------------------------------
-- Creates or updates the posting, then creates or overwrites its card.
-- p_job_posting_id set   -> analyze an existing posting again
-- p_source_url repeated  -> same link analyzed again, overwrites
-- otherwise              -> new posting and new card in status 'saved'
-- Tracking fields (status, notes, applied_at, position) are never overwritten.
-- -----------------------------------------------------------------------------
create function app.save_analysis(
  p_user_id         uuid,
  p_description     text,
  p_fit_score       integer,
  p_verdict         text,
  p_input_method    text default 'link',
  p_job_posting_id  uuid default null,
  p_source_url      text default null,
  p_company         text default null,
  p_title           text default null,
  p_location        text default null,
  p_resume_id       uuid default null,
  p_summary         text default '',
  p_matched_skills  text[] default '{}',
  p_missing_skills  text[] default '{}',
  p_talking_points  text[] default '{}',
  p_cover_letter    text default '',
  p_ai_model        text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_posting app.job_postings;
  v_card    app.applications;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22004';
  end if;

  if p_job_posting_id is not null then
    update app.job_postings
       set company     = coalesce(nullif(btrim(p_company), ''), company),
           title       = coalesce(nullif(btrim(p_title), ''), title),
           location    = coalesce(nullif(btrim(p_location), ''), location),
           description = p_description
     where id = p_job_posting_id
       and user_id = p_user_id
    returning * into v_posting;

    if v_posting.id is null then
      raise exception 'Job posting not found for this user' using errcode = 'P0002';
    end if;
  else
    insert into app.job_postings (user_id, source_url, company, title, location, description, input_method)
    values (
      p_user_id,
      nullif(btrim(p_source_url), ''),
      coalesce(nullif(btrim(p_company), ''), 'Unknown company'),
      coalesce(nullif(btrim(p_title), ''), 'Untitled role'),
      nullif(btrim(p_location), ''),
      p_description,
      p_input_method
    )
    on conflict (user_id, source_url) do update
       set company     = excluded.company,
           title       = excluded.title,
           location    = excluded.location,
           description = excluded.description
    returning * into v_posting;
  end if;

  insert into app.applications (
    user_id, job_posting_id, resume_id, fit_score, verdict, summary,
    matched_skills, missing_skills, talking_points, cover_letter, ai_model,
    analyzed_at, board_position
  )
  values (
    p_user_id, v_posting.id, p_resume_id, p_fit_score, p_verdict, coalesce(p_summary, ''),
    coalesce(p_matched_skills, '{}'), coalesce(p_missing_skills, '{}'), coalesce(p_talking_points, '{}'),
    coalesce(p_cover_letter, ''), p_ai_model,
    now(), -(extract(epoch from now()) * 1000)
  )
  on conflict (user_id, job_posting_id) do update
     set resume_id      = excluded.resume_id,
         fit_score      = excluded.fit_score,
         verdict        = excluded.verdict,
         summary        = excluded.summary,
         matched_skills = excluded.matched_skills,
         missing_skills = excluded.missing_skills,
         talking_points = excluded.talking_points,
         cover_letter   = excluded.cover_letter,
         ai_model       = excluded.ai_model,
         analyzed_at    = now()
  returning * into v_card;

  return to_jsonb(v_card) || jsonb_build_object('job_posting', to_jsonb(v_posting));
end;
$$;

-- -----------------------------------------------------------------------------
-- Saves text extracted from an uploaded PDF and makes that version active.
-- -----------------------------------------------------------------------------
create function app.save_resume_text(p_user_id uuid, p_resume_id uuid, p_text text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_resume app.resumes;
begin
  update app.resumes
     set resume_text = p_text,
         extraction_status = 'ready'
   where id = p_resume_id
     and user_id = p_user_id
  returning * into v_resume;

  if v_resume.id is null then
    raise exception 'Resume not found for this user' using errcode = 'P0002';
  end if;

  -- Two statements on purpose: the "one active resume" index is checked row by row.
  update app.resumes set is_active = false
   where user_id = p_user_id and is_active and id <> p_resume_id;
  update app.resumes set is_active = true
   where id = p_resume_id
  returning * into v_resume;

  return to_jsonb(v_resume);
end;
$$;

-- -----------------------------------------------------------------------------
-- Website: switch the active resume. Runs with the caller's own rights, so RLS
-- limits it to the caller's rows.
-- -----------------------------------------------------------------------------
create function app.set_active_resume(p_resume_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (select 1 from app.resumes where id = p_resume_id and user_id = v_user) then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  update app.resumes set is_active = false
   where user_id = v_user and is_active and id <> p_resume_id;
  update app.resumes set is_active = true
   where id = p_resume_id and user_id = v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- Who may call what
-- -----------------------------------------------------------------------------
revoke all on function app.get_active_resume(uuid) from public, anon, authenticated;
revoke all on function app.save_analysis(uuid, text, integer, text, text, uuid, text, text, text, text, uuid, text, text[], text[], text[], text, text) from public, anon, authenticated;
revoke all on function app.save_resume_text(uuid, uuid, text) from public, anon, authenticated;
revoke all on function app.set_active_resume(uuid) from public, anon;

grant execute on function app.get_active_resume(uuid) to service_role;
grant execute on function app.save_analysis(uuid, text, integer, text, text, uuid, text, text, text, text, uuid, text, text[], text[], text[], text, text) to service_role;
grant execute on function app.save_resume_text(uuid, uuid, text) to service_role;
grant execute on function app.set_active_resume(uuid) to authenticated;

revoke all on function app.set_updated_at() from public, anon, authenticated;