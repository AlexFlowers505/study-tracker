-- Achievements start paying points, and what they paid is recorded with them.
--
-- They paid nothing until now, on the reasoning that the thing which cannot be
-- taken away should not be wired into the thing you can spend. The reasoning
-- held; the consequence did not. *Cannot be taken away* answers why an
-- achievement is worth having afterwards, not why it is worth reaching — and
-- one that gives nothing is one nobody tries for.
--
-- What made it safe was `020`. While the currency was called "kept days" a
-- reward would have been minting days you never kept; points are their own
-- unit, so a reward adds to the account without touching the run. The
-- achievement itself is still never spent — it stays here with its date.
--
-- **The column is on the ledger, not only on the definition.** The amount is
-- written when the achievement is reached and read back from the row
-- afterwards, for the same reason a purchase stores its price: the account has
-- been spent against this figure, and re-reading a definition somebody has
-- since edited would move a balance that was already settled.
--
-- Rows written before this default to `0`, which is exactly what they paid:
-- nothing was on offer.
--
-- Safe to run twice: `add column if not exists` and nothing else.

alter table achievements
  add column if not exists reward integer not null default 0;

-- ---------------------------------------------------------------------------
-- THE CHECK — safe on its own, changes nothing.
--
--   select achievement_id, earned_at, value, reward from achievements
--    order by earned_at;
--
-- Everything earned before today reads `0`. Anything reached after this
-- carries whatever its definition was worth at that moment.
-- ---------------------------------------------------------------------------
