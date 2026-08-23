-- The balance: one mark per finished day, `spec 010` part 4.
--
-- A streak resets to zero, and that is the whole source of its power — "20" is
-- frightening to lose only because tomorrow it is either 21 or nothing. But it
-- leaves one hole nothing else covers: **the day after it breaks costs
-- nothing.** Zero minus zero. The most dangerous stretch is not the slip, it
-- is the week that follows it.
--
-- So a second counter runs beside the streak with a different job. A kept day
-- is +1, a missed day is −1, and it never resets — it is what the shop's
-- prices are denominated in, which is also what stops a second economy
-- existing at all: the thing you spend is the thing the streak already counts.
--
-- **A ledger, not a recomputation.** `005` and `012` are built on the same
-- rule and it matters more here, because this one can be *spent*: a day's mark
-- is written once, when the day leaves the editing window, and never revisited.
-- Editing yesterday must not retroactively change a balance you have already
-- bought something with. The primary key is what enforces "once".
--
-- `kept = false` rows matter as much as the true ones — that is the −1, and
-- recording only the successes would make a bad month free.
--
-- The rate is not stored, because it is not a setting. A configurable rate is
-- the forgeable part of any economy, and this one is meant to be as hard to
-- argue with as the streak it is denominated in.
--
-- Safe to run more than once.

create table if not exists day_ledger (
  project_id text not null references projects(id) on delete cascade,
  -- The day itself, not the week: a verdict here is a fact about one day.
  date       date not null,
  kept       boolean not null,
  sealed_at  timestamptz not null default now(),
  primary key (project_id, date)
);

create index if not exists day_ledger_project_idx
  on day_ledger (project_id, date);

alter table day_ledger enable row level security;

-- Ownership inherited from the project, same as days, notes and both verdict
-- ledgers.
drop policy if exists "own day ledger" on day_ledger;
create policy "own day ledger" on day_ledger
  for all using (
    exists (select 1 from projects p
            where p.id = day_ledger.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = day_ledger.project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Nothing is backfilled, and that is deliberate. Counting starts the day the
-- balance is switched on — `settings.balanceStart`, written by the app the
-- first time it runs with this table present. Backfilling would hand you a
-- year of savings in one second and make the first purchase free, which is the
-- same reason `startedOn` exists on a rule.
-- ---------------------------------------------------------------------------
