-- Streak freezes.
--
-- Two additions, and the second one is the whole design.
--
-- `days.frozen` is where a spent freeze lives: a day flag, permanent once set.
--
-- `week_verdicts` is the ledger that makes earning safe. A freeze is NOT
-- recomputed from the current data — if it were, you could break a past week,
-- fix it again, and mint a new freeze every round trip. Instead every finished
-- week gets exactly one verdict row, written once and never revisited. The
-- primary key is what enforces "once": a second grant for the same week cannot
-- be inserted. Editing that week afterwards still changes its colours and the
-- displayed streak — it just cannot change the verdict.
--
-- `earned = false` rows matter as much as the true ones. Recording only the
-- successes would leave the same hole from the other side: fail a week, edit
-- it later, find no verdict, grant one.
--
-- Safe to run more than once.

alter table days add column if not exists frozen boolean not null default false;

create table if not exists week_verdicts (
  project_id text not null references projects(id) on delete cascade,
  -- 'YYYY-MM-DD', the Monday of the week.
  week_key   text not null,
  earned     boolean not null,
  sealed_at  timestamptz not null default now(),
  primary key (project_id, week_key)
);

create index if not exists week_verdicts_project_idx
  on week_verdicts (project_id, week_key);

alter table week_verdicts enable row level security;

-- Ownership inherited from the project, same as days and notes.
drop policy if exists "own week verdicts" on week_verdicts;
create policy "own week verdicts" on week_verdicts
  for all using (
    exists (select 1 from projects p
            where p.id = week_verdicts.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = week_verdicts.project_id and p.user_id = auth.uid())
  );
