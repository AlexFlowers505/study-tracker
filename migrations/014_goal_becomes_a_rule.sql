-- The main goal streak stops being a concept and becomes an ordinary rule.
--
-- Until now the app had exactly one hard-coded promise — hours against a
-- per-weekday goal — with its own streak, its own freeze ledger and its own
-- frozen-day flag. That was right while there was one promise and wrong the
-- moment there were five: a day stopped having a single verdict and got five,
-- and five verdicts do not add up.
--
-- So the goal joins the rules it should always have been one of, and the day's
-- colour becomes a verdict over every rule that has a vote. See `spec 010`.
--
-- Nothing is thrown away. The rule is created with the streak's own history
-- attached: the sealed weeks move from `week_verdicts` to `streak_verdicts`
-- under its id, so every banked freeze survives, and each `days.frozen` day
-- gains that id in `days.rule_freezes`, so every freeze already spent stays
-- spent. Old columns are left exactly where they are, unread — the same
-- treatment `lessons` and `exam` got in `009`.
--
-- The rule's id is fixed (`rule-daily-goal`) so this file and the application
-- agree about which rule is the goal without either having to guess.
--
-- ---------------------------------------------------------------------------
-- RUN THE CHECK AT THE BOTTOM OF THIS FILE FIRST. It shows what would be
-- created and how much history would move, and changes nothing. Export your
-- JSON before running the migration itself.
-- ---------------------------------------------------------------------------
--
-- Guarded, and needs to be: appending to a jsonb array is not idempotent on
-- its own. The body runs once and records that it did.

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

alter table applied_migrations enable row level security;

do $$
declare
  made_rules   int;
  moved_weeks  int;
  moved_days   int;
begin
  if exists (select 1 from applied_migrations
             where name = '014_goal_becomes_a_rule') then
    raise notice '014_goal_becomes_a_rule: already applied, nothing to do';
    return;
  end if;

  -- ---------------------------------------------------------------------
  -- 1. The rule itself, one per project that had a goal switched on.
  --
  -- `startedOn` is where freeze accounting began, because that is what the
  -- old streak was actually measured from. Falling back to the project's
  -- earliest logged day, and then to today, so a project that never sealed a
  -- week still gets a rule with an honest beginning rather than one that
  -- reaches back over history it never judged.
  --
  -- `freezesPerWeek` is 0 and `freezeCap` is 15: the old streak had no weekly
  -- allowance at all, only the freezes finished weeks earned, capped at
  -- FREEZE_CAP.
  -- ---------------------------------------------------------------------
  with target as (
    select p.id,
           coalesce(
             nullif(p.settings->>'freezeStart', ''),
             -- `days.date` is a real date column; everything else here is the
             -- app's 'YYYY-MM-DD' text, so it is rendered rather than cast.
             (select to_char(min(d.date), 'YYYY-MM-DD')
                from days d where d.project_id = p.id),
             to_char(now(), 'YYYY-MM-DD')
           ) as started_on
    from projects p
    where coalesce(p.settings->>'goalsEnabled', 'true') <> 'false'
      and not exists (
        select 1
        from jsonb_array_elements(
               coalesce(p.settings->'streakRules', '[]'::jsonb)) r
        where r.value->>'id' = 'rule-daily-goal'
      )
  )
  update projects p
  set settings = jsonb_set(
        p.settings,
        '{streakRules}',
        coalesce(p.settings->'streakRules', '[]'::jsonb) || jsonb_build_object(
          'id',          'rule-daily-goal',
          'label',       'Daily goal',
          'color',       '#D2740A',
          'iconName',    'Flame',
          'description', 'Hours against the goal set for that weekday.',
          'scope',       'day',
          'clauses',     jsonb_build_array(jsonb_build_object(
                           'id',           'rule-daily-goal-c1',
                           'target',       jsonb_build_object('kind', 'time'),
                           'op',           'atLeast',
                           'value',        0,
                           'useDailyGoal', true
                         )),
          'freezesPerWeek',    0,
          'freezeCap',         15,
          'startedOn',         t.started_on,
          'lockedUntil',       t.started_on,
          'inDayVerdict',      true,
          'inDayVerdictSince', t.started_on
        )
      )
  from target t
  where p.id = t.id;
  get diagnostics made_rules = row_count;

  -- ---------------------------------------------------------------------
  -- 2. The sealed weeks, so the banked freezes come with it.
  --
  -- `earned` and `kept` are the same fact under two names. On conflict do
  -- nothing: a verdict written once stays as written, which is the entire
  -- point of both ledgers.
  -- ---------------------------------------------------------------------
  insert into streak_verdicts (project_id, rule_id, week_key, kept, sealed_at)
  select w.project_id, 'rule-daily-goal', w.week_key, w.earned, w.sealed_at
  from week_verdicts w
  where exists (
    select 1 from projects p
    where p.id = w.project_id
      and exists (
        select 1
        from jsonb_array_elements(
               coalesce(p.settings->'streakRules', '[]'::jsonb)) r
        where r.value->>'id' = 'rule-daily-goal'
      )
  )
  on conflict (project_id, rule_id, week_key) do nothing;
  get diagnostics moved_weeks = row_count;

  -- ---------------------------------------------------------------------
  -- 3. The days already frozen, so nothing anybody paid for is refunded.
  -- ---------------------------------------------------------------------
  -- `rule_freezes` is jsonb, not a text array — `012` made it an array *in*
  -- jsonb so it could ride in the same row shape as everything else on a day.
  update days d
  set rule_freezes = d.rule_freezes || to_jsonb('rule-daily-goal'::text)
  where d.frozen is true
    and not (d.rule_freezes @> '["rule-daily-goal"]'::jsonb)
    and exists (
      select 1 from projects p
      where p.id = d.project_id
        and exists (
          select 1
          from jsonb_array_elements(
                 coalesce(p.settings->'streakRules', '[]'::jsonb)) r
          where r.value->>'id' = 'rule-daily-goal'
        )
    );
  get diagnostics moved_days = row_count;

  insert into applied_migrations (name) values ('014_goal_becomes_a_rule');

  raise notice '014_goal_becomes_a_rule: % rule(s) created, % sealed week(s) moved, % frozen day(s) marked',
    made_rules, moved_weeks, moved_days;
end $$;

-- ---------------------------------------------------------------------------
-- THE CHECK. Run this on its own first; it changes nothing.
--
--   select p.id,
--          p.settings->>'projectName'   as project,
--          p.settings->>'goalsEnabled'  as goals_on,
--          p.settings->>'freezeStart'   as freeze_start,
--          (select to_char(min(d.date), 'YYYY-MM-DD')
--             from days d where d.project_id = p.id) as first_day,
--          (select count(*) from week_verdicts w where w.project_id = p.id) as sealed_weeks,
--          (select count(*) from days d where d.project_id = p.id and d.frozen) as frozen_days,
--          exists (
--            select 1
--            from jsonb_array_elements(
--                   coalesce(p.settings->'streakRules', '[]'::jsonb)) r
--            where r.value->>'id' = 'rule-daily-goal'
--          ) as already_has_rule
--   from projects p
--   order by project;
--
-- `freeze_start` is what the rule will start from. If it is null the rule
-- starts at `first_day` instead, which means the whole history gets judged by
-- it — check that is what you want before running the migration.
-- ---------------------------------------------------------------------------
