-- The supervisor, `spec 010` part 7 — the only migration here that touches
-- more than one person's data. Read this header before running it.
--
-- The point of the whole lock is in the app already: "the point of setting a
-- limit in advance is to be the person who set it, not the person living under
-- it." A second person is the furthest that idea goes — and it is deliberately
-- **not** a second editor. They approve; you still author your own rules. You
-- simply cannot weaken one alone.
--
-- ---------------------------------------------------------------------------
-- THE ONE DESIGN RULE THAT KEEPS THIS SAFE
--
-- A proposal is **self-describing**. It carries the project's name, the rule's
-- label, the terms before and after as plain text, and the whole proposed rule
-- as jsonb. That is what lets the supervisor decide without ever reading your
-- project — so `projects`, `days`, `period_notes` and every ledger keep the
-- policies they have always had: yours, and nobody else's.
--
-- If a future change makes the supervisor read the project itself, that
-- guarantee is gone and the blast radius is back. Do not.
-- ---------------------------------------------------------------------------
--
-- Three tables, and each one earns its policy:
--
--   project_members     who supervises what
--   supervisor_invites  how they got there, by token
--   rule_proposals      the loosenings waiting on a decision
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Membership.
--
-- The policy reads `projects`, never `project_members` — a policy on a table
-- that queries the same table recurses, and the usual escape from that is a
-- SECURITY DEFINER function, which is exactly the patch that quietly bypasses
-- the check. Reading the parent avoids the whole problem.
-- ---------------------------------------------------------------------------
create table if not exists project_members (
  project_id text not null references projects(id) on delete cascade,
  user_id    uuid not null,
  role       text not null default 'supervisor',
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table project_members enable row level security;

drop policy if exists "read own membership" on project_members;
create policy "read own membership" on project_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from projects p
               where p.id = project_members.project_id
                 and p.user_id = auth.uid())
  );

-- Only the owner adds or removes a supervisor. A member cannot promote
-- themselves, and cannot add anyone else.
drop policy if exists "owner manages membership" on project_members;
create policy "owner manages membership" on project_members
  for all using (
    exists (select 1 from projects p
            where p.id = project_members.project_id
              and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from projects p
            where p.id = project_members.project_id
              and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. Invites.
--
-- The owner does not know the supervisor's user id, and Supabase does not
-- expose `auth.users` to the client. A random token is the secret that stands
-- in for the introduction.
--
-- The table is readable **only by its creator**, so nobody can enumerate
-- tokens through PostgREST. Claiming therefore cannot be a plain insert — it
-- goes through the function below, which is the one narrow place a
-- SECURITY DEFINER is warranted: it takes a token and nothing else, acts as
-- `auth.uid()` and no one else, and can grant nothing you do not already hold
-- the token for.
-- ---------------------------------------------------------------------------
create table if not exists supervisor_invites (
  token        text primary key,
  project_id   text not null references projects(id) on delete cascade,
  project_name text not null default '',
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  claimed_by   uuid,
  claimed_at   timestamptz
);

alter table supervisor_invites enable row level security;

drop policy if exists "own invites" on supervisor_invites;
create policy "own invites" on supervisor_invites
  for all using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and exists (select 1 from projects p
                where p.id = supervisor_invites.project_id
                  and p.user_id = auth.uid())
  );

create or replace function claim_supervisor_invite(invite_token text)
returns text
language plpgsql
security definer
-- An empty search_path so nothing on the caller's path can be resolved into
-- this function's body. Standard hardening for a definer function.
set search_path = public, pg_temp
as $$
declare
  inv supervisor_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into inv
  from supervisor_invites
  where token = invite_token and claimed_by is null
  for update;

  if not found then
    raise exception 'this invite is not valid any more';
  end if;

  if inv.created_by = auth.uid() then
    raise exception 'you cannot supervise your own project';
  end if;

  insert into project_members (project_id, user_id, role)
  values (inv.project_id, auth.uid(), 'supervisor')
  on conflict (project_id, user_id) do nothing;

  update supervisor_invites
  set claimed_by = auth.uid(), claimed_at = now()
  where token = invite_token;

  return inv.project_name;
end $$;

revoke all on function claim_supervisor_invite(text) from public;
grant execute on function claim_supervisor_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Proposals.
--
-- Self-describing, so the supervisor never touches the project. The owner
-- writes them; the supervisor decides them; the owner applies what was
-- allowed. Nothing here can write to `projects` — applying an approved
-- proposal is the owner's own app doing its own ordinary settings write.
-- ---------------------------------------------------------------------------
create table if not exists rule_proposals (
  id            text primary key,
  project_id    text not null references projects(id) on delete cascade,
  owner_id      uuid not null,
  supervisor_id uuid not null,
  rule_id       text not null,
  -- Everything the decision needs, so that reading the project is unnecessary.
  project_name  text not null default '',
  rule_label    text not null default '',
  before_text   text not null default '',
  after_text    text not null default '',
  reason        text not null default '',
  -- Applied verbatim by the owner's app once allowed.
  next_rule     jsonb not null,
  state         text not null default 'pending',
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

create index if not exists rule_proposals_supervisor_idx
  on rule_proposals (supervisor_id, state);
create index if not exists rule_proposals_project_idx
  on rule_proposals (project_id, state);

alter table rule_proposals enable row level security;

drop policy if exists "see your own proposals" on rule_proposals;
create policy "see your own proposals" on rule_proposals
  for select using (owner_id = auth.uid() or supervisor_id = auth.uid());

-- Only the owner raises one, and only against a project they own.
drop policy if exists "owner raises proposals" on rule_proposals;
create policy "owner raises proposals" on rule_proposals
  for insert with check (
    owner_id = auth.uid()
    and supervisor_id <> auth.uid()
    and exists (select 1 from projects p
                where p.id = rule_proposals.project_id
                  and p.user_id = auth.uid())
  );

-- Both sides may update — but *which* transitions each may make is enforced
-- by the trigger below, not by the policy. Row-level security cannot say
-- "this column, by this person", and pretending it can is how a check gets
-- quietly skipped.
drop policy if exists "either side updates" on rule_proposals;
create policy "either side updates" on rule_proposals
  for update using (owner_id = auth.uid() or supervisor_id = auth.uid())
  with check (owner_id = auth.uid() or supervisor_id = auth.uid());

create or replace function rule_proposal_transition()
returns trigger
language plpgsql
as $$
begin
  if new.state is distinct from old.state then
    -- The whole feature in one branch: you cannot allow your own loosening.
    if new.state in ('approved', 'refused') and auth.uid() <> old.supervisor_id then
      raise exception 'only the supervisor decides a proposal';
    end if;
    -- Withdrawing and applying are the owner's, and applying only what was
    -- already allowed.
    if new.state = 'withdrawn' and auth.uid() <> old.owner_id then
      raise exception 'only the owner withdraws a proposal';
    end if;
    -- 'closed' is the owner acknowledging a decision — folding an approval
    -- into the rule, or reading a refusal. Both, because a refusal has to be
    -- disposed of too and calling that "applied" would be a lie.
    if new.state = 'closed'
       and (auth.uid() <> old.owner_id
            or old.state not in ('approved', 'refused')) then
      raise exception 'only a decided proposal can be closed, by its owner';
    end if;
    if old.state <> 'pending' and new.state in ('approved', 'refused') then
      raise exception 'this proposal has already been decided';
    end if;
  end if;
  -- The terms cannot change under a decision that was made about them.
  if new.next_rule is distinct from old.next_rule
     or new.rule_id is distinct from old.rule_id then
    raise exception 'a proposal cannot be rewritten';
  end if;
  return new;
end $$;

drop trigger if exists rule_proposal_transition_check on rule_proposals;
create trigger rule_proposal_transition_check
  before update on rule_proposals
  for each row execute function rule_proposal_transition();

-- ---------------------------------------------------------------------------
-- WHAT TO CHECK AFTER RUNNING, WITH TWO ACCOUNTS
--
--   1. As the owner: Setup → Streaks → Supervisor → create an invite link.
--   2. As the second account: open that link. It should say which project it
--      joined. Opening it a second time must fail.
--   3. As the owner: try to loosen a rule. It should ask for a reason and then
--      send a request instead of applying.
--   4. As the second account: the request appears with the before/after text.
--      Confirm the second account can see NOTHING else — no days, no log.
--   5. Refuse it. The owner's clock should restart.
--   6. As the owner, try `update rule_proposals set state='approved'` in the
--      SQL editor is NOT a valid test — the editor runs as the owner of the
--      database and bypasses both RLS and `auth.uid()`. Test it from the app.
-- ---------------------------------------------------------------------------
