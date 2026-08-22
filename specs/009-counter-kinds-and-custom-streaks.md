# 009 — Counter kinds, and custom streaks

Two features, one document, because the second is built out of the first: a
custom streak is a rule read against counters, and half the rules people want
are about things that either happened or did not.

The five open questions this started as are answered, and the answers are
folded in below; the record of them is at the bottom.

---

# Part 1 — Two kinds of counter

## The one idea everything rests on

`spec 008` said a boolean is a counter that stops at one, and that was true
enough to ship `oncePerDay` on. It is not true enough to build on, because the
two answer **different questions**, and a question with no answer is not a
question you can put a number field under:

- *How many lessons today?* — three, or none, or eleven. A **tally**.
- *Did you oversleep today?* — not a number. And critically, not a yes/no
  either: at 09:00 you genuinely do not know yet, and "no" recorded at 09:00 is
  a claim about the rest of the day you are not entitled to make. A **check**.

A check therefore has more states than a tally has values, and that is the
whole difference:

| state | meaning | stored as |
| --- | --- | --- |
| `unknown` | the day is still open and nothing has been said | nothing — absence |
| `yes` | it happened | `"yes"` |
| `no` | it did not, and you are saying so | `"no"` |
| `skip` | this day does not count for this check | `"skip"` |

**`unknown` resolves to `no` once the day is over.** That is what makes the
common case free: you only ever touch the ones that went wrong, or the ones you
want to close out early. Nothing is stored for an ordinary day, exactly as
nothing is stored for a tally that stayed at zero.

The one asymmetry worth stating out loud: `no` and an unrecorded past day are
the *same* verdict everywhere downstream. `no` exists so a day still inside the
editing window can be closed deliberately — "I am done, this one is settled" —
not because anything reads it differently.

## Naming

`oncePerDay` goes; the kind replaces it. In the type,
`kind: "tally" | "check"`.

In Setup, counters split into a second level of tabs, named for the question
rather than for the mechanism:

```
Counters   ▸   Tallies   ·   Checks
               how many       whether or not
```

"Boolean" is out because it is not one — there are four states. "Event" is out
because it collides with `Entry`, which is already the word for a thing that
happened at a time. "Check" carries the daily-checklist sense, tolerates three
states the way a real checklist does, and reads correctly in a sentence: *the
Overslept check for Tuesday is No.*

## Migration of existing data

`oncePerDay: true` becomes `kind: "check"`; everything else becomes
`kind: "tally"`. That is exact — `oncePerDay` was only ever set on things that
either happened or did not — so an Overslept unit lands in the right tab with
nothing to do by hand. `oncePerDay` stays in the type, deprecated and unread,
beside `relation`.

## Where check states live

Checks are **day-level, not slot-level**. "Did you oversleep in the morning
slot" is not a question; the tally is where slots earn their keep.

**`yes` is not stored as a state. It stays a count of one**, where it already
is, in `counters` — because that is what it is, and because storing it twice is
the shortest road to two fields disagreeing about the same Tuesday. What the
new field carries is only the two things a count cannot say:

```ts
/** The two marks a count cannot express. `yes` is a count; unknown is absence. */
type CheckMark = "no" | "skip"

interface Day {
  checks?: Record<string, CheckMark>
}
```

So a check's state is *derived*, and there is exactly one way to compute it:

```
checks[id] === "skip"          -> skip
checks[id] === "no"            -> no
count(id) > 0                  -> yes
the day is over                -> no
otherwise                      -> unknown
```

This is what makes the whole feature cheap. Every existing consumer of counts —
the day badges, the period chips, the count filter, both counter chart modes —
keeps working on checks without knowing they exist, and "how many times did I
oversleep in July" stays a question with an answer. The alternative, one field
holding all three states, would have moved every existing `oncePerDay` mark out
of `counters` and then had to teach five separate readers to go looking for it.

Existing data needs no move at all: an Overslept unit that was `oncePerDay` has
its marks in `counters` already, and they read back as `yes` unchanged.

**One column** — `migrations/011_check_marks.sql`, a single
`alter table days add column if not exists checks jsonb not null default '{}'`.
`schema.ts` does the other two edits for you once `Day` has the field.

Writes go through one helper rather than being assembled at the call sites,
since two of the five transitions have to touch both fields: setting `no` or
`skip` has to clear the count, and setting `yes` has to clear the mark.

## What it looks like on a day

A check does not get a count badge. It gets a chip carrying its icon and one of
four states, and clicking it opens Yes / No / Skip / Clear.

**The chip is not colour-coded good and bad.** `yes` is bad for Overslept and
good for Went to bed on time, and the app has no way to know which — that is
what a streak rule is for. So: `yes` is the unit's own colour, filled; `no` is
hollow; `skip` is struck through; `unknown` is a dotted outline. State, not
verdict.

The editing horizon applies unchanged — today and yesterday.

---

# Part 2 — Custom streaks

## The rules that have to fit

Everything below is shaped by these, and nothing else:

1. **Wake up on time** — the `Overslept` check must be No, every day.
   2 freezes a week.
2. **Go to bed on time** — the `Bedtime` check must be Yes, every day.
   1 freeze a week.
3. **No youtube in the evening** — the `Youtube` tally must be 0 in the Evening
   and Night slots, every day. 1 freeze a week — and **two slips in one evening
   costs two freezes**, so one freeze is not enough and the streak breaks.
4. **Gym** — either *at least 3 in the week*, or *at least 1 on each of Mon,
   Wed and Fri*, other days free.

Rule 3 decides the shape of the economy. Rule 4 decides the shape of the form.

## The rule

```ts
interface StreakRule {
  id: string
  label: string
  iconName: string
  color: string
  description?: string

  /** Is a day judged, or a week? */
  scope: "day" | "week"
  /** Day scope only. Empty means every day; otherwise only these weekdays are judged. */
  weekdays?: number[]

  /** What is measured. */
  unitId: string
  /** Tally sources only. Empty means the whole day. */
  slotIds?: string[]

  /** What counts as kept. */
  op: "atLeast" | "atMost"
  value: number

  /** Granted every week, spend them or lose them. */
  freezesPerWeek: number
  /** The ceiling on banked reward freezes, as 15 is the ceiling on the main streak's. */
  freezeCap: number

  /** No loosening before this date; narrowing is free. See "The lock". */
  lockedUntil: DayKey
  /**
   * When the rule came into force — days before it are not judged, and it is
   * also the setup day the lock stands aside for.
   */
  startedOn: DayKey
}
```

A check reads as 1 for `yes` and 0 for `no`; `skip` is handled below.

The rules, in that shape:

| | scope | unit | slots | test | freezes/wk |
| --- | --- | --- | --- | --- | --- |
| Wake up on time | day | Overslept | — | atMost 0 | 2 |
| Bedtime | day | Bedtime | — | atLeast 1 | 1 |
| No evening youtube | day | Youtube | Evening, Night | atMost 0 | 1 |
| Gym, 3 a week | week | Gym | — | atLeast 3 | 0 |
| Gym, Mon/Wed/Fri | day | Gym | — | atLeast 1, weekdays [1,3,5] | 0 |

One shape, all five. That is the test that it is the right shape.

## Deficit — the unit of failure

Not "the day failed", but **by how much**:

```
atLeast n  ->  deficit = max(0, n - actual)
atMost  n  ->  deficit = max(0, actual - n)
```

A freeze pays for **one unit of deficit**, and a period is frozen only if the
whole deficit can be paid. Two youtube slips in one evening is a deficit of 2,
one freeze is not enough, nothing is spent, and the streak breaks — which is
rule 3 exactly as stated, falling out of the arithmetic rather than being a
special case.

Partial spending is refused on purpose: a day that breaks anyway should not
also cost you the freeze.

## `skip` costs a freeze

This is the load-bearing decision of the whole feature.

`skip` is a **miss with a deficit of 1**, not an exemption. Everything else
about the streaks in this app follows the same rule — "ignoring a day does NOT
affect a streak, otherwise marking the bad days ignored would be the easy way
to fake one" — and a free per-day escape hatch would make every custom streak
decorative.

What `skip` buys is honesty in the record, not leniency: *I did not try* and *I
tried and failed* are different facts about a Sunday, and a panel can count
them separately. The price is the same.

The genuine "not applicable" is `weekdays`, and it is genuine because it is
declared in advance and locked for a week. Saturday is not a gym day because
you said so last Tuesday, not because Saturday went badly.

## The economy

Two pools per rule, behaving differently on purpose:

- **Weekly freezes.** `freezesPerWeek`, granted at the start of every week,
  **expiring unused at the end of it**. This is the allowance you set for
  yourself: "I know I will not manage seven out of seven."
- **Earned freezes.** A week kept clean grants **+1**, banked, carried over
  indefinitely, capped at `freezeCap`, consumed when spent. This is the reward,
  and it is the only thing that accumulates.

Spending takes from the weekly pool first, since it is the one that expires.

A week is *kept clean* when every judged period in it was met or frozen — so a
week you froze your way through still earns its reward. That matches the main
streak, which pays out on a week with no missed day, freezes included.

Sealing is the existing rule, unchanged: a week seals on the Tuesday after it
ends, when its last day passes out of the editing window (`isSealable`), and
only then is a verdict written. Verdicts are an **append-only ledger per rule**,
for the same reason `week_verdicts` is: re-breaking and re-fixing a past week
must not mint a second freeze.

### When a freeze can be spent

**Today and yesterday**, the same window the log itself is written in.

The alternative — any day of a week that has not yet sealed — was considered
and dropped. It reads better on paper for a weekly allowance, and it costs the
one rule everything else in this app is built out of: a day you can still act
on is a day whose verdict is not yet a fact. Two windows would also have to be
explained separately every time either appears, and "you can freeze it until
Tuesday but only log it until tomorrow" is not a sentence anybody should have
to hold.

So the allowance is weekly in how it is *granted* and daily in how it is
*spent*. The practical effect is that a freeze is a decision you make about a
day while you can still remember it, which is the same discipline the log
already asks for.

## The lock

**A change waits seven days unless it can be proved that it cannot make the
rule easier.**

The test is deliberately **one-sided**, and that is the whole reason it is safe
to have a clever rule here at all. It does not sort edits into "loosening" and
"tightening" — that sort is not always possible, and a rule that guesses wrong
in the wrong direction is worse than no rule. It asks one question: *is every
period that passes under the new rule also a period that passed under the old
one?* If yes, the change can only ever cost you, and it goes through
immediately. If no — **or if the answer is not decidable** — it waits.

Which means the awkward cases fall the right way without anyone having to
decide what they are. "Never do X this week" becoming "always do X this week"
is neither a loosening nor a tightening; it is incomparable, so it is not
provable, so it waits. Same for swapping the counter, and same for switching
between judging a day and judging a week.

What *is* provable, dimension by dimension, holding everything else equal:

| change | verdict |
| --- | --- |
| `atMost n` → `atMost m`, m ≤ n | harder |
| `atLeast n` → `atLeast m`, m ≥ n | harder |
| `atMost` ↔ `atLeast` | incomparable — waits |
| more judged weekdays | harder |
| fewer judged weekdays | easier — waits |
| a different set of weekdays, neither a superset nor a subset | incomparable — waits |
| more slots, under `atMost` | harder (more is counted against you) |
| more slots, under `atLeast` | easier — waits (more ways to reach the number) |
| fewer `freezesPerWeek`, lower `freezeCap` | harder |
| any change of `unitId` or `scope` | incomparable — waits |

A change is allowed immediately only when **every** dimension it touches is
"harder" — one easier dimension is enough to make the whole edit wait, since
the dimensions are not a currency you can trade between.

The slot rows are the two that need their reasoning written down, because they
point in opposite directions for the same edit: under `atMost` a slot is a
place you can be caught, so adding one narrows the ways through; under
`atLeast` a slot is a place the count can come from, so adding one widens them.

**Tightening does not reset the clock; loosening does.** The lock exists to
stop you buying your way out of a bad week, and making the bar higher never
does that — charging a week of flexibility for raising it would only discourage
raising it. Nor is it a way in: to end up anywhere easier than you started you
still need a loosening, and that is still gated on the clock the last loosening
set.

The label, icon, colour and description are not terms at all and change freely.

**The form says which it decided, every time**, because a clever rule nobody
can predict is worse than a blunt one they can:

```
      This only narrows the rule — saved.
      This could make the rule easier. It waits until 29 Aug.
```

The reason is written there too, since a lock nobody understands reads as a
bug: *a rule you can loosen on the day it starts to hurt is not a rule.* The
point of setting a limit in advance is to be the person who set it rather than
the person living under it.

**The day a rule is written is yours to get it right on.** Nothing is locked
until the next day, and nothing you do on that day starts the clock. This was
not in the first draft — the first draft locked a rule from birth, which turned
out to mean you could not configure it: setting one up takes several changes,
most of them incomparable to the defaults, so the lock closed on the first
click and left you with the rule the app had guessed. Nothing is at risk on
that day either, since the rule has judged no sealed week yet.

That leaves delete-and-recreate as the way round the lock, and it is left open
on purpose: it costs the streak, and the streak is the only thing anybody was
protecting. A lock that also had to survive a rewrite would be defending the
paperwork rather than the promise.

## The form

The tab is Setup ▸ **Streaks**, and the shared half — name, icon, colour,
description, reorder, delete — is `EditableList`, like every other tab. What is
new is the rule, and the rule is written as **a sentence with dropdowns in it**:

```
+----------------------------------------------------------------------+
|  (*) Wake up on time                              ^  v      ...       |
|      Getting out of bed when the alarm says so                        |
|                                                                       |
|      JUDGE     [ Every day ]  Every week   On chosen days             |
|                                                                       |
|      KEEPING   [ Overslept v ]   must be   [ No v ]                   |
|                                                                       |
|      FREEZES   [ 2 v ] a week, expiring  .  bank up to [ 15 v ] earned|
|                                                                       |
|      -- This week: 5 kept . 1 frozen . 1 to go --                     |
+----------------------------------------------------------------------+
```

Three lines, and the middle one **changes shape with the counter you pick**,
because that is the difference between the two kinds:

- a **check** — `must be` [ Yes | No ]
- a **tally** — `must be` [ at least | at most ] [ 3 ] `times` `in` [ slot chips ]

Picking *On chosen days* opens a row of weekday chips under the first line;
picking *Every week* takes the weekday chips away and switches the count to
per-week.

Why a sentence rather than a grid of labelled fields: this is a rule you will
be judged against for months, and the only way to check that what you built is
what you meant is to **read it back**. `op: atMost, value: 0` is correct and
unreadable; "Youtube must be at most 0 times in Evening, Night" is the same
thing said in a way you can disagree with.

The line at the bottom is the rule applied to the week you are in, and it is
there because the second-best way to check a rule is to see what it says about
right now.

**When locked, the three lines are text, not disabled controls** — the same
choice the app already makes for a day that has not happened yet. A greyed
dropdown invites a click that does nothing; a sentence and a note do not:

```
      Locked until 29 Aug. A rule you can loosen on a bad day is not a rule.
```

While the clock is running the controls are still there for anything that
*narrows* the rule — that is the point of the one-sided test — and the line
under them says what the edit in progress would count as before it is
committed.

## Where the streaks are shown

A **row of streak buttons**, its own row under the period bar, horizontally
scrollable, project-wide. The main streak moves into it as the first button and
stops being a lone toggle in the period bar.

Each button carries four things, left to right:

```
 [icon]   fire 12    snowflake 2    star 3
           days      this week       banked
```

The two freeze counts have to be told apart at a glance, since one of them
disappears on Sunday night and the other does not: **the weekly allowance is a
hollow snowflake in dim ink, the banked reward a solid one in the freeze blue.**
Tooltips name them in full.

Clicking one opens that streak's panel below, built from `PanelSection` like
every other panel, in the rule's own colour. Inside: current and best streak,
the week as seven cells (met / frozen / missed / not judged), both freeze counts
with what they are, the open-week note the main panel already has, and the
reward ledger — a reward that simply fails to appear is indistinguishable from a
bug.

**Freezes are spent from that panel, on its week strip**, not from the day card.
A day can break three rules at once, and a snowflake per rule on a card that
already carries badges, sleep, a note and an add button is how a card stops
being readable. The main streak keeps its own snowflake on the card, because it
is about the day's hours and that is what the card is about.

## Storage

`settings.streakRules` — a `StreakRule[]` riding in the `settings` jsonb, the
way `tags` does, so the rules themselves need no migration.

The verdict ledger does need one, since it is a row per rule per week and
`settings` is read as a unit. `migrations/012_streak_rules.sql`, one table:

```sql
create table streak_verdicts (
  project_id text not null references projects(id) on delete cascade,
  rule_id    text not null,
  week_key   text not null,
  kept       boolean not null,
  sealed_at  timestamptz not null default now(),
  primary key (project_id, rule_id, week_key)
)
```

Spent freezes are per rule per day and belong beside the day rather than in a
table of their own: `Day.ruleFreezes?: string[]`, the rule ids frozen on that
day — `days.rule_freezes`, in `012` beside the ledger it belongs with. A
**weekly** rule's freeze goes on the Monday of the week it covers: a week has
no row of its own, and its first day is the one place both halves of the app
can agree to look. `freezeOffer` returns that key so no caller has to remember
it.

A weekly rule's spending window widens to match: a *day* is freezable while it
is writable, a *week* while any of its days is. Otherwise a rule about a week
could only ever be frozen on a Sunday or a Monday, which is not a window but an
accident of where the horizon happens to fall.

---

## Decisions

The five questions this document opened with, and how they were answered.

1. **Naming** — Tallies and Checks.
2. **`skip` costs a freeze.** It is a miss like any other: something did not
   happen, and it takes a freeze to stop that counting as a failure. What
   separates it from a plain miss is the record, not the price.
3. **Spending window** — today and yesterday, the same as the log. Written up
   above.
4. **The lock is one-sided**, with the one-sided *test* described above: prove
   it cannot get easier, or wait. Chosen over the blanket seven-day lock, and
   safe to choose because an edit that cannot be classified waits by default.
5. **A week carried by freezes still earns its reward.** Freezes are part of
   the rule you wrote, not a failure to keep it: a week you set yourself two
   freezes for and used both is a week you planned correctly.
