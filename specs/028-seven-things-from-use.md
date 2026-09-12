# 028 — Seven things from use

**Status: built.** Seven reports from ordinary use after `spec 027` shipped,
one of them a decision (the reward setting, asked and answered). **No
migration:** `ShopItem.repeatable` rides in `settings.shop`, and absent means
what every reward meant before it existed — repeatable.

---

## 1. A purchase, and an achievement, should feel like something

`ShopSection` has always called buying a **ceremony**. It asked, it said what
it would leave you with — and then the dialog closed and nothing happened:
the points left the account and the shelf looked exactly as before, the row
greyed out in a way indistinguishable from *cannot afford*. An achievement was
quieter still, sealed in an effect and visible only in a panel you had to think
to open.

- **`ui/Celebration.tsx`** — a dialog with a burst of confetti, the thing's own
  icon in its own colour with one pulse of glow behind it, a line of
  congratulation and one button, `Hooray!`. The **rare tier** in the animation
  sense: both events are rare by construction, which is exactly where the
  delight budget belongs, so the card arrives over 420ms from 0.9 and the
  confetti falls for about two seconds. **WAAPI on a few dozen spans**, no
  library and no canvas; transform and opacity only. Under
  `prefers-reduced-motion` there is no confetti and no pulse, and the card only
  fades.
- **A queue in `App`** (`celebrate`), keyed so an effect running twice cannot
  queue a moment twice. `buyReward` adds one; the effect that seals
  achievements adds one per achievement reached.

## 2. A reward is once-only, or not — `ShopItem.repeatable`

Asked and answered: **a setting on each reward.** Absent is `true`, so every
existing reward stays what it was; `newShopItem` writes `false`, since the thing
you have been circling for months is usually a thing you buy once.

- `canBuy` takes how many times it has been taken; a once-only reward taken
  once can never be bought again.
- The lock (`shopEdit`) reads it from the same side as the price: repeatable
  becoming once-only narrows and lands at once; **once-only becoming
  repeatable puts a taken reward back on the shelf, so it waits** like a
  discount.
- Setup's Rewards tab: a switch under the price, and the summary line says
  *once only* or *can be taken more than once*.

## 3. Taken looks taken, and the shelf splits

- A taken reward's row wears its own colour faintly, with an edge, and a
  **`Куплено`** badge (`×N` past one). Its button is outlined and says
  *take it again* when it may be; a once-only reward taken has no button at
  all. `ItemDetail` follows.
- **All / Not taken / Taken** — a `SegmentedControl` over the shelf, with a
  count on each. Absent until something has been taken, when the three views
  would be one view.

## 4. `36 → 0` only while the board has a `danger`

The composite's pair was drawn whenever `atStake` and `facing` disagreed —
which, with any floor owed, is from the first minute of every morning, so it
was on screen nearly all day and read as noise. It is drawn now **only while
the board holds at least one `danger`**: the moment the board itself says the
run is in trouble, read off the same notices (`counted.danger` in `App`), so
the two can never disagree. The badge in the period bar and `KeptFigure` take
the one flag. A rule's own pair (`spec 027`) was already settled breaks only.

## 5. A check that can be changed looks like it

Checks sit in one row with the tally badges and are drawn almost exactly like
them, and a tally does nothing when pressed — so after one dead click there was
no reason to try the chip beside it. A changeable check now lifts and takes an
edge in its own colour on hover, shows a pointer, and its tooltip says it can
be changed. Hover-gated by Tailwind, so touch keeps the plain chip.

## 6. Hide-all moved to the start of the toggle row

From `sm` up the toggle group is pushed to the right edge, so a button coming
and going in the middle of it slid every toggle to its left back and forth with
every panel opened or closed. First in the row, it comes and goes without
moving anything.

## 8. Import JSON dropped every ledger

Found while asking why a reward bought on production showed no *taken* on the
dev copy. Export has always written the whole in-memory document, ledgers
included; import lost them twice. `normalizeProject` rebuilt each project from
a fixed list of fields — days, notes, the rest — and dropped `weekVerdicts`,
`ruleVerdicts`, `dayLedger`, `earned` and `purchases` alike; and
`importIntoTables` only ever wrote the two verdict tables, so even with them
kept it would have left the other three behind. Both fixed, and the
confirmation step counts all five. Nothing on production was ever missing:
this only ever affected what a dev copy was a copy of — including the reading
behind `migrations/024`, which was done on the dev copy's own marks and is to be
repeated on production's.

## 7. The time dial's `now` is a clock; a running session counts

- The `now` button inside each half of `TimeRangeField` is a **clock glyph**,
  with the tooltip in full: *set the start to the current time* / *the end*.
  This reverses the note that `now` should keep its word.
- **A running session shows how long it has run** — on its line in the day
  card (while the day can still be written) and in the add dialog — updated
  every twenty seconds by `useNow`, less every pause, the running one included,
  so a held session holds still. `runningMinutes` in `lib/entries.ts`. A
  drawing only: `minutes` is still what the times say once the end is in.
