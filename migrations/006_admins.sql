-- Who sees the Export / Import controls.
--
-- Read this before relying on it: **this is a UI gate, not a security
-- boundary.** Import writes through the same anon key and the same RLS
-- policies as every other edit in the app, so a signed-in user can upsert
-- their own rows with a handful of fetch() calls whether or not a button is on
-- screen. Nothing here changes that, and nothing here could.
--
-- What actually protects the data is RLS, and it already covers the worry that
-- prompted this table: every policy from 001 onwards scopes a row to its
-- owner, so no import can reach another account's logbook. The worst a user
-- can do with a hand-made JSON file is corrupt their own. Hiding the buttons
-- keeps a sharp tool out of the way of people who have no use for it; it is
-- not a defence against someone determined.
--
-- There is deliberately no insert / update / delete policy. A user may read
-- their own row and nothing else, so admin cannot be self-granted through the
-- API — only from the SQL editor, which runs as the table owner and bypasses
-- RLS. That part *is* a real boundary, and it is the only one this file adds.
--
-- Safe to run more than once.

create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- Why this account has it, for whoever reads the table in a year.
  note       text not null default '',
  granted_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Select only. Absent policies deny, so writes are impossible through PostgREST.
drop policy if exists "read own admin row" on admins;
create policy "read own admin row" on admins
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------------ grant

-- Run once per database, with your own address. Admin is per Supabase project:
-- the dev project has its own auth.users, so its uuid differs from production's
-- even for the same email.
--
-- insert into admins (user_id, note)
-- select id, 'owner'
--   from auth.users
--  where email = 'you@example.com'
-- on conflict (user_id) do nothing;

-- Check it landed:
--
-- select a.user_id, u.email, a.note, a.granted_at
--   from admins a join auth.users u on u.id = a.user_id;
