-- Categories become activities.
--
-- Nothing about the entity changed. The word did: a *category* is now a
-- grouping of counters, one per counter, and the thing a time entry is filed
-- under — Lessons, Q&A, Polishing questions — is an **activity**, which is
-- also one of the three kinds a counter can be. An activity records time, a
-- tally records a count, a check records an answer.
--
-- Two renames, and no id moves anywhere, which is why this is a rename rather
-- than a migration: every day's entries already point at the right rows.
--
-- 1. `projects.categories` -> `projects.activities`, the column the list
--    itself lives in.
-- 2. `days.cells`: inside every entry, the key `category` becomes `activity`.
--
-- The second is guarded by its own shape rather than by `applied_migrations`:
-- it only rewrites entries still carrying a `category` key, so a second run
-- finds nothing to do. `entryActivity()` in the app reads either spelling, so
-- it does not matter whether this runs before or after the new build ships —
-- and an entry written by the new build afterwards keeps only the new key,
-- since `patchEntry` drops the old one.
--
-- **The first statement is the one that needs the new build.** A deployed
-- build still asking for `projects.categories` stops at the dead-end screen
-- the moment the column is renamed, which is the app refusing to write rather
-- than anything being lost. Run this alongside the deploy.
--
-- Run after `012`. Safe to run more than once, except that the `alter table`
-- will report that the column does not exist the second time — which is the
-- statement telling you it has already run.

alter table projects rename column categories to activities;

update days d
   set cells = (
         select jsonb_object_agg(
                  slot.key,
                  (
                    select coalesce(
                             jsonb_agg(
                               case
                                 when e ? 'category'
                                 then (e - 'category')
                                      || jsonb_build_object('activity', e -> 'category')
                                 else e
                               end
                               order by ord
                             ),
                             '[]'::jsonb
                           )
                      from jsonb_array_elements(slot.value)
                           with ordinality as t(e, ord)
                  )
                )
           from jsonb_each(d.cells) as slot
       )
 where exists (
         select 1
           from jsonb_each(d.cells) as slot,
                jsonb_array_elements(slot.value) as e
          where e ? 'category'
       );
