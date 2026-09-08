# 025 — Eight things from use

**Status: built.** Eight reports from a week of ordinary use, batched the way
`spec 022` was: each is small enough on its own, none blocks another, and two
of them are engine bugs wearing the face of a design decision.

The through-line, in as much as there is one: **three of these are the same
mistake** — a figure that is measured through one thing and drawn beside a
figure measured through another, and nobody said which was which.

---

## 1 — A receipt is not a verdict

Reported as: *I froze one violation on one day and the whole week is drawn
frozen; and after that the board says nothing about the rule until it is far
too late.*

Both halves are true and they are one bug seen from two sides.

`spec 017` made a freeze a purchase against **one violation**, and it got the
*coverage* question exactly right — a violation that has since grown past what
was paid is not the one that was bought, so "freeze the Monday, then binge
until Sunday" is not a free week. Its own note says why that matters: on a week
it is **six further days**.

It then left the *verdict* alone. `ruleWeekState` asks `isFrozenFor` before it
asks whether the week is over, so a ceiling broken on the Monday and bought on
the Monday made the whole week read `frozen` with five days still to run. And:

- **The strip colours every one of a weekly rule's seven cells by the week's
  state.** So one freeze drew seven blue snowflake cells. That is not a
  drawing detail; blue means *this period is saved*, and the period was still
  in play.
- **`ruleNotices` returned nothing at all** the moment `isFrozenFor` was true.
  That guard was written when a freeze covered a whole rule, so *frozen* and
  *nothing left to happen here* were the same sentence. They stopped being the
  same sentence in `spec 017`. The rule went silent — including the loudest
  thing on the board, `“Pinterest” 3 of 3 used this week — one more ends it` —
  and reappeared at `danger` only once the violation had grown past the price,
  having never once warned.

### What was done

- **`ruleWeekShown`**, beside `ruleWeekState` and used by the panel's strip and
  chart. A week that has not ended never wears `frozen`: it keeps `pending`
  and wears the corner snowflake the strip already draws for *something here
  is bought*. **Drawing only** — `ruleWeekState` is untouched, so the streak,
  the ledger, the day's verdict and what may be frozen all read exactly as
  they did. A verdict is what a period is worth **when it is over**; until
  then what you have is a receipt.
- **The board's `frozen` early return is gone.** The per-violation `paid`
  filter that `spec 016` added is the whole of what a receipt should buy:
  silence about **that site**, and about nothing else.
- **The popover names the week**, not the day you happened to be pointing at,
  and a running week's receipt carries a line saying it covers the week *as it
  stands, not whatever it becomes*.
- **A day that has not happened is not a reading of the week.** Every cell wore
  the week's running total, so on a Tuesday the row read `1 · 7 · 7 · 7 · 7 ·
  7 · 7` — Wednesday to Sunday drawn as though they were already logged. A
  future day takes `unjudged`, the same silence it gets everywhere else in the
  app.
- **And the receipt goes on one cell, not seven.** `freezeOffers` is asked per
  day and answers with the *week's* list, so every day drew the same buyable
  ring, the same popover and the same corner snowflake: one freeze against one
  week's ceiling read as seven freezes, which is the reading `ruleWeekShown`
  had just been written to stop the colour making. It goes on the day the
  record goes on — the week's Monday — or on the first day of that week the
  period happens to show, so a range starting on a Wednesday does not lose the
  offer altogether.
- **`RuleOpenWeek.carried`.** "Still in play" called every surviving week
  *clean so far*, including the ones held up by a freeze. Clean is a claim
  about what happened; carried is a claim about what it is worth, and it is
  the one week on that list where something has already gone wrong.

Five cases in `npm run sweep` (`running week:`), two of which fail against the
old code.

---

## 2 — The statistics stopped being about anything

`spec 022` argued that the period's headline hours must be measured through
the **benchmark rule** — a total over every entry says how thorough the log is
rather than how the period went — and applied it to exactly one figure.

Everything else on the analytics half went on totalling the lot. So a period
reported `4h 25m` in its header and `17h 5m` in the donut two lines below it;
and once `spec 024` made a night an ordinary activity, three quarters of that
donut was **sleep**, filed under *what the time went on* as though it were
work.

**`benchmarkDays`** is one filtered copy of `days`, holding only the entries
the nominated rule counts — one projection rather than a predicate threaded
through two dozen `dayBreakdown` calls, which is what the count filter does
one layer up and for the same reason. The two donuts, the four Trends charts,
the averages and the extremes all follow without a line of their own.

Three things it deliberately does not do:

- **Only the entries, and only time.** `counters` and `checks` are untouched:
  the benchmark is a promise about hours, and a tally is not measured through
  it any more than it is measured in minutes.
- **`activeDays` stays on the raw log.** `computeOverviewStats` keeps taking
  the raw days plus the meter, because a day you wrote something on is not an
  empty day whatever the benchmark thinks of what you wrote — `spec 022`,
  unchanged.
- **Nothing nominated means everything counted**, and the page says so rather
  than showing nothing. The request was "otherwise show nothing"; a blank
  Summary and Trends for a project that has simply not nominated a rule is a
  worse answer than a full one with a line explaining it, and the line is what
  turns a silent default into a choice somebody can go and make.

**`MeasuredNote`** is that line, on both sections above their tabs:
*Время учтено по правилу “Reactify”*, with the same gear every panel carries,
to the Streaks tab where the nomination is made. It sits above the tab row
because it is true on every tab — the caption below it changes with the tab
and this does not.

---

## 3 — `36 → 0`

`current` is the run as things stand, and *as things stand* is the one state
it cannot describe. It has two blind spots and they are the same blind spot:

- A day that is `pending` at eleven at night becomes `missed` at midnight, and
  the figure read `36` right up until it read `0`.
- The moment a day you can **still write to** breaks, the figure reads `0` —
  indistinguishable from a run that ended in March and is gone. That is the
  case this was asked for, and the first build missed it: it triggered on
  `pending` only, so breaking a rule today made the counter read a flat `0`
  and there was no way to reach the warning at all.

So `KeptDays` carries the two ends rather than one number and a flag:

- **`atStake`** — what the run is worth if the days you can still write to end
  well. Every editable day but today counts as kept; **today neither adds nor
  breaks** unless it already holds, since today is not a day you kept until it
  is over. That last clause is load-bearing — a running counter that reset on
  today would wipe the very thirty-six the figure exists to show you.
- **`facing`** — what it seals as if nothing changes, which for a `pending`
  day is a miss.

The counter draws `atStake → facing` while the two disagree, and `current`
otherwise. Both blind spots come out as the same sentence: *sealed as it
stands, the run goes from 36 to 0, and today and yesterday can still be
written to.* `atRisk` names the promises doing it, gathered from the editable
days, because the figure cannot say them and *which promise* is the only
actionable part.

A forecast, not a verdict — which is why the run keeps its own colour and only
what is after the arrow is red. What you have is still yours.

**And on the streak's own badge in the period bar**, which is where you look
before you look anywhere: `36` in the streak's marigold with the sealed figure
under it in the `sub` slot, so the pair reads down the edge as the board's
counts do. That badge carries a written rule — *it does not go red, because we
have exactly one place to look when something is wrong* — and this is the one
exception, on the grounds that it is not a second alarm but the second half of
one number: the same red `KeptFigure` gives the same figure two blocks below,
which is the whole reason the first half wears marigold. Amber was tried first
and lost to the palette — `warn` under `project` at badge size is two warm
yellows a centimetre apart, and telling a state apart by shade is the failure
`gone` was redrawn to avoid.

Four cases in the sweep (`at stake:`), including the one that must **not**
draw the pair: a break the horizon has already passed is gone, and says so
with a plain figure.

---

## 4 — Hide all / show all in the count filter

Isolating one activity out of forty took thirty-nine clicks. `ToggleChips` has
carried `onBulk` since the chart legends needed it; the filter simply never
passed one. Per group rather than one button for the panel: the groups strike
out different kinds of thing, and a single button would have to mean all five
at once, which is what `Count all again` already says from the other side.

---

## 5 — One rule, two scales

Reported as: *I want Reactify to say "this many hours a day of that category"
**and** "at most this many hours a week of one activity in it", and there is
no way to write it.*

There was not, because the scale belonged to the **rule**. Writing it as two
rules is two streaks to keep and two allowances to spend, for one promise —
which is precisely the argument `StreakClause` was built on in `spec 009`,
applied to the one axis it had never reached.

**`StreakClause.scope`**, absent meaning the rule's own — which is what every
condition written before this meant, so there is no migration. `clauseScope`,
`dayClauses`, `weekClauses` and `isMixed` are the whole of the new vocabulary;
everything else simply stops asking the rule a question the condition can now
answer for itself:

- `readDay` reads the daily half, `readWeek` the weekly one. `judgesDay` asks
  the daily half. `violationsOn` and `weekViolationsOn` split the same way, so
  the receipts still go where they went: a day's on the day, a week's on its
  Monday.
- **`ruleStateOn`** is what a rule is worth on one day whatever scales it is
  judged on. Neither reading changed: `ruleDayState` answers for the daily
  conditions and `ruleWeekDayState` for the weekly ones — which has had a
  per-day answer since `spec 010` precisely so a weekly rule could vote in a
  day's verdict. The fold is the day report's own order, missed over pending
  over frozen, because it is the same question one level down.
- **`freezeOffers` returns both lists.** They cannot be merged before that
  point and must not be merged after: their receipts are filed in different
  places, their writing windows are different lengths, and `FreezeOffer.dayKey`
  has carried the answer since `spec 017`.
- **`isFrozenFor` takes the scale from its arguments** rather than from
  `rule.scope`. Handing it `weekDays` is what says which of the two ledgers is
  being asked about — which is what that argument already meant.
- **A mixed rule's streak is counted in days**, the finer of the two scales and
  the one every mixed rule has by construction.
- **The panel is drawn on the day** for the same reason, with the weekly half
  in the cell tooltips (through `clauseWeekReadoutParts`, per reading — handing
  a week reading to the day function is the bug `spec 018` closed) and on the
  pace card, which now appears for any rule with a weekly condition.
- **The benchmark reads the daily half.** A weekly condition beside daily ones
  has no figure for a single day and is not meant to have one; what would
  disqualify a rule is having no daily half at all. Without this the change
  would have taken the goal line off the very rule it was asked for.
- **The lock treats a scale change as incomparable.** `at most 3` a day and
  `at most 3` a week are different promises and neither implies the other, so
  it takes the same answer swapping the counter does: unprovable, therefore
  locked.

**A weekly condition now names its period in its own sentence.** It never did,
because the period was the rule's and the panel said it once above the list.
With two scales in one rule a line that does not say which it is on is a line
you cannot read. Ten cases in the sweep (`two scales:`), including one
asserting that a daily condition's sentence is unchanged to the character.

The rule's own `Judged` row survives and is relabelled: it is the **default**
a condition takes when it says nothing, and a control that silently governs
three others below it has to say so.

---

## 6 — A finish on the next morning

*Go to bed between 21:00 and 23:00, get up between 04:00 and 05:00* was not a
sentence this app could hold.

`edgesOn` reports a session that ran past midnight as minutes past 1440 — and
it has to: 23:00–00:30 finished at 1470, or *finish by six* becomes a promise
a midnight session keeps. A window's walls are wall-clock times, so
`04:00`–`05:00` asked for 240–300 while every real night reported 1680. Not a
rounding error: a rule nothing could keep, for the one subject the app most
obviously has one about.

**`TimeWindow.nextDay`** puts the pair on the same scale, and it is stated
rather than inferred, because `spec 023` refused to read a window across
midnight on the grounds that *the earliest start* has no meaning across that
boundary — and guessing here would be the same mistake wearing a helpful face.

- **One flag for the pair, not one per wall.** The walls of a real window are
  on the same morning; the case where they are not is the wrapping one that is
  still refused.
- **Offered on the finishing pair only.** A day's earliest start is inside
  that day by construction, so a `+1d` on the beginning would be a switch with
  nothing to mean.
- `windowWalls` is the one place the shift is applied, and every reader goes
  through it: the verdict, the violation's own sentence, the readback, the
  lock (or moving a finish onto the next morning would read as an enormous
  loosening of the same two times) and `clauseImpossible`.
- The mark is `+1d`, which is what the entry readouts already use for a
  session that ran past midnight.

Four cases in the sweep, one of them the old reading — the same two times
without the mark, still a day and a quarter late, because that is what those
two times say.

---

## 7 — A reward you can open

The shelf is a list of rows, and a row is the wrong size for the thing it
describes: the description truncated to a line, the price a figure in a
corner, and the object you have been circling for months reading as an entry
in a table of settings. The mechanism only works if you want the thing, and a
row is very good at making you not.

`ItemDetail`: the icon at a size you can see, the description in full, the
price **as a distance** rather than a number, and what you must have earned
first with a tick against the ones you have. The name and its icon open it and
the row does not — a reward has two acts on it and a row that is itself a
button can hold only one, the same split the composite's breakdown rows make.

Nothing here is a second way to buy: `Take it` hands straight to `BuyConfirm`,
which is still the only ceremony, because two dialogs that can both spend
points is two places for the ritual to be skipped.

---

## 8 — A reward can ask for more than points

A price says *how much of the account*; an achievement says *what you must
have become*. They are not the same question, and the only thing a price can
express is patience — so every reward on the shelf was priced patience and
nothing else.

**`ShopItem.requires`** — achievement ids, and/or a price. What an item may not
carry is neither: `canBuy`'s guard used to read `price > 0` and meant the same
thing when a price was all there was.

- **An id matching no achievement is dropped rather than reported.** Deleting
  an achievement takes its record with it (`spec 014`), so a requirement
  pointing at nothing is not an unmet condition but one that no longer exists
   — and a reward permanently unbuyable for a reason you cannot see anywhere is
  the worse of the two failures.
- **The lock covers it, from the same side.** `priceEdit` becomes `shopEdit`:
  adding a requirement only ever asks more and lands at once, **dropping one
  waits** exactly as a discount does. Without that the lock had a door beside
  it — the record player could not get cheaper on the evening you wanted it,
  and could stop needing the thing you had put it behind.
- The chips are drawn as a full set inside the edit draft, which is the
  opposite of the choice a counter's tags made and for the opposite reason:
  those are drawn on every row of a list of forty, this is inside a draft you
  opened on purpose, where the whole set *is* the question.

Six cases in the sweep (`reward:`).

---

## 9 — One unbreakable string widened the whole page

Reported as *a reward's long description escapes its container*, and it was
neither the reward nor the description.

`Leaving` wraps every panel in a one-row grid, because a grid track from `1fr`
to `0fr` is the one sizing technique that interpolates. Its child had
`min-height: 0` — without which the row cannot shrink at all — and **not**
`min-width: 0`. A grid item defaults to `min-width: auto` and refuses to
shrink below its content, so one pasted product URL made that item 986px wide
inside a 641px track, took `max-w-6xl` with it, and left every `truncate`
inside with nothing to truncate against: the text was 759px wide because its
container was, all the way up.

It is the `min-w-0` trap the period bar, the log's heading row and `ChartCard`
each hit in flex, wearing its fourth face — and `Leaving` is the one place to
fix it, because every panel in the app goes out through it.

---

## Not done

- **A weekly condition whose accepted answers are day-shaped still reads like
  a daily one.** `clauseSentence`'s `allow` branch says nothing about the
  period, and for that branch the day-shaped reading is genuinely what the
  condition means (*every day of the week must be an accepted answer*). It is
  the one sentence in the file that does not name its own scale.
- **A weekly condition carrying a per-weekday figure map reads as a list of
  weekdays.** Pre-existing, and correct arithmetic — `weekBounds` sums those
  figures over the judged days — but the sentence does not say it is a week's
  total. It is only reachable by switching an existing per-day condition to
  the week, which the lock makes a deliberate act.
- **No migration, anywhere in this spec.** `clause.scope`, `window.nextDay`
  and `item.requires` all ride in existing jsonb and all mean, when absent,
  exactly what the data meant before.
