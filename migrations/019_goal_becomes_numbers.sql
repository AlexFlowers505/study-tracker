-- The daily goal stops being a thing a rule can point at.
--
-- `014` turned the hard-coded goal streak into an ordinary rule whose single
-- condition read `useDailyGoal` — "at least whatever the goal says today". That
-- was the right move then: a condition carried one number and the goal was
-- seven, so pointing at it was the only way to say "hold me to my goal"
-- without writing seven conditions that drift apart the first time either side
-- is edited.
--
-- A condition can now say all seven itself (`clauses[].days`, `spec 011`
-- stage 3b), so the pointer has nothing left to do — and it was never free.
-- **It is a hole in the lock.** The goal is edited in Setup's Project tab,
-- which never goes near `ruleEdit`, so lowering it lowered every rule reading
-- it with no clock, no reason and no record. `goalCutEdit` narrowed that door;
-- this shuts it, by removing the thing on the other side.
--
-- So: every condition that pointed at the goal is rewritten to hold the
-- figures it was pointing at, and the rule it belongs to becomes the project's
-- **benchmark** — the one rule the displayed "goal 3h" is read from. Nothing
-- changes about what any rule asks or what any day is worth; the same seven
-- numbers simply move from a settings field into the promise that used them.
--
-- ---------------------------------------------------------------------------
-- RUN THE CHECK AT THE BOTTOM FIRST. It shows exactly which rules would be
-- rewritten and to what, and changes nothing. Export your JSON before running
-- the migration itself.
-- ---------------------------------------------------------------------------
--
-- Guarded: rewriting jsonb in place is not idempotent on its own.

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

alter table applied_migrations enable row level security;

do $$
declare
  touched int;
begin
  if exists (select 1 from applied_migrations
             where name = '019_goal_becomes_numbers') then
    raise notice '019_goal_becomes_numbers: already applied, nothing to do';
    return;
  end if;

  -- -------------------------------------------------------------------
  -- Every clause carrying `useDailyGoal` gains a `days` map built from that
  -- project's own `dailyGoals`, keyed the way `getDay()` keys them — 0 is
  -- Sunday — and loses the flag along with the placeholder `op`/`value` it
  -- kept beside it.
  --
  -- A weekday with no figure in `dailyGoals` reads as zero, which is a floor
  -- every day clears. That is what the app did with it before, so a project
  -- with gaps keeps behaving exactly as it did.
  -- -------------------------------------------------------------------
  with rewritten as (
    select
      p.id,
      jsonb_agg(
        case
          when exists (
            select 1
            from jsonb_array_elements(coalesce(r.value->'clauses', '[]'::jsonb)) cl
            where (cl.value->>'useDailyGoal')::boolean is true
          )
          then jsonb_set(
                 r.value,
                 '{clauses}',
                 (
                   select jsonb_agg(
                     case
                       when (cl.value->>'useDailyGoal')::boolean is true
                       then (cl.value - 'useDailyGoal' - 'op' - 'value')
                            || jsonb_build_object(
                                 'days',
                                 (
                                   select jsonb_object_agg(
                                            wd::text,
                                            jsonb_build_object(
                                              'min',
                                              coalesce(
                                                (p.settings->'dailyGoals'->>wd::text)::int,
                                                0)
                                            )
                                          )
                                   from generate_series(0, 6) as wd
                                 )
                               )
                       else cl.value
                     end
                     order by cl.ord
                   )
                   from jsonb_array_elements(r.value->'clauses')
                        with ordinality as cl(value, ord)
                 )
               )
          else r.value
        end
        order by r.ord
      ) as rules,
      -- The rule that was reading the goal becomes where the goal is read
      -- from, unless one has already been nominated by hand.
      coalesce(
        p.settings->>'benchmarkRuleId',
        (
          select r2.value->>'id'
          from jsonb_array_elements(p.settings->'streakRules') r2
          where exists (
            select 1
            from jsonb_array_elements(coalesce(r2.value->'clauses', '[]'::jsonb)) cl2
            where (cl2.value->>'useDailyGoal')::boolean is true
          )
          limit 1
        )
      ) as benchmark
    from projects p
    cross join lateral jsonb_array_elements(
      coalesce(p.settings->'streakRules', '[]'::jsonb)
    ) with ordinality as r(value, ord)
    where exists (
      select 1
      from jsonb_array_elements(coalesce(p.settings->'streakRules', '[]'::jsonb)) r3,
           jsonb_array_elements(coalesce(r3.value->'clauses', '[]'::jsonb)) cl3
      where (cl3.value->>'useDailyGoal')::boolean is true
    )
    group by p.id, p.settings
  )
  update projects p
  set settings =
        jsonb_set(p.settings, '{streakRules}', w.rules)
        || case
             when w.benchmark is null then '{}'::jsonb
             else jsonb_build_object('benchmarkRuleId', w.benchmark)
           end
  from rewritten w
  where p.id = w.id;
  get diagnostics touched = row_count;

  insert into applied_migrations (name) values ('019_goal_becomes_numbers');

  raise notice '019_goal_becomes_numbers: % project(s) rewritten', touched;
end $$;

-- ---------------------------------------------------------------------------
-- `settings.dailyGoals` is deliberately **left where it is**.
--
-- Nothing reads it after this, and that is exactly why it costs nothing to
-- keep: it is the source these figures came from, and a migration that erases
-- its own input leaves nobody able to check its work. The same treatment
-- `lessons`, `exam` and `relation` got.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- THE CHECK. Run this on its own first; it changes nothing.
--
--   select p.settings->>'projectName'  as project,
--          p.settings->'dailyGoals'    as goals,
--          p.settings->>'benchmarkRuleId' as benchmark_now,
--          r.value->>'id'              as rule_id,
--          r.value->>'label'           as rule_label,
--          cl.value->>'useDailyGoal'   as reads_the_goal
--   from projects p
--   cross join lateral jsonb_array_elements(
--     coalesce(p.settings->'streakRules', '[]'::jsonb)) r
--   cross join lateral jsonb_array_elements(
--     coalesce(r.value->'clauses', '[]'::jsonb)) cl
--   where (cl.value->>'useDailyGoal')::boolean is true
--   order by project;
--
-- Every row listed will have its condition rewritten to the figures in
-- `goals`, and the first such rule per project becomes `benchmarkRuleId` if
-- that is not already set.
--
-- AFTER RUNNING, check the rule reads back the way it should:
--
--   select p.settings->>'projectName' as project,
--          r.value->>'label'          as rule,
--          cl.value->'days'           as per_weekday
--   from projects p
--   cross join lateral jsonb_array_elements(
--     coalesce(p.settings->'streakRules', '[]'::jsonb)) r
--   cross join lateral jsonb_array_elements(
--     coalesce(r.value->'clauses', '[]'::jsonb)) cl
--   where cl.value ? 'days';
-- ---------------------------------------------------------------------------
