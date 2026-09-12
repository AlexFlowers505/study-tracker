-- One sealed day the old engine read wrongly — `spec 027`.
--
-- Until `spec 027`, a weekly condition filed its whole week on one day: the
-- first day *any* of its ceilings was crossed, asked whether the week *as it
-- then stood* was paid for. In the week of 7–13 September 2026 the rule
-- "Pin ctrl" broke its Night rider on the Monday, and that was bought; its
-- weekly total broke on the Thursday, with nothing left to buy it. So the
-- Monday was read as missed — by Pin ctrl alone — and the Monday left the
-- writing window on the Wednesday and was sealed that way: `kept = false`,
-- twenty points taken for a day that was paid for.
--
-- The fixed engine reads that Monday as frozen, which is a day kept.
--
-- ---------------------------------------------------------------------------
-- WHY ONE ROW, AND NOT "EVERY MARK THE ENGINE NOW READS DIFFERENTLY".
--
-- Every sealed day of the project was read both ways on 2026-09-12, against
-- the dev copy — and, it turned out afterwards, against the dev copy's *own*
-- day marks: Import JSON never carried `day_ledger` across (`spec 028` fixes
-- that). The Monday is wrong on production for the same reason it was wrong
-- there, so this row stands; whether production holds others is a matter of
-- importing again and reading again. Eight marks disagree with the fixed
-- engine's reading;
-- only this one disagrees *because of the fix*. The other seven — 27, 28, 29,
-- 30 and 31 August, 1 and 5 September — read the same under the old weekly
-- logic and the new. They were sealed under terms that were later loosened
-- (Reactify on 25 Aug and 9 Sep, Pin ctrl on 30 Aug), and production has no
-- record of the old terms, so today's reading judges them by the looser
-- promise. Those marks are right and the reading is what is missing context:
-- `spec 026` exists to stop exactly that kind of rewrite.
--
-- Three more days read differently rule by rule (3, 6 and 10 September) and
-- come to the same verdict either way, so their marks are untouched.
--
-- ---------------------------------------------------------------------------
-- WHAT IT COSTS. Nothing is taken. The balance moves by +30 — the −20 goes,
-- the +10 a kept day pays arrives — and the composite's history gains the
-- Monday it should always have had. `sealed_at` is left as it was: the day was
-- sealed then, and this corrects what was written, not when.
--
-- ORDER. Apply it to dev first, as every migration here, then deploy
-- `spec 027`, then apply it to production. Until the deploy, production goes
-- on sealing days with the old engine, and every grey day it seals as kept is
-- another mark to put right.
--
-- The project id is the same in both databases — the import keeps ids — so
-- the one statement serves both.
-- ---------------------------------------------------------------------------

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

alter table applied_migrations enable row level security;

do $$
declare
  fixed int;
begin
  if exists (select 1 from applied_migrations
             where name = '024_remark_the_bought_monday') then
    raise notice '024_remark_the_bought_monday: already applied, nothing to do';
    return;
  end if;

  update day_ledger
     set kept = true
   where project_id = 'project-ms1id7px-nf38'
     and date = '2026-09-07'
     and kept = false;
  get diagnostics fixed = row_count;

  insert into applied_migrations (name)
  values ('024_remark_the_bought_monday');

  raise notice '024_remark_the_bought_monday: % mark(s) corrected', fixed;
end $$;

-- ---------------------------------------------------------------------------
-- THE CHECK. Run it before and after; it changes nothing.
-- ---------------------------------------------------------------------------
--
-- select project_id, date, kept, sealed_at
--   from day_ledger
--  where project_id = 'project-ms1id7px-nf38'
--    and date between '2026-09-07' and '2026-09-13'
--  order by date;
