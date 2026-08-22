-- Custom streaks — `spec 009`, part 2.
--
-- The rules themselves need nothing here: they ride in `projects.settings`,
-- which is already one jsonb blob read as a unit, exactly as tags do. What
-- needs storage is the two things a rule produces.
--
-- `days.rule_freezes` is where a spent freeze lives — the ids of the rules
-- frozen on that day, permanent once set, the per-rule counterpart of
-- `days.frozen`. A *weekly* rule's freeze is recorded on the Monday of the
-- week it covers: a week has no row of its own, and its first day is the one
-- place both halves of the app can agree to look.
--
-- `streak_verdicts` is the ledger, and it exists for the same reason
-- `week_verdicts` does — see `005`. A reward is NOT recomputed from the
-- current data: if it were, you could break a past week, fix it again, and
-- mint a new freeze every round trip. Every finished week gets exactly one
-- verdict per rule, written once and never revisited, and the primary key is
-- what enforces "once".
--
-- `kept = false` rows matter as much as the true ones, for the same reason
-- they do in `005`: recording only the successes leaves the hole open from the
-- other side — fail a week, edit it later, find no verdict, grant one.
--
-- `rule_id` is a text id the app generates, not a foreign key. Deleting a rule
-- deliberately leaves its verdicts behind: it takes the streak with it either
-- way, and a rule brought back under the same id should find its own history
-- rather than a clean slate.
--
-- Run after `011`. Safe to run more than once.

alter table days add column if not exists rule_freezes jsonb not null default '[]';

create table if not exists streak_verdicts (
  project_id text not null references projects(id) on delete cascade,
  rule_id    text not null,
  -- 'YYYY-MM-DD', the Monday of the week.
  week_key   text not null,
  kept       boolean not null,
  sealed_at  timestamptz not null default now(),
  primary key (project_id, rule_id, week_key)
);

create index if not exists streak_verdicts_project_idx
  on streak_verdicts (project_id, rule_id, week_key);

alter table streak_verdicts enable row level security;

-- Ownership inherited from the project, same as days, notes and week verdicts.
drop policy if exists "own streak verdicts" on streak_verdicts;
create policy "own streak verdicts" on streak_verdicts
  for all using (
    exists (select 1 from projects p
            where p.id = streak_verdicts.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = streak_verdicts.project_id and p.user_id = auth.uid())
  );
