-- =============================================================================
-- 0004  Status history
--
-- A trigger writes one row when an application is created and one row every
-- time its status changes. The app never writes history itself, so it cannot be
-- forgotten or faked from the browser. Users can only read their own rows.
-- =============================================================================

create table app.application_status_history (
  id              bigint generated always as identity primary key,
  application_id  uuid not null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  from_status     app.application_status,
  to_status       app.application_status not null,
  source          text not null,
  changed_at      timestamptz not null default now(),

  constraint status_history_application_same_user
    foreign key (application_id, user_id) references app.applications (id, user_id) on delete cascade,
  constraint status_history_source check (source in ('user', 'automation'))
);

comment on table app.application_status_history is 'Timeline of status changes. Written only by trigger app.log_status_change.';
comment on column app.application_status_history.source is 'user = changed from the website, automation = n8n or SQL';

create index status_history_user_id_idx on app.application_status_history (user_id);
create index status_history_application_idx on app.application_status_history (application_id, changed_at);
create index status_history_user_changed_idx on app.application_status_history (user_id, changed_at desc);

alter table app.application_status_history enable row level security;

revoke all on app.application_status_history from public, anon, authenticated;
grant select on app.application_status_history to authenticated;
grant all on app.application_status_history to service_role;

create policy "status_history: read own" on app.application_status_history
  for select to authenticated using ((select auth.uid()) = user_id);

-- Runs as the table owner (security definer) so it can write history even though
-- signed in users have no insert permission on the table.
create function app.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into app.application_status_history (application_id, user_id, from_status, to_status, source)
    values (
      new.id,
      new.user_id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      case when auth.uid() is null then 'automation' else 'user' end
    );
  end if;
  return null;
end;
$$;

revoke all on function app.log_status_change() from public, anon, authenticated;

create trigger applications_status_history
  after insert or update of status on app.applications
  for each row execute function app.log_status_change();