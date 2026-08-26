-- A request for a second yes stops being only about editing a rule.
--
-- `018` built the channel for one act: loosening a rule's terms. Removal then
-- became a locked act too, and achievements grew the same lock — and a channel
-- that carries one of the three is a channel the other two route around, which
-- is a supervisor who can be stepped past by deleting the thing instead.
--
-- So a request now names **what it is about** and **what it would do**:
--
--   subject  'rule' | 'achievement'
--   action   'edit' | 'remove'
--
-- Both default to what every existing row already is, so nothing in flight
-- needs touching and an app that has not been updated goes on reading them
-- correctly.
--
-- **`rule_id` keeps its name and now holds either id.** Renaming a column is a
-- migration with a rewrite, a deploy ordering problem and a window where the
-- old client cannot read the new table — for a word. The row says which kind
-- it is in `subject`, which is the part that actually has to be unambiguous.
--
-- **`next_rule` becomes nullable.** A removal has no *after* to write: there
-- is nothing to apply, only a thing to take away. A `not null` column holding
-- `'{}'` to mean "no payload" is a null wearing a disguise.
--
-- The trigger from `018` is untouched. Which side may make which state
-- transition has not changed, and it is still enforced there rather than in
-- any client — a check that lives only in the client is a check anybody can
-- skip.
--
-- Safe to run twice: `add column if not exists`, and dropping a `not null`
-- that is already dropped is a no-op.

alter table rule_proposals
  add column if not exists subject text not null default 'rule';

alter table rule_proposals
  add column if not exists action text not null default 'edit';

alter table rule_proposals
  alter column next_rule drop not null;

-- Only the four combinations exist, and a typo in a client should fail loudly
-- here rather than quietly become a request nobody can act on.
alter table rule_proposals
  drop constraint if exists rule_proposals_subject_check;
alter table rule_proposals
  add constraint rule_proposals_subject_check
  check (subject in ('rule', 'achievement'));

alter table rule_proposals
  drop constraint if exists rule_proposals_action_check;
alter table rule_proposals
  add constraint rule_proposals_action_check
  check (action in ('edit', 'remove'));

-- ---------------------------------------------------------------------------
-- THE CHECK — safe on its own, changes nothing.
--
--   select id, subject, action, rule_id, rule_label, state
--     from rule_proposals order by created_at desc;
--
-- Everything written before today reads `rule` / `edit`, which is what it was.
-- ---------------------------------------------------------------------------
