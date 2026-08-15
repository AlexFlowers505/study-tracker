-- Counters gain a slot breakdown.
--
-- `days.counters` was `{unitId: n}` — a number per unit for the whole day. It
-- becomes `{unitId: {slotId: n}}`, so three lessons can be recorded as two in
-- the morning and one in the evening. The day's figure for a unit is the sum
-- of its slots, which means nothing stores the same number twice and the two
-- can never disagree.
--
-- Unit first, slot second, and not the other way round: almost every read is
-- "how many of this unit today" — the badges, the tooltips, the running total
-- against a unit's total — and that way each of them is one object's values
-- summed rather than a walk across every slot.
--
-- Counts that predate this have no slot to go to. Inventing one would be
-- making data up, so they land under the reserved key `unassigned`, which the
-- app treats as "recorded for the day, not for any part of it".
--
-- **Safe to run more than once**, and it needs no `applied_migrations` guard
-- to be: the `exists` clause matches only rows still holding a bare number, so
-- a second pass finds nothing to do.
--
-- Run after `009`. On production that means `009` then `010`, back to back.

update days d
   set counters = (
         select jsonb_object_agg(
                  e.key,
                  case
                    when jsonb_typeof(e.value) = 'number'
                    then jsonb_build_object('unassigned', e.value)
                    else e.value
                  end
                )
           from jsonb_each(d.counters) e
       ),
       updated_at = now()
 where d.counters <> '{}'::jsonb
   and exists (
         select 1 from jsonb_each(d.counters) e
          where jsonb_typeof(e.value) = 'number'
       );

-- --------------------------------------------------------------- check it

-- Every remaining value should be an object. An empty result means the shape
-- is uniform; any row returned is one this did not reach.
--
-- select d.project_id, d.date, d.counters
--   from days d, jsonb_each(d.counters) e
--  where jsonb_typeof(e.value) <> 'object';

-- And the totals should be unchanged by the reshape:
--
-- select sum((e.value->>'unassigned')::int) as unassigned_total, e.key as unit
--   from days d, jsonb_each(d.counters) e
--  group by e.key;
