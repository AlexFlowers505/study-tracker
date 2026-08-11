-- Normalises the single `study_data` blob into real tables.
--
-- Why: every save rewrote the whole document, so editing one cell in March
-- shipped five months of history; two open tabs silently overwrote each other;
-- and one bad write could take out everything at once. Row-per-day fixes all
-- three — a day edit becomes an upsert of one row.
--
-- Safe to run more than once, and safe on a database that never had the blob:
-- the backfill at the bottom is skipped when `study_data` is absent, which is
-- the normal case for a fresh dev project.
--
-- It does NOT touch `study_data` where that table does exist: it stays exactly
-- as it is, as a fallback, until the app has been running on the new tables
-- long enough to trust them.

-- ---------------------------------------------------------------- tables

create table if not exists projects (
  -- Keeps the app's own "project-xxxx" ids so nothing has to be re-keyed.
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Small, rarely-written documents. Splitting these into columns would buy
  -- nothing: they are read and written as a unit and never queried by field.
  settings    jsonb not null default '{}'::jsonb,
  slots       jsonb not null default '[]'::jsonb,
  categories  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects (user_id);

create table if not exists days (
  project_id  text not null references projects(id) on delete cascade,
  date        date not null,
  -- The per-slot entry lists stay jsonb: they're a nested, free-form list that
  -- is always read and written together with its day.
  cells       jsonb not null default '{}'::jsonb,
  lessons     integer not null default 0,
  exam        boolean not null default false,
  ignored     boolean not null default false,
  comment     text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (project_id, date)
);

create index if not exists days_project_date_idx on days (project_id, date);

create table if not exists period_notes (
  project_id  text not null references projects(id) on delete cascade,
  kind        text not null check (kind in ('week', 'month')),
  -- 'YYYY-MM-DD' (the Monday) for weeks, 'YYYY-MM' for months.
  key         text not null,
  note        text not null default '',
  ignored     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (project_id, kind, key)
);

create table if not exists user_prefs (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  active_project_id text,
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------------- RLS

alter table projects     enable row level security;
alter table days         enable row level security;
alter table period_notes enable row level security;
alter table user_prefs   enable row level security;

drop policy if exists "own projects" on projects;
create policy "own projects" on projects
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Days and notes have no user_id of their own; ownership is inherited from the
-- project, checked on both read and write.
drop policy if exists "own days" on days;
create policy "own days" on days
  for all using (
    exists (select 1 from projects p
            where p.id = days.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = days.project_id and p.user_id = auth.uid())
  );

drop policy if exists "own period notes" on period_notes;
create policy "own period notes" on period_notes
  for all using (
    exists (select 1 from projects p
            where p.id = period_notes.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = period_notes.project_id and p.user_id = auth.uid())
  );

drop policy if exists "own prefs" on user_prefs;
create policy "own prefs" on user_prefs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------- migrate the blob

-- Only the original project has a `study_data` table to migrate from. A fresh
-- project — a dev database, say — starts empty and has nothing to backfill, so
-- the whole block is skipped rather than failing on a missing relation.
--
-- It has to be a DO block for that: plpgsql resolves table names when a
-- statement actually runs, so the statements below are never looked up when
-- the guard returns first. Written out at top level they would fail to parse
-- no matter what guard sat in front of them.
do $mig$
begin
  if to_regclass('public.study_data') is null then
    raise notice 'study_data not present — fresh database, nothing to backfill';
    return;
  end if;

insert into projects (id, user_id, settings, slots, categories)
select p->>'id',
       d.user_id,
       coalesce(p->'settings',   '{}'::jsonb),
       coalesce(p->'slots',      '[]'::jsonb),
       coalesce(p->'categories', '[]'::jsonb)
from study_data d,
     jsonb_array_elements(d.data->'projects') p
where p->>'id' is not null
on conflict (id) do nothing;

insert into days (project_id, date, cells, lessons, exam, ignored, comment)
select p->>'id',
       (kv.key)::date,
       coalesce(kv.value->'cells', '{}'::jsonb),
       coalesce((kv.value->>'lessons')::int, 0),
       coalesce((kv.value->>'exam')::boolean, false),
       coalesce((kv.value->>'ignore')::boolean, false),
       coalesce(kv.value->>'comment', '')
from study_data d,
     jsonb_array_elements(d.data->'projects') p,
     jsonb_each(coalesce(p->'days', '{}'::jsonb)) kv
where kv.key ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (project_id, date) do nothing;

-- Notes and ignore flags were two separate maps in the blob; here they are two
-- columns of one row, so each map is applied in turn.
insert into period_notes (project_id, kind, key, note)
select p->>'id', 'week', kv.key, coalesce(kv.value #>> '{}', '')
from study_data d,
     jsonb_array_elements(d.data->'projects') p,
     jsonb_each(coalesce(p->'weekNotes', '{}'::jsonb)) kv
on conflict (project_id, kind, key) do update set note = excluded.note;

insert into period_notes (project_id, kind, key, ignored)
select p->>'id', 'week', kv.key, coalesce((kv.value)::boolean, false)
from study_data d,
     jsonb_array_elements(d.data->'projects') p,
     jsonb_each(coalesce(p->'weekIgnore', '{}'::jsonb)) kv
on conflict (project_id, kind, key) do update set ignored = excluded.ignored;

insert into period_notes (project_id, kind, key, note)
select p->>'id', 'month', kv.key, coalesce(kv.value #>> '{}', '')
from study_data d,
     jsonb_array_elements(d.data->'projects') p,
     jsonb_each(coalesce(p->'monthNotes', '{}'::jsonb)) kv
on conflict (project_id, kind, key) do update set note = excluded.note;

insert into period_notes (project_id, kind, key, ignored)
select p->>'id', 'month', kv.key, coalesce((kv.value)::boolean, false)
from study_data d,
     jsonb_array_elements(d.data->'projects') p,
     jsonb_each(coalesce(p->'monthIgnore', '{}'::jsonb)) kv
on conflict (project_id, kind, key) do update set ignored = excluded.ignored;

insert into user_prefs (user_id, active_project_id)
select d.user_id, d.data->>'activeProjectId'
from study_data d
on conflict (user_id) do update
  set active_project_id = excluded.active_project_id;

end
$mig$;

-- --------------------------------------------------------------- check it

-- Only meaningful where the blob existed. Run it afterwards on that database;
-- migrated and blob counts should match per project.
--
-- select p.id,
--        p.settings->>'projectName' as project,
--        (select count(*) from days x where x.project_id = p.id) as days_migrated,
--        b.days_in_blob
-- from projects p
-- left join (
--   select pr->>'id' as id,
--          (select count(*) from jsonb_object_keys(pr->'days')) as days_in_blob
--   from study_data d, jsonb_array_elements(d.data->'projects') pr
-- ) b on b.id = p.id;
