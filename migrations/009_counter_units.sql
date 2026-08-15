-- Counter units: one user-defined list replacing the two hard-coded tallies.
--
-- `lessons` (a number) and `exam` (a boolean) were never two features. They
-- were one feature — count something per day against an optional target —
-- built twice. A boolean is a counter that stops at one, so the exam flag
-- migrates to a unit whose values happen to be 0 or 1, and nothing downstream
-- has to know which kind it started as.
--
-- ---------------------------------------------------------------------------
-- Export your JSON before running this. It rewrites nothing, but it is the
-- first migration to reshape data people typed rather than data the app
-- derived, and a backup costs one click.
-- ---------------------------------------------------------------------------
--
-- NOT safe to run twice on its own: step 3 would append a second copy of each
-- synthesised unit. The `applied_migrations` guard is what makes it safe, the
-- same way it does for `004`.
--
-- `days.lessons` and `days.exam` are deliberately LEFT IN PLACE. Same
-- treatment `study_data` got: no longer read or written once the app ships
-- this, kept as a frozen pre-migration snapshot until the new shape has been
-- trusted for a while. Dropping them is a separate migration, later.

-- ------------------------------------------------------------------ columns

alter table days
  add column if not exists counters jsonb not null default '{}'::jsonb;

alter table projects
  add column if not exists counter_units jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------------ backfill

do $mig$
declare
  units_made int := 0;
  days_filled int := 0;
begin
  if exists (select 1 from applied_migrations
             where name = '009_counter_units') then
    raise notice '009_counter_units: already applied, nothing to do';
    return;
  end if;

  -- The two units the user would have created by hand, carrying their totals
  -- over from settings. Built only where the feature was actually on: a
  -- project that never tracked exams must not inherit an empty exam unit.
  --
  -- `lessonsEnabled` / `examsEnabled` default to ON when absent, which is what
  -- the app itself does (`!== false`), so a project predating those settings
  -- gets both.
  update projects p
     set counter_units = (
           select coalesce(jsonb_agg(u order by ord), '[]'::jsonb)
             from (
               select 1 as ord, jsonb_build_object(
                        'id',       'unit-lessons',
                        'label',    'Lessons',
                        'iconName', 'GraduationCap',
                        'color',    '#4C8FBD',
                        'relation', 'positive'
                      )
                      -- Omitted entirely rather than stored as 0: no total and
                      -- a total of zero are different things.
                      || case
                           when coalesce((p.settings->>'totalLessons')::numeric, 0) > 0
                           then jsonb_build_object(
                                  'total',
                                  (p.settings->>'totalLessons')::numeric)
                           else '{}'::jsonb
                         end as u
                where coalesce((p.settings->>'lessonsEnabled')::boolean, true)
               union all
               select 2 as ord, jsonb_build_object(
                        'id',       'unit-exams',
                        'label',    'Exams',
                        'iconName', 'Award',
                        'color',    '#C1595B',
                        'relation', 'positive'
                      )
                      || case
                           when coalesce((p.settings->>'totalExams')::numeric, 0) > 0
                           then jsonb_build_object(
                                  'total',
                                  (p.settings->>'totalExams')::numeric)
                           else '{}'::jsonb
                         end as u
                where coalesce((p.settings->>'examsEnabled')::boolean, true)
             ) s
         ),
         updated_at = now()
   where jsonb_array_length(p.counter_units) = 0;

  get diagnostics units_made = row_count;

  -- A zero or a false writes no key at all, so an untouched day keeps an empty
  -- object. Storing explicit zeroes would make every day in the history look
  -- like a day someone had deliberately marked as none.
  update days d
     set counters = (
           case when coalesce(d.lessons, 0) <> 0
                then jsonb_build_object('unit-lessons', d.lessons)
                else '{}'::jsonb end
           ||
           case when coalesce(d.exam, false)
                then jsonb_build_object('unit-exams', 1)
                else '{}'::jsonb end
         ),
         updated_at = now()
   where (coalesce(d.lessons, 0) <> 0 or coalesce(d.exam, false))
     and d.counters = '{}'::jsonb;

  get diagnostics days_filled = row_count;

  insert into applied_migrations (name) values ('009_counter_units');

  raise notice '009_counter_units: % projects given units, % days backfilled',
    units_made, days_filled;
end
$mig$;

-- --------------------------------------------------------------- check it

-- Run afterwards. Every row should show the tally and the counter agreeing;
-- an empty result means there was nothing recorded to carry over.
--
-- select d.project_id,
--        d.date,
--        d.lessons                        as old_lessons,
--        d.counters->>'unit-lessons'      as new_lessons,
--        d.exam                           as old_exam,
--        d.counters->>'unit-exams'        as new_exam
--   from days d
--  where coalesce(d.lessons, 0) <> 0 or coalesce(d.exam, false)
--  order by d.date;

-- And the units themselves:
--
-- select id, settings->>'projectName' as project,
--        jsonb_pretty(counter_units) as units
--   from projects;
