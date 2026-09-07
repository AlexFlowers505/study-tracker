-- Moves `startedOn` forward on the weekly rules whose reading got stricter.
--
-- `weekBounds` and `weekSlotBounds` decided "does this condition carry a figure
-- per weekday?" by asking whether `clause.days` existed at all. It has not
-- meant that for some time — the map also carries which slots a weekday counts
-- in and what a named slot owes there — so the weekday picker and the
-- per-weekday slot grid both write a map with no figure in it, and the week's
-- own figure was multiplied by the number of days it judged. `at most 3 a week`
-- allowed twenty-one; a rule judged Mon–Fri lost its ceiling outright.
--
-- Fixing the reader fixes it *retroactively*. Nothing about a weekly rule's
-- streak is cached: `ruleStatus` recomputes every week since `startedOn` on
-- every render, so the deploy that ships the fix also re-judges every week you
-- have ever logged, and the weeks that quietly passed under a ceiling of
-- twenty-one turn red. The record was wrong, but it was wrong in a way you
-- lived with, and rewriting a year of it in one page load is not a decision
-- this migration should make for you. So those rules start judging from today.
--
-- ---------------------------------------------------------------------------
-- WHICH RULES, AND WHY THE PREDICATE IS NOT "HAS A `days` MAP".
--
-- That was the first draft and it is wrong in the expensive direction: a rule
-- written as "at most 1 on Monday, 2 on Tuesday" *does* carry per-day figures,
-- so both the old reader and the new one sum them, and it was never affected.
-- Resetting it would throw away a history it had earned honestly. Checked
-- against the real readers, the shapes that changed are exactly these:
--
--   * a `days` map with **no figures in it** — the weekday picker and the
--     per-weekday slot grid both write one, and the old reader summed the
--     shared pair once per judged day; and
--   * a `days` map with no per-day *slot* figures but a **shared slot rider**,
--     which the old reader summed the same way.
--
-- Everything else — no map at all, per-day figures, per-day slots — reads the
-- same to the byte before and after, and keeps its whole history. Every rule
-- judged by the day is untouched.
-- ---------------------------------------------------------------------------
--
-- WHAT IT COSTS. Each affected rule's streak restarts from nothing. Weeks
-- before the cutoff stop being judged by it at all — they read as `unjudged`
-- rather than as kept, so they neither extend a streak nor break one, and the
-- days in them lose that rule's vote in the composite.
--
-- WHAT IT DOES NOT TOUCH. Nothing in a ledger: `streak_verdicts` keeps every
-- freeze already earned, `day_ledger` keeps every point already marked, and
-- `achievements` keeps everything already reached. Those are written once and
-- never revisited, so the balance does not move.
--
-- THE WEEK YOU ARE IN. A weekly rule cannot judge a week it did not start at
-- the beginning of, so the current week keeps no verdict either way. A broken
-- *ceiling* still colours the day it broke on — `spec 018` decided that on
-- purpose, because "none in the evening" is broken the moment one lands there
-- and no amount of missing Monday takes it back. A floor stays silent.
--
-- ---------------------------------------------------------------------------
-- RUN THE CHECK AT THE BOTTOM OF THIS FILE FIRST. It names every rule that
-- would move and what its date would become, and changes nothing. Export your
-- JSON before running the migration itself.
-- ---------------------------------------------------------------------------
--
-- Safe to run twice — the guard records that it ran — but not idempotent on its
-- own: a second pass on another day would push the dates forward again.

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

alter table applied_migrations enable row level security;

do $$
declare
  -- **The cutoff, and set it by hand if you need to.** `current_date` is the
  -- server's, which is UTC; the app writes day keys in *your* local time. East
  -- of Greenwich late in the evening those are different days, and the one you
  -- want is the one your logbook is already using.
  cutoff         text := to_char(current_date, 'YYYY-MM-DD');
  moved_rules    int;
  moved_projects int;
begin
  if exists (select 1 from applied_migrations
             where name = '023_weekly_rules_start_today') then
    raise notice '023_weekly_rules_start_today: already applied, nothing to do';
    return;
  end if;

  with flagged as (
    select p.id  as project_id,
           r.ord as ord,
           r.value as rule,
           (
                 r.value->>'scope' = 'week'
             and coalesce(r.value->>'startedOn', '') < cutoff
             and exists (
                   select 1
                     from jsonb_array_elements(
                            coalesce(r.value->'clauses', '[]'::jsonb)
                          ) cl
                    where jsonb_typeof(cl.value->'days') = 'object'
                      and (
                        -- no figure on any weekday: the shared pair was being
                        -- summed once per judged day
                        not exists (
                          select 1
                            from jsonb_each(cl.value->'days') d
                           where d.value ? 'min' or d.value ? 'max'
                        )
                        or (
                          -- no per-day slot figures, but a shared rider that
                          -- was being summed the same way
                              not exists (
                                select 1
                                  from jsonb_each(cl.value->'days') d
                                 where jsonb_typeof(d.value->'slots') = 'object'
                                   and exists (
                                         select 1
                                           from jsonb_object_keys(d.value->'slots')
                                       )
                              )
                          and jsonb_typeof(cl.value->'slots') = 'object'
                          and exists (
                                select 1 from jsonb_object_keys(cl.value->'slots')
                              )
                        )
                      )
                 )
           ) as touch
      from projects p
      cross join lateral jsonb_array_elements(p.settings->'streakRules')
        with ordinality r(value, ord)
     where jsonb_typeof(p.settings->'streakRules') = 'array'
  ),
  rebuilt as (
    select project_id,
           jsonb_agg(
             case when touch
                  then jsonb_set(rule, '{startedOn}', to_jsonb(cutoff))
                  else rule
             end
             order by ord
           ) as rules,
           count(*) filter (where touch) as touched
      from flagged
     group by project_id
  ),
  written as (
    update projects p
       set settings = jsonb_set(p.settings, '{streakRules}', b.rules)
      from rebuilt b
     where b.project_id = p.id
       and b.touched > 0
    returning b.touched
  )
  select coalesce(sum(touched), 0), count(*)
    into moved_rules, moved_projects
    from written;

  insert into applied_migrations (name)
  values ('023_weekly_rules_start_today');

  raise notice
    '023_weekly_rules_start_today: moved % rule(s) across % project(s) to %',
    moved_rules, moved_projects, cutoff;
end $$;

-- ---------------------------------------------------------------------------
-- THE CHECK. Run this on its own first; it changes nothing.
--
-- Every rule that would move, with the date it has now and the date it would
-- get. If a rule you expected is missing, it was reading correctly all along
-- and keeps its history — see the note on the predicate above.
-- ---------------------------------------------------------------------------
--
-- select p.id                                as project,
--        r.value->>'label'                   as rule,
--        r.value->>'startedOn'               as starts_now,
--        to_char(current_date, 'YYYY-MM-DD') as would_start
--   from projects p
--   cross join lateral jsonb_array_elements(p.settings->'streakRules') r(value)
--  where jsonb_typeof(p.settings->'streakRules') = 'array'
--    and r.value->>'scope' = 'week'
--    and coalesce(r.value->>'startedOn', '') < to_char(current_date, 'YYYY-MM-DD')
--    and exists (
--          select 1
--            from jsonb_array_elements(coalesce(r.value->'clauses','[]'::jsonb)) cl
--           where jsonb_typeof(cl.value->'days') = 'object'
--             and (
--               not exists (
--                 select 1 from jsonb_each(cl.value->'days') d
--                  where d.value ? 'min' or d.value ? 'max'
--               )
--               or (
--                     not exists (
--                       select 1 from jsonb_each(cl.value->'days') d
--                        where jsonb_typeof(d.value->'slots') = 'object'
--                          and exists (select 1 from jsonb_object_keys(d.value->'slots'))
--                     )
--                 and jsonb_typeof(cl.value->'slots') = 'object'
--                 and exists (select 1 from jsonb_object_keys(cl.value->'slots'))
--               )
--             )
--        )
--  order by p.id, rule;
