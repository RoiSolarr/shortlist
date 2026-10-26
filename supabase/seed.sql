-- =============================================================================
-- Demo seed data (fictional people and companies)
--
-- Two demo users so you can try the app with two accounts:
--   ana.demo@example.com   password  DemoPass123!   4 applications, 2 resume versions
--   ben.demo@example.com   password  DemoPass123!   2 applications, 1 resume
--
-- HOW TO USE
--   Run AFTER all files in supabase/migrations, in the Supabase SQL Editor.
--   Safe to run again: it deletes the two demo users first and recreates them.
--
-- WARNING
--   This creates real login accounts with a known password. Remove them before
--   you share the site publicly:
--     delete from auth.users where email in ('ana.demo@example.com', 'ben.demo@example.com');
-- =============================================================================

begin;

-- Start clean (cascades to identities, resumes, postings, applications, history)
delete from auth.users
 where id in ('0a000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- Users. Token columns are set to '' because Supabase Auth cannot read NULLs there.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ana.demo@example.com', extensions.crypt('DemoPass123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Reyes"}', now() - interval '30 days', now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0b000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ben.demo@example.com', extensions.crypt('DemoPass123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ben Cruz"}', now() - interval '30 days', now(),
   '', '', '', '');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001',
   '{"sub":"0a000000-0000-4000-8000-000000000001","email":"ana.demo@example.com","email_verified":true}',
   'email', now(), now(), now()),
  ('0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001',
   '{"sub":"0b000000-0000-4000-8000-000000000001","email":"ben.demo@example.com","email_verified":true}',
   'email', now(), now(), now());

-- -----------------------------------------------------------------------------
-- Resumes
-- -----------------------------------------------------------------------------
insert into app.resumes (id, user_id, label, resume_text, extraction_status, is_active, created_at)
values
  ('1a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', 'Full stack, 2025',
   E'Ana Reyes\nFull Stack Developer\n\nExperience\nJunior Developer, Bayview Digital (2024 to 2025)\n- Built React and Node.js features for a booking platform used by 40 clinics\n- Wrote REST APIs with Express and PostgreSQL\n\nSkills\nReact, Node.js, Express, PostgreSQL, Git',
   'ready', false, now() - interval '30 days'),
  ('1a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'Full stack, AI focus',
   E'Ana Reyes\nFull Stack Developer (web, mobile, AI)\n\nExperience\nFull Stack Developer, Bayview Digital (2024 to present)\n- Built a React Native app and Next.js dashboard for a booking platform used by 40 clinics\n- Added an AI assistant with Gemini and Supabase vector search, cutting support tickets by 25%\n- Designed Postgres schemas with Row Level Security\n\nProjects\n- Shortlist: job application tracker with n8n automation\n\nSkills\nTypeScript, React, React Native, Next.js, Node.js, Supabase, PostgreSQL, n8n, Gemini API, Git',
   'ready', true, now() - interval '10 days'),
  ('1b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', 'Data engineer',
   E'Ben Cruz\nData Engineer\n\nExperience\nData Engineer, Kalye Analytics (2022 to present)\n- Built Python and dbt pipelines on BigQuery processing 2 TB per day\n- Maintained Airflow DAGs and data quality checks\n\nSkills\nPython, SQL, dbt, Airflow, BigQuery, Docker',
   'ready', true, now() - interval '20 days');

-- -----------------------------------------------------------------------------
-- Job postings
-- -----------------------------------------------------------------------------
insert into app.job_postings (id, user_id, source_url, company, title, location, description, input_method, created_at)
values
  ('2a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/northwind/full-stack-developer', 'Northwind Labs', 'Full Stack Developer', 'Remote',
   'We are hiring a Full Stack Developer to build features across our Next.js web app and React Native mobile app. You will work with TypeScript, Supabase and Node.js, and help ship AI features. Nice to have: GraphQL, AWS.',
   'link', now() - interval '2 days'),
  ('2a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/paperplane/frontend-developer', 'Paperplane', 'Frontend Developer', 'Remote, Asia time zones',
   'Paperplane is looking for a Frontend Developer with strong React and TypeScript skills to own our design system and customer dashboard. Experience with testing (Jest, Playwright) is a plus.',
   'link', now() - interval '12 days'),
  ('2a000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001',
   null, 'Bluefin Payments', 'Senior Backend Engineer', 'Singapore',
   'Senior Backend Engineer, 6+ years with Go or Java, distributed systems, Kafka, and payment processing. On site in Singapore.',
   'pasted', now() - interval '25 days'),
  ('2a000000-0000-4000-8000-000000000004', '0a000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/lumen-health/mobile-engineer', 'Lumen Health', 'Mobile Engineer', 'Manila, Philippines',
   'Lumen Health needs a Mobile Engineer to build our React Native patient app. You will integrate REST APIs, push notifications and offline storage.',
   'link', now() - interval '6 days'),
  ('2b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/orchid/data-engineer', 'Orchid Systems', 'Data Engineer', 'Remote',
   'Data Engineer to build batch and streaming pipelines with Python, dbt and BigQuery. Airflow experience required.',
   'link', now() - interval '9 days'),
  ('2b000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/kestrel/analytics-engineer', 'Kestrel Data', 'Analytics Engineer', 'Cebu, Philippines',
   'Analytics Engineer to model data in dbt and build Looker dashboards for finance and operations teams.',
   'link', now() - interval '1 day');

-- -----------------------------------------------------------------------------
-- Applications and their history.
-- The history trigger is paused so the timeline can use realistic past dates.
-- -----------------------------------------------------------------------------
alter table app.applications disable trigger applications_status_history;

insert into app.applications (
  id, user_id, job_posting_id, resume_id, status, fit_score, verdict, summary,
  matched_skills, missing_skills, talking_points, cover_letter, ai_model,
  notes, applied_at, board_position, analyzed_at, created_at
)
values
  ('3a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001',
   '1a000000-0000-4000-8000-000000000002', 'saved', 86, 'Strong fit',
   'Ana covers the core stack (Next.js, React Native, Supabase, TypeScript) and has shipped an AI feature. GraphQL and AWS are the main gaps.',
   '{Next.js,"React Native",TypeScript,Supabase,Node.js,"Gemini API"}', '{GraphQL,AWS}',
   '{"Shipped a React Native app and Next.js dashboard for 40 clinics","Built an AI assistant with Gemini and vector search"}',
   E'Dear Northwind Labs hiring team,\n\nI am applying for the Full Stack Developer role. At Bayview Digital I built a React Native app and a Next.js dashboard used by 40 clinics, and added an AI assistant that cut support tickets by 25%.\n\nI would love to bring that experience to your team.\n\nAna Reyes',
   'gemini-2.5-flash', null, null, -3, now() - interval '2 days', now() - interval '2 days'),
  ('3a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002',
   '1a000000-0000-4000-8000-000000000001', 'interview', 78, 'Good fit',
   'Strong React and TypeScript match. Testing experience is not shown on the resume.',
   '{React,TypeScript,Git}', '{Jest,Playwright,"Design systems"}',
   '{"Owned UI features end to end at Bayview Digital"}',
   E'Dear Paperplane team,\n\nI build React interfaces every day and would enjoy owning your design system.\n\nAna Reyes',
   'gemini-2.5-flash', 'Technical interview on Friday 10:00 with the frontend lead.', (current_date - 10), -2,
   now() - interval '12 days', now() - interval '12 days'),
  ('3a000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000003',
   '1a000000-0000-4000-8000-000000000001', 'rejected', 34, 'Weak fit',
   'The role needs senior Go or Java and payments experience, which the resume does not show.',
   '{PostgreSQL}', '{Go,Java,Kafka,"Payment systems","6+ years"}', '{}',
   E'Dear Bluefin team,\n\nThank you for considering my application.\n\nAna Reyes',
   'gemini-2.5-flash', 'Rejected by email after the first screen.', (current_date - 24), -1,
   now() - interval '25 days', now() - interval '25 days'),
  ('3a000000-0000-4000-8000-000000000004', '0a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000004',
   '1a000000-0000-4000-8000-000000000002', 'applied', 81, 'Good fit',
   'Direct React Native experience. Offline storage is not mentioned on the resume.',
   '{"React Native","REST APIs",TypeScript}', '{"Offline storage","Push notifications"}',
   '{"Built a React Native app used by 40 clinics"}',
   E'Dear Lumen Health team,\n\nI build React Native apps for healthcare clinics and would be glad to work on your patient app.\n\nAna Reyes',
   'gemini-2.5-flash', null, (current_date - 5), -4, now() - interval '6 days', now() - interval '6 days'),
  ('3b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001',
   '1b000000-0000-4000-8000-000000000001', 'applied', 90, 'Strong fit',
   'Python, dbt, BigQuery and Airflow all match directly.',
   '{Python,dbt,BigQuery,Airflow,SQL}', '{Streaming}', '{"Runs pipelines that process 2 TB per day"}',
   E'Dear Orchid Systems team,\n\nI build dbt and Airflow pipelines on BigQuery every day.\n\nBen Cruz',
   'gemini-2.5-flash', null, (current_date - 8), -2, now() - interval '9 days', now() - interval '9 days'),
  ('3b000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000002',
   '1b000000-0000-4000-8000-000000000001', 'saved', 72, 'Good fit',
   'Strong dbt match. Looker is not on the resume.',
   '{dbt,SQL}', '{Looker}', '{"Maintains dbt models used by analysts"}',
   E'Dear Kestrel Data team,\n\nI would enjoy modeling your finance data in dbt.\n\nBen Cruz',
   'gemini-2.5-flash', null, null, -1, now() - interval '1 day', now() - interval '1 day');

insert into app.application_status_history (application_id, user_id, from_status, to_status, source, changed_at)
values
  ('3a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '2 days'),
  ('3a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '12 days'),
  ('3a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'saved', 'applied', 'user', now() - interval '10 days'),
  ('3a000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'applied', 'interview', 'user', now() - interval '3 days'),
  ('3a000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '25 days'),
  ('3a000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001', 'saved', 'applied', 'user', now() - interval '24 days'),
  ('3a000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001', 'applied', 'rejected', 'user', now() - interval '15 days'),
  ('3a000000-0000-4000-8000-000000000004', '0a000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '6 days'),
  ('3a000000-0000-4000-8000-000000000004', '0a000000-0000-4000-8000-000000000001', 'saved', 'applied', 'user', now() - interval '5 days'),
  ('3b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '9 days'),
  ('3b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', 'saved', 'applied', 'user', now() - interval '8 days'),
  ('3b000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001', null, 'saved', 'automation', now() - interval '1 day');

alter table app.applications enable trigger applications_status_history;

commit;