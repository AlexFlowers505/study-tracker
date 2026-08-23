-- Earned achievements, `spec 010` part 5.
--
-- Everything else in this app is built on fear: a streak is what you lose, a
-- red day is what you avoid, the balance is what a bad week costs. An
-- achievement is the other pole — **it cannot be taken away** — and it is the
-- only reason the history is worth having accumulated rather than survived.
--
-- The definitions live in `projects.settings` alongside the tags and the
-- streak rules, because they are small and read as a unit. What is *earned*
-- does not, and that separation is the whole point: **the hand that edits the
-- definitions must not be the hand that edits what was earned.** In settings
-- an achievement would be forgeable by lowering a number.
--
-- Written once, with its date and the figure it stood at, and never
-- recomputed. What was reached was reached; editing the past cannot un-reach
-- it and cannot re-mint it either. The primary key is what enforces "once",
-- exactly as in `005`, `012` and `015`.
--
-- `value` is kept so a row still reads after its definition is deleted. A
-- deleted rule does not delete the achievement it was earned against — that
-- happened, and the ledger is not in the business of forgetting.
--
-- Safe to run more than once.

create table if not exists achievements (
  project_id     text not null references projects(id) on delete cascade,
  achievement_id text not null,
  earned_at      timestamptz not null default now(),
  -- What the counted figure stood at when it was reached.
  value          integer not null default 0,
  primary key (project_id, achievement_id)
);

create index if not exists achievements_project_idx
  on achievements (project_id, earned_at);

alter table achievements enable row level security;

-- Ownership inherited from the project, same as days, notes, both verdict
-- ledgers and the day ledger.
drop policy if exists "own achievements" on achievements;
create policy "own achievements" on achievements
  for all using (
    exists (select 1 from projects p
            where p.id = achievements.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = achievements.project_id and p.user_id = auth.uid())
  );
