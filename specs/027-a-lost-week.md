# 027 — A lost week

**Status: built.** Settled in a grilling session on 2026-09-11/12; every
decision below is the user's, recorded with the question it answered. Eleven
cases in `npm run sweep` (`lost week:`), and `two scales:` gained two and
reversed one. Checked against the report's own week on the dev copy: Monday
blue, Tuesday and Wednesday green, Thursday red, Friday and Saturday grey.

**`Built:`** one mark is corrected, by hand, in `migrations/024`. Every sealed
day was read both ways on the dev copy — whose day marks, it turned out, were
its own: Import JSON did not carry `day_ledger` until `spec 028`, so this is to
be read again on production's marks after a fresh import. There: eight marks disagree with
the fixed engine, and only the report's own Monday (7 September) disagrees
*because of the fix* — sealed missed by Pin ctrl alone, now frozen. The other
seven read the same under the old weekly logic and the new; they were sealed
under terms later loosened, and production has no revisions to say so, so
they stay as written — the ledger is the fact, as `spec 026` has it.
**Deploy before running the migration**, or production goes on sealing days
with the old engine.

**No migration, and no schema change.** Receipts already ride in
`days.rule_freezes` as a list, and a list can hold two receipts for one site
as easily as one. A lost day simply gets no mark, so `day_ledger` does not
change shape either.

**Depends on `017`, `018`, `025` and `026`**, and reverses one sentence in
each of `010` and `017` — marked in place below.

---

## What went wrong

The week of 7–13 September 2026, rule **Pin ctrl**, purely weekly:
*“Pinterest” at most 3 a week, of which none in the Evening and none at Night.*

- **Monday** — one Pinterest at night. The Night rider broke, and one freeze
  was bought for it.
- **Thursday** — the fourth Pinterest. The weekly ceiling broke (4 of 3): a
  different site, with no freeze left to buy it.

What the app drew:

- Monday's Pin ctrl arc **red** — `Missed: Pin ctrl` — and, on the copy where
  Monday had no mark yet, Monday itself red in the composite.
- Thursday's Pin ctrl arc **green**: the day the rule was actually broken
  cost it nothing.
- The rule's own strip: seven uncoloured cells reading `1 1 1 2 2`.
- The rule's streak, and the composite, recounted from the day after Monday —
  `36 → 2`, which the user reported as *the streak broke, so where does 2 come
  from*.

**Why.** `ruleWeekDayState` filed a whole week on one day — `weekLostOn`, the
first day *any* ceiling of the condition was crossed — and then asked
`isFrozenFor` about the week **as it now stands**. One unpaid site anywhere
turned that first day red, whichever site it was and whatever had been bought
for it. Where Monday already carried a mark, the Thursday break reached the
composite nowhere at all.

Tracing it turned up four more faults of the same family:

1. **A site with a receipt can never be bought again.** `freezeOffers` marks it
   `frozen` on the presence of a key, `spendRuleFreeze` refuses a second
   receipt for the same key, and coverage compares the *largest* receipt with
   the grown cost. So a violation that grows after being paid for can never be
   paid for again: *at most 0, six freezes, one a day* ends on the Tuesday.
2. **A weekly time ceiling costs one however far it goes**, so after one freeze
   the rest of the week is free.
3. **A purely weekly rule's strip paints all seven cells with the week's
   state**: uncoloured all week, then seven red after Sunday, the bought Monday
   among them.
4. **The days after the loss read `met`**, so the run restarted in the middle
   of a week that could no longer be kept, and every further Pinterest that
   week was free.

---

## Decisions

| # | Question | Answer |
| --- | --- | --- |
| 1 | Does a day a freeze covered stay covered when the week later grows past what was paid? | **Yes.** Growth past what was paid is a new break, on the day it happened. Two sites breaking on two days are two breaks on their own days. |
| 2 | What does buying the growth of a paid site cost? | **The difference.** Receipts on one site add up. *Six freezes, one Pinterest a day over a ceiling of nought: six blue days, and the seventh red.* |
| 3 | A weekly **time** ceiling? | **One freeze per day that added time above it.** A day that added nothing costs nothing; a minute more costs one more. |
| 4 | What are the days after an unpaid break inside a weekly condition's week? | **Grey — a lost week.** A day that adds to the excess is red. Buying the red day back turns the grey days green again. |
| 5 | What is a grey day worth to the composite? | **Nothing either way.** The composite does not grow and does not reset, and no points are paid. Another rule breaking that day is red and −20 as usual, and every other rule's own streak grows as usual. |
| 6 | What does a rule's streak show on the day of a spent break? | **`36 → 0` while a freeze can still buy it back, plain `0` once nothing can** — the pair the composite already draws, for settled breaks only. |
| 7 | Is a purely weekly rule's strip drawn day by day? | **Yes.** The week's own verdict stays in the rule's streak, counted in weeks. |
| 8 | Where is a day's colour explained? | **On the ring**, and in the same words on a rule's strip cells and the month grid's cells — six sentences, in `CONTEXT.md` under *Цвета дня*. Precedence: red > still running > grey > blue > green. Grey is `gone`'s colour, since both mean *nothing left to do here*. |
| 9 | The words | Eight Russian renames where one word meant two things, and `CONTEXT.md` as the glossary. See Part 7. |

---

## Part 1 — Where a week's break lands

`weekSteps` walks a weekly condition's days and records **every day on which a
site got worse**, with what the site had come to by the end of that day. The
sites are exactly the ones `weekViolationsOn` prices, keyed by the same
`violationKey`, so a step and a receipt can always be matched.

| site | a step is | and carries |
| --- | --- | --- |
| a count's own ceiling, a slot ceiling | a day the running excess grew | the excess so far |
| a count's floor, a slot floor | the day it became unreachable — for a slot floor, and for time, only once the week is out of days | the shortfall as it now stands |
| a check answer counted per week (`states`) | a day that answer's excess grew, or the day its floor became unreachable | as above, in answers |
| a day-shaped `allow` inside a weekly condition | a day answered outside the accepted set, or a past day left unanswered | how many such days so far |
| time | a day that added minutes while a ceiling was already crossed, or the last day of a week whose floor fell short | how many such days so far |

One day, one rule, from the steps and the Monday's receipts:

1. a step on this day that is **not** covered → `missed`
2. an earlier uncovered step this week → **`lost`**
3. a step on this day, covered → `frozen`
4. otherwise → `met`

*Covered* compares the step's figure with **everything paid on that site**.
A receipt therefore covers the days whose growth it paid for and no later one,
which is Decision 1 read as arithmetic. A legacy whole-rule receipt covers
every step, as it always covered the whole week.

A weekly condition in its partial first week (`watching`) takes only the
ceiling steps, drawn and never counted, as `spec 018` has it.

**Reverses `spec 010`, part 2**, *a lost week costs exactly one day, and it is
the day it was lost on*. It still costs the day it was lost on. It is no
longer blind to what happened after that.

**Not changed:** `ruleWeekState` — the week's own verdict, the streak of a
purely weekly rule and the ledger row — and `weekLostOn` / `clauseLostOn`,
which the pace card still reads.

## Part 2 — `lost`

`RuleState` gains `lost`, and `DayVerdict` gains it too:

- `ruleStateOn` folds **missed > pending > lost > frozen > met > watching**, so
  a mixed rule whose weekly half is lost and whose daily half held is lost.
- `readDay` folds the composite in the same order. A lost day is **not kept**
  (`heldUp` is false) and **not missed**.
- `keptDays` skips it for `current`, `atStake` and `facing` alike: no growth,
  no reset.
- `dueMarks` writes it no mark, so it pays nothing. If the red day is later
  bought back inside the window, the grey day reads `kept` and gets its mark
  then — Decision 4 needs no machinery of its own.
- `foldVerdicts` reads a lost day as a week not kept. It always sits beside a
  red day in the same week anyway.
- A rule's own streak counted in days skips a lost day, as it skips `watching`.

## Part 3 — Buying the growth

- `frozenCosts` **sums** receipts per key rather than taking the largest.
- `freezeOffers` offers a partly paid site at **what is left**, `cost − paid`,
  and calls it frozen only once nothing is left. An already frozen item reports
  what was paid.
- `spendRuleFreeze` stops refusing a second receipt for one key.
- `isFrozenFor` is unchanged in shape; it now compares against the sum.
- `notices` silences a site only while it is **covered** (`coveredKeys`), not
  while it merely has a receipt, so a grown site speaks again.

**Reverses `spec 017`, part 7's** *a violation that has since grown past what
was paid is simply not the one that was bought*. It is still not covered; it
can now be topped up.

## Part 4 — Time, by the day

A weekly time condition costs **the number of days that added time above a
crossed ceiling, plus one if a floor is short**. `readWeek` and
`weekViolationsOn` share one function (`timeWeekCost`), so the items still add
up to `totalDeficit`. *Forty minutes short is one broken promise* still holds
for a day; what changed is that a week is seven days, not one.

## Part 5 — A rule's streak shows what is at stake

`RuleStatus` gains `atStake` and `facing`, read as `KeptDays` reads them:

- **`atStake`** — the run if every break still inside the window is bought back
  (yesterday for a rule counted in days; an unsealed week for one counted in
  weeks).
- **`facing`** — the run if today (or this week) seals with the **settled**
  breaks it now carries. A floor still owed is not a break.

The chip and the panel's *Current streak* draw `atStake → facing` while the two
disagree **and** the rule is not `gone`; a gone rule shows `facing` alone.

## Part 6 — Drawing

- **The strip is day by day for every rule.** A purely weekly rule's cells read
  `ruleStateOn` like everything else. A week's offers go on the cells where one
  of its sites grew — the days you would reach for — and on the week's first
  cell in range only when no such cell is in range. A week's receipts are drawn
  by the colour of the days they covered and **never by a cell's corner**
  (`FreezeOffer.week`): the list rides on every day the week broke, and a
  Monday purchase listed on the Thursday bought nothing for the Thursday.
- **Grey** is `c.gone` wherever a day is drawn: the strip, the ring, the bar,
  the day card, the month cell and the heatmap, whose legend gains *Week lost*
  when a voting rule has a weekly condition.
- **`verdictLines`** in `dayVerdict.ts` writes the six sentences, and the ring,
  the month cell and the heatmap cell all print them. The ring's old tooltip
  (`Missed: Pin ctrl · 2 of 3 kept`) was never translated.
- A rule's strip cell says what grey means on its own line.

## Part 7 — The words

`CONTEXT.md` is the glossary; `CLAUDE.md`'s **The words** maps each word to
the code and defines nothing. The Russian interface changes where one word
meant two things:

| was | now | why |
| --- | --- | --- |
| «Счёт» (tally) | **«Подсчёт»** | «Счёт» was also the composite and the account |
| «Общий счёт», «Выполнено» (the composite) | **«Общая серия»** | as above |
| «Счёт по каждому счётчику» (chart counts) | **«Количество…»** | as above |
| «Под угрозой» in a rule's panel = warning | the board's five words | the board says «под угрозой» for danger |
| «Потеряно» (gone, in the panel) | **«упущено»** | the board's word; «потеряно» also meant danger |
| «пропущено» (a missed day) | **«не выполнено»** | a check answer is also «пропущено» |
| «отметка дня» (a mark) | **«итог дня»** | a check is an «отметка» |
| «Запас на эту неделю» (weekly freezes) | **«Заморозки на неделю»** | «запас» is headroom |
| «потолок», «минимум/максимум», «не менее/не более» | **«минимум / максимум»**; «не менее / не более» only inside a rule's sentence | three pairs for two ideas |

---

## Sweep

`lost week:` — the Pin ctrl week day by day; six freezes and a seventh
Pinterest; a paid site topped up; a time ceiling by the day; a floor lost on
its day; a mixed rule; the composite across a grey day; a rule's
`atStake → facing`. `two scales:` *and leaves the days it did not break on
alone* reverses on purpose and says so in place.
