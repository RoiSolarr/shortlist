-- =============================================================================
-- 0002  Tables, constraints, indexes and timestamps
--
--   auth.users 1─* app.resumes
--   auth.users 1─* app.job_postings
--   auth.users 1─* app.applications ─1 app.job_postings   (same user, enforced)
--                                   ─0..1 app.resumes     (same user, enforced)
--   app.applications 1─* app.application_status_history  (same user, enforced)
-- =============================================================================

create type app.application_status as enum ('saved', 'applied', 'interview', 'offer', 'rejected');

-- -----------------------------------------------------------------------------
-- Keeps updated_at current on every table
-- -----------------------------------------------------------------------------
create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Resumes: a user can keep several versions, exactly one of them active.
-- The active one is what new job posts are scored against.
-- -----------------------------------------------------------------------------
create table app.resumes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  label              text not null default 'My resume',
  file_path          text,
  file_name          text,
  resume_text        text,
  extraction_status  text not null default 'ready',
  is_active          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint resumes_id_user_key unique (id, user_id),
  constraint resumes_label_length check (char_length(label) between 1 and 80),
  constraint resumes_text_length check (resume_text is null or char_length(resume_text) <= 50000),
  constraint resumes_extraction_status check (extraction_status in ('processing', 'ready', 'failed')),
  constraint resumes_file_in_own_folder check (file_path is null or file_path like user_id::text || '/%')
);

comment on table app.resumes is 'Resume versions per user. One active version per user (partial unique index).';

create unique index resumes_one_active_per_user on app.resumes (user_id) where is_active;
create index resumes_user_id_idx on app.resumes (user_id);
create index resumes_user_created_idx on app.resumes (user_id, created_at desc);

create trigger resumes_set_updated_at
  before update on app.resumes
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Job postings: the job itself, as read from the link or pasted by the user.
-- -----------------------------------------------------------------------------
create table app.job_postings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  source_url    text,
  company       text not null default 'Unknown company',
  title         text not null default 'Untitled role',
  location      text,
  description   text not null,
  input_method  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint job_postings_id_user_key unique (id, user_id),
  -- The same link is stored once per user. Pasted posts without a link are always allowed.
  constraint job_postings_user_url_key unique (user_id, source_url),
  constraint job_postings_url_format check (source_url is null or source_url ~* '^https?://'),
  constraint job_postings_input_method check (input_method in ('link', 'pasted')),
  constraint job_postings_company_length check (char_length(company) between 1 and 200),
  constraint job_postings_title_length check (char_length(title) between 1 and 300),
  constraint job_postings_location_length check (location is null or char_length(location) <= 200),
  constraint job_postings_description_length check (char_length(description) between 1 and 20000)
);

comment on table app.job_postings is 'Job posts the user analyzed. Created only by n8n through app.save_analysis.';

create index job_postings_user_id_idx on app.job_postings (user_id);
create index job_postings_user_created_idx on app.job_postings (user_id, created_at desc);

create trigger job_postings_set_updated_at
  before update on app.job_postings
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Applications: one card on the tracker board. Holds the latest AI analysis
-- (analyzing again overwrites it) and the user's own tracking fields.
-- -----------------------------------------------------------------------------
create table app.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  job_posting_id  uuid not null,
  resume_id       uuid,
  status          app.application_status not null default 'saved',

  -- Latest AI analysis
  fit_score       smallint not null,
  verdict         text not null,
  summary         text not null default '',
  matched_skills  text[] not null default '{}',
  missing_skills  text[] not null default '{}',
  talking_points  text[] not null default '{}',
  cover_letter    text not null default '',
  ai_model        text,
  analyzed_at     timestamptz not null default now(),

  -- Tracking, edited by the user
  notes           text,
  applied_at      date,
  board_position  double precision not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint applications_id_user_key unique (id, user_id),
  constraint applications_one_per_posting unique (user_id, job_posting_id),
  -- Composite keys: a card can only point at the SAME user's posting and resume.
  constraint applications_posting_same_user
    foreign key (job_posting_id, user_id) references app.job_postings (id, user_id) on delete cascade,
  constraint applications_resume_same_user
    foreign key (resume_id, user_id) references app.resumes (id, user_id) on delete set null (resume_id),
  constraint applications_fit_score_range check (fit_score between 0 and 100),
  constraint applications_verdict check (verdict in ('Strong fit', 'Good fit', 'Stretch', 'Weak fit')),
  constraint applications_cover_letter_length check (char_length(cover_letter) <= 20000),
  constraint applications_notes_length check (notes is null or char_length(notes) <= 10000)
);

comment on table app.applications is 'One tracker card per job posting, with the latest analysis and user tracking fields.';
comment on column app.applications.resume_id is 'Resume version the analysis used. Set to null if that resume is deleted.';

create index applications_user_id_idx on app.applications (user_id);
create index applications_board_idx on app.applications (user_id, status, board_position);
create index applications_user_created_idx on app.applications (user_id, created_at desc);
create index applications_user_analyzed_idx on app.applications (user_id, analyzed_at desc);
create index applications_job_posting_idx on app.applications (job_posting_id);
create index applications_resume_idx on app.applications (resume_id);

create trigger applications_set_updated_at
  before update on app.applications
  for each row execute function app.set_updated_at();