-- A short history of edits, so "I changed a time and can't remember what it
-- was" has an answer.
--
-- Its own table rather than a column on `projects`: the log is appended to on
-- every edit, and putting it on the project row would rewrite settings, slots
-- and categories each time — the whole-document write the schema moved away
-- from.
--
-- Safe to run more than once.

create table if not exists change_log (
  id          text primary key,
  project_id  text not null references projects(id) on delete cascade,
  at          timestamptz not null default now(),
  title       text not null default '',
  -- Free-form lines describing the change; read and written as a unit.
  details     jsonb not null default '[]'::jsonb
);

-- The log is only ever read newest-first for one project.
create index if not exists change_log_project_at_idx
  on change_log (project_id, at desc);

alter table change_log enable row level security;

drop policy if exists "own change log" on change_log;
create policy "own change log" on change_log
  for all using (
    exists (select 1 from projects p
            where p.id = change_log.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = change_log.project_id and p.user_id = auth.uid())
  );
