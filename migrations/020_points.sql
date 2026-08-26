-- The balance stops being denominated in "kept days" and becomes points.
--
-- The rate goes from `+1 / −3` to `+10 / −20`. Two separate changes ride in
-- that, and only one of them needs a migration.
--
-- **The rename needs nothing.** `keptDays` and the balance were two completely
-- different numbers wearing one name — a run that resets and is never spent,
-- and an account that accumulates and is. Nothing stored changes; only what it
-- is called.
--
-- **The scale needs this file.** The balance is a *fold* over the day ledger,
-- recomputed from `kept` booleans every time it is read, so changing the
-- constants revalues the whole history on its own. Prices are not: they are
-- stored numbers, written when the item was priced. Leave them and every
-- reward silently becomes a tenth of what it was — a record player priced at
-- 500 kept days would cost 500 points, which is fifty good days rather than
-- five hundred. That is the largest loosening this app has ever made, and it
-- would be made by a constant nobody looked at.
--
-- So both stored figures are multiplied by ten: the prices in `projects`
-- (`settings -> 'shop'`), and the prices recorded against purchases already
-- taken. **Scaling the purchases is redenomination, not rewriting history** —
-- the same act as a currency dropping three zeroes. What was paid is unchanged;
-- the units it is written in are.
--
-- A note on the ratio, which the tens exist to make adjustable: the account
-- now grows above a **two-thirds** keep rate rather than the 75% that `−3`
-- gave. That is a deliberate softening and the figure to watch when changing
-- it again is the ratio, not either number alone.
--
-- ---------------------------------------------------------------------------
-- RUN THE CHECK AT THE BOTTOM FIRST. It shows every price this would change
-- and to what, and changes nothing. Export your JSON before running the
-- migration itself.
-- ---------------------------------------------------------------------------
--
-- Guarded: multiplying in place is not idempotent, and running it twice would
-- price the record player at fifty thousand.

create table if not exists applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

alter table applied_migrations enable row level security;

do $$
declare
  shops    int := 0;
  bought   int := 0;
begin
  if exists (select 1 from applied_migrations where name = '020_points') then
    raise notice '020_points: already applied, nothing to do';
    return;
  end if;

  -- Every shop item's price, ten times what it was.
  with scaled as (
    select
      p.id,
      jsonb_agg(
        case
          when item ? 'price'
            then jsonb_set(item, '{price}',
                   to_jsonb((item ->> 'price')::numeric * 10))
          else item
        end
        order by ord
      ) as shop
    from projects p
    cross join lateral jsonb_array_elements(p.settings -> 'shop')
      with ordinality as t(item, ord)
    where jsonb_typeof(p.settings -> 'shop') = 'array'
    group by p.id
  )
  update projects p
     set settings = jsonb_set(p.settings, '{shop}', scaled.shop)
    from scaled
   where p.id = scaled.id;
  get diagnostics shops = row_count;

  -- And what was already paid, in the same new units.
  update purchases set price = price * 10;
  get diagnostics bought = row_count;

  insert into applied_migrations (name) values ('020_points');
  raise notice '020_points: % project(s) repriced, % purchase(s) redenominated',
    shops, bought;
end $$;

-- ---------------------------------------------------------------------------
-- THE CHECK — safe to run on its own, changes nothing.
--
--   select p.id,
--          item ->> 'label'            as reward,
--          (item ->> 'price')::numeric as was,
--          (item ->> 'price')::numeric * 10 as becomes
--     from projects p
--     cross join lateral jsonb_array_elements(p.settings -> 'shop') as item
--    where jsonb_typeof(p.settings -> 'shop') = 'array';
--
--   select label, price as was, price * 10 as becomes from purchases;
-- ---------------------------------------------------------------------------
