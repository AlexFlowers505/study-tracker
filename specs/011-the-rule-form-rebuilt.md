# 011 — The rule form rebuilt, and what falls out with it

One sentence stopped being enough. `spec 009` gave a rule the shape *judge
every [day/week], keeping [this] in [these slots] [at least/at most] [n] on
[these weekdays]*, and said: if a further kind of rule will not fit it, the
shape is wrong rather than the rule. Several now do not fit.

- A rule cannot name **several** counters, so "any of my three study
  activities" is three rules and three streaks.
- A rule cannot name a **category or a tag** as a set, only as a single target.
- A rule cannot say **different numbers on different days** — three hours on
  Monday, ninety minutes on Thursday — except through `useDailyGoal`, which is
  a back door into a different feature entirely.
- A rule cannot say **both a floor and a ceiling**.
- A rule cannot put a requirement **on a particular slot** while leaving the
  rest of the day free.

So the form is rebuilt around what it is actually for: **choosing the counters,
then stating the conditions.** The effectiveness meter goes with it, because
`useDailyGoal` was only ever the goal leaking into the rules, and once a rule
can say "3h on Mon, 1h30 on Thu" itself there is nothing left for the goal to
do that a rule cannot say better.

---

## Status

- [x] **Stage 0 — The eight small fixes.** Landed, commit `d3b1794`. The ring
      closes for a single rule; the trophy case is called Achievements; a tall
      tooltip stays on screen; the icon grid names its icons after a dwell;
      Done looks like a button; Setup's tabs scroll and its modal has a fixed
      height; a month cell caps its counter dots; a missed day costs three.
- [ ] **Stage 1 — Checks lose `unset`.** Part 2. Smallest, and everything in
      the form's check handling depends on the answer being one of three.
- [ ] **Stage 2 — The Counters section.** Part 1a. Multi-select targets,
      sets by category/tag, and the kind narrowing that follows from them.
- [ ] **Stage 3 — Days & Slots & Conditions.** Part 1b. Per-day numbers,
      floors and ceilings together, slot requirements.
- [ ] **Stage 4 — The effectiveness meter goes.** Part 3. Needs a migration
      that turns every `useDailyGoal` condition into explicit per-day numbers,
      and it must run **before** the field is dropped.
- [ ] **Stage 5 — The ring: weights and a detail view.** Parts 4 and 5.

Build 1 → 5. Stage 4 cannot precede stage 3 (there is nowhere for the
expanded goal to go) and stage 3 is far easier once stage 2 has settled what a
condition's target looks like.

---

# Part 1 — The form

Two sections, in this order, each with a heading heavier than the field labels
inside it.

## 1a. Counters — the first section, and the important one

Everything here answers one question: **which counters does this rule watch?**

**Entity** — the kind. `All study time` is **removed**: it was the one target
with no id, it exists only because the old goal needed it, and with activities
selectable as a set it says nothing that "every activity" does not say better.
What remains:

| Entity | Then you pick |
| --- | --- |
| Activities | one or more activities |
| Tallies | one or more tallies |
| Checks | one or more checks |
| Categories | one or more categories, **then** a counter kind |
| Tags | one or more tags, **then** a counter kind |

**Picking a set needs a kind, and that is not a nuisance — it is the whole
reason the two paths differ.** A category holds activities, tallies and checks
at once, and the three are not commensurable: an activity is minutes, a tally
is occurrences, a check is an answer. A condition carries one number, so the
rule has to say which kind of thing inside that category it is counting.

- **Sets** — the chosen categories or tags.
- **Counter type** — activity / tally / check.
- Then the form **lists the counters this resolves to**, read-only. That list
  is the whole point of the two-step: you chose a shelf, and you are entitled
  to see what is on it. It is deliberately not editable — editing it would mean
  you wanted the counters and not the shelf, and that is the other path.

**Choosing counters directly is multi-select too.** "Any of Lessons, Q&A or
Polishing" is one promise about study, not three streaks.

### What this replaces in the data

`StreakClause.target: StreakTarget` becomes a **selection**, and the old single
target has to keep reading. Sketch:

```ts
interface ClauseTargets {
  kind: "activity" | "tally" | "check" | "category" | "tag"
  /** The chosen ids — counters, or the sets that resolve to them. */
  ids: string[]
  /** Only for `category` / `tag`: which kind inside the set is counted. */
  memberKind?: "activity" | "tally" | "check"
}
```

`clauseTarget()` is already the one place that knows a condition once named a
`unitId` and nothing else. It becomes the one place that knows it once named a
single `StreakTarget`, and returns the list. **Nothing else may read the old
field.**

A set resolves at **read time**, not at write time: filing one more tally under
a category changes what the rule watches, which is what a category is for. The
counter *kind* is stored, so that resolution can never change the unit of
measurement — the same reason `targetMeasure` stores it today.

## 1b. Days & Slots & Conditions — the second section

**Judge period** — `by day` or `by week`. This is today's `scope`, moved into
the section it governs and named for what it decides.

### by day → *Days & Conditions*

A number per weekday, the shape the effectiveness meter already uses and the
one people can read at a glance.

- **activities** — hours and minutes per day.
- **tallies** — a count per day.
- **checks** — which answers are allowed that day, multi-select over
  `yes` / `no` / `skipped`.

Every day may also be **any**, which is what makes "Mon Wed Fri only" a
statement about Monday, Wednesday and Friday rather than a `weekdays` array
bolted on the side. `weekdays` therefore disappears: a day with no requirement
*is* a day the rule does not judge.

### by week → *Conditions*

One set of numbers for the week.

- **activities** — a total to reach, and optionally a total not to exceed.
- **tallies** — a count to reach, and optionally one not to exceed.
- **checks** — a count per state: `yes: 6, no: 0, skipped: any`. That example
  is exactly the rule people actually want and cannot currently write: six good
  days, no bad ones, and the seventh may be skipped.

**A floor and a ceiling together, everywhere.** Both optional, both allowed at
once. `op: atLeast | atMost` collapses into `min?: number, max?: number`, which
is strictly more expressive and removes a dropdown.

### Slots

Where the time counts. Absent for checks — a check is answered once for the
day and has nowhere to put a slot.

Two switches govern its shape:

- **Shared time slots** (only under `by day`) — on, one slot set for every day;
  off, each day carries its own. Off is the rare case and must not be the
  default shape of the form.
- **Count by day / count by slot**, and **both may be on**. That is the case
  the current model cannot express at all: *two hours on Monday, of which at
  least one must be in the morning, and the rest wherever.* Day-level and
  slot-level requirements are different requirements and a rule may carry both.

`any` is a value for a slot requirement, not an absence of one.

## 1c. Freezes — the third section

Unchanged in substance: how many a week, and the cap on the bank. Moved into a
section of its own so the form reads as three questions rather than eleven
fields.

Then Cancel / Done, the lock, and the written reason, exactly as now.

## 1d. Field labels sit above their fields

Today the form is `Judge` on the left and `Every day / Every week` on the
right. Every label goes **above** its control. At two columns the eye has to
pair them across a gap on every row, and the pairing is not always obvious once
a row's control wraps.

## 1e. The tab says that streaks are weekly underneath

The daily verdict is what you watch; the **week** is the accounting period —
freezes are granted per week, a clean week banks one, and a week seals on the
Tuesday after. None of that is visible in a tab that talks about days, and it
is the part people get wrong. It goes in the tab's own description, not in a
tooltip.

---

# Part 2 — Checks lose `unset`

Three states: `yes`, `no`, `skipped`. No fourth, and **no automatic resolution
at the end of the day**.

`unset` existed for one reason: an unanswered check had to become something so
the day could be judged, and "not answered" resolving to `no` is what made the
common case free. That was the right answer when every check appeared on every
day card as a checklist you were meant to clear. It stops being the right
answer now:

- A rule can *require* an answer, which is a better reminder than a chip.
- Twenty checks cannot all be drawn on a day card. Activities already are not —
  there are a dozen and the card shows the ones that happened.
- A check you did not answer is **not** a check you failed, and the app was
  asserting that it was.

So a check behaves like every other counter: it is recorded when it happens and
absent when it does not. `days.checks` keeps `no` and `skip`; `yes` stays a
count of one in `counters`; the absence of both now means *absent*, not
`no`.

**This changes what a rule means.** A condition over a check must therefore say
what it wants explicitly — which is what the multi-select in 1b is for — and
"no unanswered days this week" becomes expressible as `yes + no + skipped = 7`
rather than being assumed.

Day cards draw the checks that were answered, plus — while the day is still
editable — the ones a participating rule is waiting on. That last part is the
replacement for the checklist, and it is narrower on purpose.

---

# Part 3 — The effectiveness meter goes

`settings.dailyGoals`, `goalsEnabled` and `goalForDate` stop deciding anything.

**Why.** Every promise is a custom rule now. Counters belong to different areas
of life, and one number per weekday applied to *all* study time was already the
wrong instrument the moment a project had two subjects. `useDailyGoal` was the
bridge, and it is a hole in the lock: the goal is edited in a tab that never
goes near `ruleEdit`, so lowering it loosens every rule reading it for free.
`goalCutEdit` half-shuts that door; deleting the field shuts it.

**What it costs.** The goal is read by ten files. It is a *display* target as
well as a rule input — the "goal 3h" line on a card, the dashed line in
analytics, the heatmap's shading — and those are worth keeping. The proposal is
therefore:

- the goal survives as a **display target only**, or is derived from whichever
  rule votes on the day (open question below);
- `useDailyGoal` is **deleted** from `StreakClause`;
- `migrations/019` rewrites every condition carrying it into explicit per-day
  numbers taken from that project's `dailyGoals` at migration time.

**`019` must run before the field stops being read**, and it is the reverse of
`014`: that one turned the goal into a rule that pointed at the goal, this one
turns the pointer into the numbers it pointed at. On prod that is the
`rule-daily-goal` created six commits ago, whose single condition becomes seven
per-day requirements: 3h Mon–Wed, 1h30 Thu, 3h Fri–Sun.

---

# Part 4 — Weights on the ring

**The idea:** a rule carries a priority, and its arc takes a proportional share
of the circle. Study at 3, wake-up at 1, so study's arc is three times as long.

**Worth doing, with one hard constraint.** The verdict stays binary and stays
"any miss is a miss" — Decision 1 of `spec 010`, which is not up for
renegotiation, because the moment 4/5 almost counts the verdict stops being a
verdict. A weighted ring is a picture of **what the day is made of**, never a
score of how much of it you got.

The risk is precisely that it reads as a score. A ring that is 90% green on a
broken day says "basically fine" far more loudly than five equal segments with
one red one do. Two things keep it honest:

- **a missed arc never shrinks below a floor** — a priority-1 miss is still
  plainly visible, so the eye cannot mistake a broken day for a nearly-whole
  one;
- the centre figure and the day's tint are unchanged: red the moment anything
  is red.

**A cheaper half worth having either way:** order the arcs by priority, so the
rule that matters most always starts at twelve o'clock and the same rule sits
in the same place on every day of the month. That costs one sort and no new
concept.

**What weights must not become:** a way to make a rule count for less in the
verdict. That already exists and is better: turn `inDayVerdict` off. A rule you
would give priority 1 is a rule you are telling yourself is optional, and the
honest way to say so is to stop it voting.

---

# Part 5 — The ring opens

Clicking a ring shows that day's detail: every participating rule, what it
asked for, what it got, and whether a freeze paid for it. `DayReport.readings`
already carries all of it — this is a drawing, not a mechanism.

Rendered as a popover from the ring rather than a modal: the day dialog already
exists for editing, and this is for reading. On a kept day it should be worth
looking at, which means it has to show the *figures* and not only the ticks —
"3h 40m against 3h" is what makes a green day feel earned.

---

## Decisions

1. **`All study time` is removed as a target.** It had no id, it existed for
   the hard-coded goal, and "every activity" as a multi-select says it better.
2. **A set (category or tag) must name a counter kind.** The three kinds are
   not commensurable and a condition carries one number. The resolved list is
   shown read-only, because choosing a shelf entitles you to see what is on it.
3. **Sets resolve at read time; the kind is stored.** Filing one more tally
   under a category should change what the rule watches — that is what a
   category is for — but it must never change the unit of measurement.
4. **`op` becomes `min` / `max`, both optional, both allowed together.**
   Strictly more expressive, and one fewer dropdown.
5. **`weekdays` disappears.** A day with no requirement is a day the rule does
   not judge, which says the same thing in the place you are already looking.
6. **Day-level and slot-level requirements can both apply.** "Two hours on
   Monday, at least one of them in the morning" is a real rule and is currently
   unwritable.
7. **Checks have three states and no automatic end-of-day resolution.** An
   unanswered check is absent, not failed. The reminder job moves to the rules,
   which do it better and only for the checks you said you cared about.
8. **The effectiveness meter stops deciding anything**, and `useDailyGoal` is
   deleted rather than kept as a compatibility field — it is a hole in the
   lock, and a hole nobody can see is worse than a migration.
9. **Ring weights are presentational only.** The verdict stays binary and any
   miss stays a miss. A missed arc keeps a minimum length so a weighted ring
   can never read as a score.
10. **A missed day costs three** (`spec 010` Decision 8 reversed). Symmetric
    keeps the shop reachable for anyone above half, which is true and is the
    wrong thing to optimise: a reward reachable while keeping half your
    promises says half is enough. Break-even now sits at 75%.

## Open questions

- **Does the daily goal survive as a display target?** Ten files read it and
  the "goal 3h" line is genuinely useful. The alternative is deriving the
  displayed target from whichever rule votes on that day, which is more honest
  and considerably more work. Needs an answer before stage 4.
- **What is a rule's priority attached to?** A number on the rule is the
  obvious answer; the ordering half works without one.
- **Do weights apply to `VerdictBar` too?** A month cell's segments have the
  same argument for and a worse case against, since at that size a priority-1
  arc would be sub-pixel.
