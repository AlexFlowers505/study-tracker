-- Rewards taken, `spec 010` part 6.
--
-- The shop is not a game store. Buying something here is **permitting
-- yourself to buy it in life**, which puts it in the same family as the edit
-- lock rather than in the same family as points: the app is the ledger of a
-- promise you made yourself about spending.
--
-- Priced in kept days, the balance's own unit. "50,000 points" is a number you
-- invented and can re-invent; forty kept days is not, and it is the same thing
-- the streak already counts — which is what stops a second economy existing at
-- all, because the currency *is* the promise.
--
-- The items live in `projects.settings` beside the tags, the rules and the
-- achievements. What was **bought** does not, for the same reason earned
-- achievements do not: the hand that edits a price must not be the hand that
-- edits what was paid.
--
-- Append-only and never refunded. The whole value of the ritual is that it
-- costs something, and something you can undo costs nothing. `label` and
-- `price` are stored with the row so it still reads after the item is deleted
-- — that purchase happened.
--
-- Keyed by the purchase rather than by the item, because a reward can be taken
-- more than once and each time is its own fact.
--
-- Safe to run more than once.

create table if not exists purchases (
  project_id  text not null references projects(id) on delete cascade,
  purchase_id text not null,
  item_id     text not null,
  -- What it was called and what it cost, at the moment it was taken.
  label       text not null default '',
  price       integer not null default 0,
  bought_at   timestamptz not null default now(),
  primary key (project_id, purchase_id)
);

create index if not exists purchases_project_idx
  on purchases (project_id, bought_at);

alter table purchases enable row level security;

-- Ownership inherited from the project, same as everything else here.
drop policy if exists "own purchases" on purchases;
create policy "own purchases" on purchases
  for all using (
    exists (select 1 from projects p
            where p.id = purchases.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = purchases.project_id and p.user_id = auth.uid())
  );
