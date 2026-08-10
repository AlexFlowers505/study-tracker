-- Moves sleep entries onto the day the night *ended*.
--
-- The app used to file a night under the day it started: bedtime 23:30 on the
-- 3rd lived on the 3rd. It now files a night under the morning you wake up —
-- the night of the 3rd into the 4th is the 4th's row, which is how you think
-- about it the morning after. Entries logged before that change are still on
-- the bedtime day and read one day early everywhere.
--
-- Only entries that cross midnight move. A nap at 13:00–14:00, or a night that
-- began at 01:00, started and ended on the same day under both rules, so they
-- are already right and are left alone. Entries without both times carry no
-- information about which day they ended on and are also left alone.
--
-- ---------------------------------------------------------------------------
-- RUN THE CHECK AT THE BOTTOM OF THIS FILE FIRST. It shows exactly which
-- entries would move and where, and changes nothing. Export your JSON before
-- running the migration itself.
-- ---------------------------------------------------------------------------
--
-- This one is NOT safe to run twice on its own: a night that crossed midnight
-- still crosses midnight after it moves, so a second pass would shift it again.
-- The guard below makes it safe — the body runs once and records that it did.

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

-- Bookkeeping, not user data. RLS on with no policy at all means PostgREST
-- can see the table but nobody can read a row through it; the SQL editor runs
-- as the owner and bypasses RLS.
alter table applied_migrations enable row level security;

do $$
declare
  moved_entries int;
  moved_days    int;
begin
  if exists (select 1 from applied_migrations
             where name = '004_sleep_night_end') then
    raise notice '004_sleep_night_end: already applied, nothing to do';
    return;
  end if;

  -- Temp tables outlive a rolled-back statement only if one was left behind by
  -- hand in this session; cheap insurance against a stale one.
  drop table if exists _sleep_shift;

  -- A snapshot of every day holding at least one crossing entry, split into
  -- the part that stays and the part that moves. Taken up front because the
  -- day a night moves *to* may itself be a day a night moves *from*, and the
  -- split has to be decided on the original contents in both cases.
  create temp table _sleep_shift as
  with exploded as (
    select d.project_id,
           d.date,
           e.value as entry,
           e.ord,
           (    e.value->>'start' ~ '^[0-9]{1,2}:[0-9]{2}$'
            and e.value->>'end'   ~ '^[0-9]{1,2}:[0-9]{2}$'
            -- Zero-padded "HH:MM" sorts chronologically as text; lpad covers
            -- a stray "9:30" that never got padded.
            and lpad(e.value->>'end', 5, '0') < lpad(e.value->>'start', 5, '0')
           ) as crosses
    from days d
    cross join lateral jsonb_array_elements(d.sleep)
      with ordinality e(value, ord)
    where jsonb_typeof(d.sleep) = 'array'
  )
  select project_id,
         date,
         coalesce(jsonb_agg(entry order by ord) filter (where crosses),
                  '[]'::jsonb) as moving,
         coalesce(jsonb_agg(entry order by ord) filter (where not crosses),
                  '[]'::jsonb) as staying
  from exploded
  group by project_id, date
  having bool_or(crosses);

  select count(*), coalesce(sum(jsonb_array_length(moving)), 0)
    into moved_days, moved_entries
  from _sleep_shift;

  -- Strip first, merge second. After the strip a destination row holds only
  -- its own keepers, so appending what arrives can never re-move an entry.
  update days d
     set sleep = s.staying,
         updated_at = now()
    from _sleep_shift s
   where d.project_id = s.project_id
     and d.date = s.date;

  -- The destination day may not exist yet — a night that ended on a morning
  -- with nothing else logged is a real day, with an empty study side.
  insert into days (project_id, date, sleep)
  select s.project_id, s.date + 1, s.moving
    from _sleep_shift s
      on conflict (project_id, date) do update
     set sleep = coalesce(days.sleep, '[]'::jsonb) || excluded.sleep,
         updated_at = now();

  insert into applied_migrations (name) values ('004_sleep_night_end');
  drop table _sleep_shift;

  raise notice '004_sleep_night_end: moved % entries across % days',
    moved_entries, moved_days;
end $$;

-- --------------------------------------------------------------- check it

-- Run this BEFORE the migration to preview it. Each row is one night that is
-- filed a day early.
--
-- It is NOT a post-migration check, and re-running it afterwards proves
-- nothing: a night that crossed midnight still crosses midnight once it has
-- moved, so the same rows come back with `filed_on` one day later. Under the
-- new rule that is the correct resting place, not a pending move. To confirm
-- the migration ran, look for its row in `applied_migrations`.
--
select d.project_id,
       d.date                       as filed_on,
       d.date + 1                   as should_be,
       e.value->>'start'            as bedtime,
       e.value->>'end'              as wake,
       (select count(*) from days t
         where t.project_id = d.project_id
           and t.date = d.date + 1)  as target_row_exists,
       (select jsonb_array_length(t.sleep) from days t
         where t.project_id = d.project_id
           and t.date = d.date + 1)  as target_sleep_entries
from days d
cross join lateral jsonb_array_elements(d.sleep) e
where jsonb_typeof(d.sleep) = 'array'
  and e.value->>'start' ~ '^[0-9]{1,2}:[0-9]{2}$'
  and e.value->>'end'   ~ '^[0-9]{1,2}:[0-9]{2}$'
  and lpad(e.value->>'end', 5, '0') < lpad(e.value->>'start', 5, '0')
order by d.project_id, d.date;

-- Totals, if you just want the size of it:

select count(*) as entries_to_move,
       count(distinct d.date) as days_touched,
       min(d.date) as earliest,
       max(d.date) as latest
from days d
cross join lateral jsonb_array_elements(d.sleep) e
where jsonb_typeof(d.sleep) = 'array'
  and e.value->>'start' ~ '^[0-9]{1,2}:[0-9]{2}$'
  and e.value->>'end'   ~ '^[0-9]{1,2}:[0-9]{2}$'
  and lpad(e.value->>'end', 5, '0') < lpad(e.value->>'start', 5, '0');
