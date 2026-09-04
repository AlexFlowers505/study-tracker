# 016 — Four levels, and one board to read them on

**Status: designed, not built.** Owns the notice board, the four levels behind
it, the three new panel toggles, the account panel and the solo view. Read
`spec 010` part 3 first — this replaces the streak row's alarms outright, and
the argument it was built on is the argument this is built on.

No migration. Nothing here touches the server: the levels are derived, the
board's own state lives in `localStorage`, and every figure it prints is
already computed somewhere else.

---

## The gap

The app has exactly two volumes for anything that is not a number.

**Loud** is `StreakAlarms` — a red block above the composite, and `spec 010`
part 3 was right about when it may fire: *loud when acting is urgent, not
merely possible*. A warning that goes off every morning is a warning nobody
reads.

**Silent** is `dueToday` — the list under the streak row's chevron, described
in `CLAUDE.md` in exactly the words a user later complained in: *you go and
look; it never comes and finds you*.

There is nothing in between, and almost everything worth saying lives there.
The user put it precisely:

> если выносить в отдельное уведомление, то оно слишком много внимания на себя
> занимает… а если прятать его в распадашку комбо-стрика, то получается
> слишком дружелюбно, так, что можно и не обратить внимания.

**The answer is not a third volume. It is that volume stops being a placement
decision and becomes a property of the thing being said.** One board holds
everything; a notice's level decides how much of the board it takes.

### The case that names the gap

A rule asserts two checks — *wake up in time* and *go to bed in time*, both
`yes` every day. At noon the user answers the first `no`. The red block reads:

```
Sleep Ctrl
Today
“Wake up in time” is “no”
“Go to bed in time” is “not answered”
```

The second line is wrong to be there, and it is wrong in a way that is easy to
miss: it is not a failure. It is a thing that has all afternoon to happen. And
the block only exists *at all* because of the first line — answer neither, and
nothing is said.

The cause is one filter, `clauseReadoutParts` at
[customStreaks.ts:1794](../src/lib/customStreaks.ts):

```ts
return !state || !allowed.includes(state)
```

`!state` — *not answered* — and `!allowed.includes(state)` — *answered wrongly*
— go into the same bucket. **The distinction does not exist anywhere in the
codebase**, and it is the distinction the whole of this spec is built on.

---

## Part 1 — Four levels

`todayUrgency` already computes it and then throws it away: a local `spent`
flag, used once to pick a word in a sentence
([streakRisk.ts:272](../src/lib/streakRisk.ts)). Promote it.

**One axis: has this already happened, or is it still owed?**

| level | the rule | example |
| --- | --- | --- |
| **danger** | irreversibly broken, or no longer reachable today. Only a freeze is left | `“Wake up in time” is “no”` · a Pinterest at night under *none at night* |
| **warning** | still reachable, and the margin is gone | `“Pinterest” “3” of “3” used — one more ends it` · less of the day left than the hours still owed |
| **notice** | still owed, and there is room | `“Go to bed in time” to answer` · `“3h” more of “Lessons”` |
| **good** | nothing owed and nothing spent | `“Pinterest” “0” of “3” — clean` · `“Lessons” “3h” of “3h” — done` |

This is the existing `RiskLevel` with `safe` split in two. `safe` was always
two different states wearing one word — *nothing to do* and *plenty of time to
do it* — and collapsing them is what forced `dueToday` to exist as a separate
function computing half the same thing.

**The sleep case falls out with no special case at all.** `wake up = no` is
spent → `danger`. `go to bed` unanswered is owed → `notice`. One condition of
one rule produces two notices at two levels, because it is in two situations.

### The thresholds are unchanged

`warning` keeps the figures already in the code and already reasoned about:

- **time** — `owed × 2 > minutes left in the day`. More than half of what is
  left would have to go on this one thing.
- **counts and checks** — `EVENING_MINUTES`, six hours of the day left. A count
  has no rate to fall behind, so the day itself is its clock.
- **a ceiling standing exactly on its limit** — `spentAllowance`, which
  deliberately never fires for a ceiling of nought, because *never do X* sits
  at its limit from midnight to midnight.

Changing a threshold and the level set in one go would leave nobody able to say
which change helped.

### Both scopes, all four levels

`dueToday` returns `null` for a weekly rule, with a note: *a weekly rule's
"today" is a question about pace, which `PaceCard` already answers properly.*

That is right about its subject and wrong as a prohibition. It is true of a
**floor** — how much is left against how many days are left is exactly pace.
It is false of a **ceiling**, which knows nothing about pace and everything
about headroom, and headroom reads the same at either scale. `at most 3 a week`
with none used is `good`, with two used is `notice` (`“1” of “3” left this
week`), with three used is `warning`, with four is `danger`.

### Bug: a weekly ceiling never warns at all

Independent of the level set, and it survives every other fix. `weeklyRisk`
tests only floors ([streakRisk.ts:415](../src/lib/streakRisk.ts)):

```ts
const need = owed(r, ctx, todayKey)
if (need <= 0) return
```

`owed()` returns nought for a ceiling by design — *there is no amount of doing
that fixes having done too much.* So the loop returns before looking, and the
brink check (`spentAllowance`) exists only in the day-scope branch. **Every
weekly rule with a ceiling has been silent about it since weekly rules
existed.** The same shape as the two holes `spec 013` closed: a ceiling that
could not be seen, in a branch nobody had walked.

### One notice per rule per level

A rule with two breached ceilings produces **one** `danger` carrying two lines,
not two notices. A rule with a broken check and an unanswered one produces one
`danger` and one `notice` — which is the whole point.

Five rules therefore produce five to nine notices, not thirty. That bound is
what stops the board being the dashboard `spec 010` part 3 deleted.

### What else speaks

Four sources beyond the rules, each already computed:

| source | level |
| --- | --- |
| **the composite** | mirrors the day — `notice` while open, `danger` once the day is missed. Never `good`: it would restate every green rule line |
| **freezes** | `notice` on weekdays (*1 of 1, lost on Sunday*), `warning` on Saturday and Sunday if the allowance is intact and there is something freezable |
| **unsealed weeks** | `good` — *this week is clean so far, it pays out on Tuesday.* `ruleStatus.open` already holds it |
| **achievements in reach** | `notice` — *4 days to “100 kept days”* |

Freezes are the only source whose level moves with the calendar, and that earns
it: **an expiring allowance is the one loss in this app that happens by doing
nothing.**

### The module

`streakRisk.ts` becomes **`lib/notices.ts`**. `ruleRisk` and `dueToday` are
deleted; `notices(project, now): Notice[]` replaces both. Everything doing the
actual work — `todayUrgency`, `spentAllowance`, `weeklyRisk`, `owed`,
`minutesLeftToday` — moves across unchanged.

```ts
export type NoticeLevel = "danger" | "warning" | "notice" | "good"

export interface Notice {
  /** A rule id, or one of the four fixed sources. Never two per level. */
  id: string
  level: NoticeLevel
  /** The rule's own colour and icon, or the source's. */
  tint: string
  icon: string | null
  /** The rule's label, or the source's name. */
  title: string
  /** One per thing there is to say. Already quoted, for `Sentence`. */
  lines: string[]
  /** What it costs or what is at stake. `danger` and `warning` only. */
  detail?: string
  /** The rule's panel, opened on click. Absent for the fixed sources. */
  ruleId?: string
}
```

A wrapper over the old three levels was the alternative and is refused: a
translation between two level sets is precisely where the two would drift.

**Nothing else keeps a copy.** `StreakBar` loses its `risks` and `due` props
entirely and computes its `3 of 5 holding` line from the notices — a rule is in
trouble when it has a `danger` or a `warning`.

### The wording is nearly free

Both generators exist. `clauseReadoutParts` in `"failing"` mode already writes
the `danger` and `warning` lines, including the slot-aware form `spec 013`
fixed. In `"all"` mode it already writes `“Pinterest” “0” of “3”`. `dueToday`
already writes `“3h” more of “Lessons”` and `“Go to bed in time” to answer`.

Two things are new:

1. **The `"failing"` filter splits.** It must return which of the two buckets a
   target fell into, not merely that it fell into one. That is the fix to the
   line quoted at the top of this spec, and every other change here depends on
   it.
2. **`good` says a word as well as its figures.** `“Lessons” “3h” of “3h” —
   done` and `“Pinterest” “0” of “3” — clean`. A floor met is finished work; a
   ceiling untouched is an intact reserve, and they are different things to be
   pleased about. Without the word both read as a pair of numbers, and the
   green line exists to **remind you the rule is there** — a reading does not
   remind anybody of anything.

### `npm run sweep` is rewritten in the same commit

Fifteen risk cases assert one of three levels. Several change their expected
answer without any behaviour changing, purely because `safe` split:
`ceiling · room left · nothing to say` is now `good`,
`check · unanswered · morning is not an emergency` is now `notice`.

Expectations in that file are written out and never derived, on purpose — so
this is hand work, and it belongs in the same commit. **A sweep left red is a
sweep nobody reads**, which is how the throwaway version of it earned its
reputation before it was checked in.

---

## Part 2 — The board

**It is the only place.** `StreakAlarms` is deleted. The chevron list is
deleted. Everything a notice could say is on the board and nowhere else.

That is a real trade and it is worth naming: **danger no longer comes and finds
you.** What makes it acceptable is that the board is open by default and its
state persists, so the normal condition of the app is that everything is
already on screen. What covers the abnormal one is the toggle's badge, below.

### Where

Where the alarms were: the first block under the period bar, **above**
`StreakBar`. `spec 010` part 3's placement argument transfers whole — *a
warning under the number it is about reads as a footnote to it, and a footnote
is something you finish reading rather than something you do.*

It is therefore not drawn like the panels that open from the toggle row, which
appear below the streak row. It is the page's own block that happens to fold.

### It is always about today

Every other panel follows the period cursor, and this one must not. A notice is
a thing you can **act on**; the levels are built on the difference between
*already spent* and *still owed*, and *still owed* about last Tuesday is not a
sentence. Step the period to March and the board still reads today.

The panel subtitle says `Today`, so that reads as a fact rather than as a bug.

### Two weights, not four

| level | drawn as |
| --- | --- |
| `danger`, `warning` | a filled block with an inset ring in the level's colour — what `RiskBlock` draws now |
| `notice`, `good` | a line: a dot in the rule's colour, the rule's name, the text. No surface, no border |

This is the answer to the complaint that opened the spec. Not a third volume —
**two**, with the level choosing. Open the board and everything is visible at
once, and red still reads as red because green is not shouting beside it.

One weight for all four would rebuild the dashboard: five green blocks with
equal presence is exactly the row `spec 010` part 3 deleted, for exactly the
reason it deleted it.

### Order

Flat, sorted by level — `danger`, `warning`, `notice`, `good` — and within a
level, **the order the rules were written in**. Never by severity within a
level and never alphabetically: a list that reorders itself has to be re-read
from the top every time.

No level headings. The filter buttons already group; headings plus a filter is
two mechanisms for one job, and filtered to a single type the heading is a
lone label over the only thing there.

The four fixed sources sort to the **end of their level**, after the rules. The
rules are promises you wrote; the rest is bookkeeping about them.

### The type filter

A row of four count buttons above the list, inside the panel — not in the
toggle row, which already scrolls sideways on a phone.

```
[ 1 danger ] [ 1 warning ] [ 5 notice ] [ 2 good ]
```

Each carries its level's colour as its background, which is the legend. Click
filters to that level, click again releases it, **several can be held at
once**. A level with nothing in it keeps its button, dimmed and inert: buttons
that vanish mean the control changes shape under your hand.

### Clicking a notice

Opens that rule's panel. `detail` — `1 freeze covers it · keeps 12 days · 3
available` — stays on `danger` and `warning`.

**No freeze button on the board.** `CLAUDE.md` is explicit that a freeze is
spent from the strip and from nowhere else, because a day can break three rules
at once. A click that takes you to where it is done is the same journey without
a fourth place to spend one by accident.

### Edges

- **No rules at all** — the toggle is absent, not disabled, exactly as the
  sleep toggle is when sleep is off. There is nothing behind it.
- **No notices with rules present** — near-impossible, since every judging rule
  yields exactly one. If it happens: a plain line of text, no surface. A box
  saying nothing is here reads as a failed load.
- **Every type filtered out** — the same, saying so.

### State

`localStorage`, under `timelens-notices`, holding open/closed and the held
filters. Same pattern as `timelens-theme` — a cookie would ride on every
request for nothing.

Open on a first visit, as asked. It is the one panel whose state persists;
every other one is a look rather than a preference, and stays that way.

---

## Part 3 — Three buttons

The toggle row gains three. `PanelToggle` already takes `count`, `countColor`
and `countIcon` — left over from the streak button removed in `spec 010` — so
nothing new has to be drawn.

| button | icon | carries |
| --- | --- | --- |
| the board | `Bell` | **every** notice, counted. Coloured by the worst level present |
| the account | `Coins` | points, abbreviated past a thousand — `4.1k` |
| the streak | `Flame` | the composite's days. No freezes: there is no shared pool any more |

**The badge's colour is what survives of "it comes and finds you."** A closed
board with a red figure on its bell is not a red block across the page, and it
is not nothing, and it costs one prop that already exists.

**The streak button does not colour.** We have just built exactly one place to
look when something is wrong; a second red mark two centimetres away means
neither of them means anything.

`Flame` is already the language of streaks throughout the app, so the button
needs no label. `Coins` does not collide with the shop's `Gift`: a gift is what
you buy, coins are what you pay with.

---

## Part 4 — The account, and what the shop keeps

`ShopSection` currently holds the balance card — total, earned, spent, not yet
counted — under a comment defending it: *the balance lives here because this is
the moment it is for; you look at an account when you are about to spend it.*

That defends the **moment**, not the four figures. The moment needs one line;
the four figures answer a different question — *how did it get there* — and
that question now gets a panel.

### The account panel

- **The total, large, at the head.** The one figure a decision is made against.
- **Earnings by day, as signed bars.** `+10` up, `−20` down, straight off
  `project.dayLedger`, which is `{ day: { kept, sealedAt } }` and needs no new
  arithmetic.
- **A running total as a figure, not a second line on the chart.** Two axes in
  one card is what `StreakChart` refuses everywhere else.
- **Rewards and purchases as a list below**, not as marks on the chart. They
  are not earnings-by-day; they are events, and the shop already lists
  purchases this way.
- **A button through to the shop**, which opens it and closes this.

### The bar step

Days up to a month. Weeks in a quarter. Months in a year and in `all` — the
same thinning `Heatmap` already applies to long periods.

A caption says which: `by day` / `by week` / `by month`. Without it a `−60` bar
in the year view reads as one catastrophic day rather than a quiet month with
three misses.

### The shop keeps

The shelf, the purchase history, **one line** of balance beside its heading,
and a button back to the account. The moment survives; the four figures move.

---

## Part 5 — Solo

> чтобы можно было посмотреть на такое отображение, не отвлекаясь на то, что
> половина дней — красная

Not a filter. `CountFilter` strikes out **data**, and every figure below it
shrinks; this changes **who votes**, which is a different kind of act. Putting
it in that panel would make one dot mean two incompatible things: *my numbers
are filtered* and *my verdicts are filtered*.

Not a set of checkboxes either. What was asked for is *look at just this one*,
and that is a single choice.

**Solo is a mode**: pick one rule, and the page redraws as though it were the
only rule that votes.

### Two doors, one state

- The rule's own panel (`CustomStreakSection`) — *Show only this rule*. You are
  already looking at the suspect.
- The composite's breakdown (`KeptSection`) — beside the per-rule rows, which
  is where you are working out which promise keeps doing this to you.

### What it redraws, and what it must never touch

**Redrawn:** day colours on the cards, in the month grid and in the heatmap;
the verdict ring, down to one arc; the week blocks; `KeptCard`'s days and
weeks, recomputed under the one rule; and the board, filtered to it.

**Untouched, always:** points and the balance, achievements, freezes, the
change log — everything that is a written ledger. They are history, not
drawing, and *looking* must not be able to move them even on screen.

### Loud and temporary

A sticky bar under the period bar, in the rule's own colour:

> Showing “Pin Ctrl” only — day colours, rings and streak counts. Points and
> achievements are unchanged.

with a close. Cleared on reload, never persisted. The second sentence is not
optional: without it the mode looks like a way of rewriting the record, and
**a view that quietly changes what red means is the most dangerous thing in
this spec.**

---

## Decisions

**1 — The board is the only place, and the alarms go.** The alternative kept
`StreakAlarms` above the fold as the `danger`+`warning` slice, so urgent things
still came and found you. It was refused because a danger would then be drawn
twice at once, and the request was explicitly that everything be visible in one
place. What replaces the alarm's reach is the bell's coloured badge, and the
fact that the board is open by default.

**2 — Volume is a property of the notice, not of where it is put.** The whole
spec turns on this. Two weights inside one board, chosen by level — rather than
two locations, chosen by the designer — is what makes a friendly reminder
possible at all: it can be present without being an alarm, and visible without
being hidden.

**3 — The levels split `safe`; they do not re-cut the thresholds.** Every
figure `spec 010` part 3 reasoned about survives. The only thing that changed
is that *nothing to do* and *plenty of time to do it* stopped sharing a word.

**4 — Notices are derived, never stored.** Every one of them is a statement
about the state of today, not a record of something that happened. Storing them
would buy *I saw that yesterday* at the price of a table, a migration, a
staleness rule, and the question of what a notice means after its day was
edited. The change log is the app's history and is enough.

**5 — Solo may not touch a ledger.** The line is drawn at *written once* rather
than at *derived*: day colours are derived and move, points are written and do
not. Anything else makes a viewing mode into an editing one.

---

## Vocabulary

Add to `CLAUDE.md`'s **The words**, since two of these will be in six files:

| word | what it is |
| --- | --- |
| **spent** | a deficit nothing can undo before midnight — a breached ceiling, a check answered outside its accepted set |
| **owed** | a deficit the rest of the day can still clear — a floor short of its figure, a check with no answer |
| **notice** | one thing worth saying about today, at one of four levels. Never two per rule per level |
| **the board** | where every notice is read. Not a panel that opens from the toggle row; the page's own block, above the streak row |
| **solo** | viewing the page as though one rule were the only one that votes. A drawing, never a verdict |
