-- 021 — sleep becomes an ordinary activity (spec 024)
--
-- Sleep behaved like an activity already: timed entries with a start, an end
-- and a duration. What it had instead of a slot and an activity was a column
-- of its own, a switch, a panel, a chart, a tab and a streak target kind.
--
-- The one thing that bought was keeping eight hours a night out of every
-- total, and `spec 022` took that argument away: the figure a period reports
-- is measured through the benchmark rule now, so what counts is what you
-- promised rather than everything you wrote down.
--
-- This moves every night into `days.cells` under a slot and an activity of its
-- own, creates those two in each project that needs them, and repoints any
-- streak condition that named `kind: "sleep"` at the new activity.
--
-- **Idempotent.** Every step is guarded on the thing it creates or empties, so
-- running it twice changes nothing the second time. It has to be: the app
-- folds unmigrated nights in memory and writes an empty `sleep` for any day
-- you edit, so some rows may already be migrated by the time this runs.
--
-- Apply it to BOTH projects — dev first, then production — or dev stops being
-- a rehearsal. Nothing is deleted: `days.sleep` is emptied, not dropped, so
-- the pre-migration state is still in the table's history.

begin;

-- ---------------------------------------------------------------- 1. the two
-- rows every migrated night needs. Only for projects that have a night to
-- move, and only when the id is not already there.
update projects p
set
  slots = case
    when not exists (
      select 1 from jsonb_array_elements(coalesce(p.slots, '[]'::jsonb)) s
      where s->>'id' = 'slot-sleep'
    )
    then coalesce(p.slots, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', 'slot-sleep',
      'label', 'Sleep',
      'color', '#8B6FB3',
      'iconName', 'Moon'
    ))
    else p.slots
  end,
  activities = case
    when not exists (
      select 1 from jsonb_array_elements(coalesce(p.activities, '[]'::jsonb)) a
      where a->>'id' = 'activity-sleep'
    )
    then coalesce(p.activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', 'activity-sleep',
      'label', 'Sleep',
      'color', '#8B6FB3',
      'iconName', 'Moon'
    ))
    else p.activities
  end
where exists (
  select 1 from days d
  where d.project_id = p.id
    and jsonb_typeof(d.sleep) = 'array'
    and jsonb_array_length(d.sleep) > 0
);

-- ---------------------------------------------------------------- 2. the
-- nights themselves, appended to whatever the sleep slot already holds so a
-- day migrated by the app keeps what it has. Each entry gains the activity it
-- never had and keeps its id, its times and its minutes.
update days d
set
  cells = jsonb_set(
    coalesce(d.cells, '{}'::jsonb),
    '{slot-sleep}',
    coalesce(d.cells->'slot-sleep', '[]'::jsonb) || (
      select coalesce(jsonb_agg(entry || jsonb_build_object('activity', 'activity-sleep')), '[]'::jsonb)
      from jsonb_array_elements(d.sleep) entry
      -- Never twice: an entry the app already folded and wrote is skipped.
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(d.cells->'slot-sleep', '[]'::jsonb)) kept
        where kept->>'id' = entry->>'id'
      )
    ),
    true
  ),
  sleep = '[]'::jsonb
where jsonb_typeof(d.sleep) = 'array'
  and jsonb_array_length(d.sleep) > 0;

-- ---------------------------------------------------------------- 3. any
-- streak condition that named sleep now names the activity.
--
-- The rule keeps meaning exactly what it meant: it counted the minutes in
-- `days.sleep`, and those minutes are the new activity's. Rewritten rather
-- than left to fall through to a default, because a condition whose target
-- stops resolving is a rule that quietly judges nothing — which is the one
-- failure this codebase is built to refuse.
update projects p
set settings = jsonb_set(
  p.settings,
  '{streakRules}',
  (
    select jsonb_agg(
      case
        when rule ? 'clauses' then jsonb_set(rule, '{clauses}', (
          select jsonb_agg(
            case
              when clause ? 'targets' then jsonb_set(clause, '{targets}', (
                select jsonb_agg(
                  case
                    when t->>'kind' = 'sleep'
                    then jsonb_build_object('kind', 'activity', 'id', 'activity-sleep')
                    else t
                  end
                )
                from jsonb_array_elements(clause->'targets') t
              ))
              when clause->'target'->>'kind' = 'sleep'
              then jsonb_set(clause, '{target}',
                jsonb_build_object('kind', 'activity', 'id', 'activity-sleep'))
              else clause
            end
          )
          from jsonb_array_elements(rule->'clauses') clause
        ))
        else rule
      end
    )
    from jsonb_array_elements(p.settings->'streakRules') rule
  ),
  true
)
where jsonb_typeof(p.settings->'streakRules') = 'array'
  and p.settings::text like '%"kind": "sleep"%';

-- ---------------------------------------------------------------- 4. the
-- switch that used to turn the whole thing on. It is nobody's setting now.
update projects
set settings = settings - 'sleepEnabled'
where settings ? 'sleepEnabled';

commit;
