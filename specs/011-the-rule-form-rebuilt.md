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
- [x] **Stage 1 — Checks lose `unset`.** Part 2.
      *Landed. `CheckState` is three answers; `checkState()` returns null for
      an unanswered check and no longer takes a date, since an answer that
      depended on what day it was is precisely what was removed. The date
      argument fell out of `readClauseDay`, `readDay` and `freezeCost` with
      it — nothing else was reading it.*

      *Streak arithmetic is unchanged: an unanswered day already read as zero,
      because the old `unknown` resolved to `no` and a `no` is zero. What
      changed is what the app **says** — it no longer asserts that a check you
      never got round to is one you failed.*

      *Day cards draw answered checks only. The refinement in Part 2 — also
      showing the ones a participating rule is waiting on — is **not** built:
      it needs the rules inside a card component, and the risk bar already
      says which rule is unmet while there is still time to act.*
- [x] **Stage 2 — The Counters section.** Part 1a.
      *Landed. `StreakClause.targets` is a list; `clauseTargets()` is the one
      place that knows it was once a single target and before that a bare
      counter id, so every rule ever written still reads. `clauseUnits()`
      resolves a whole condition to its units with nothing counted twice, and
      the day reading unions the activity filters and the unit ids.*

      *Two departures from what this document first said, both found while
      building:*

      *1. **`All study time` stays.** The argument for dropping it was that
      selecting every activity says the same thing, and it does not: study
      time counts whatever was logged, including under an activity created
      next month, where a list freezes the answer on the day it was written.
      It is also the only target with no id. Decision 1 is reversed.*

      *2. **A set may count `Any counter`.** The rule here was "a set must name
      a kind, because the three are not commensurable", and that is half right.
      A tally and a check both measure occurrences — a `yes` is stored as a
      count of one — so adding them works. The pair that genuinely cannot be
      added is time and occurrences, which `measure` already separates. So the
      choice is Activities / Tallies / Checks / Any counter, and the last is
      the absence of `memberKind` rather than a legacy hole.*

      *A **lone** check still reads as an answer, where `skip` is a chosen miss
      priced at one. Several checks fall through to the ordinary count: "at
      least two of these three" is a number, and opting out of one while
      meeting it is not an escape from anything. Verified against the live
      project — legacy single targets, three activities summing, two checks
      counting, one check skipping.*

      *The form still lays the condition out as one row rather than as the
      headed sections this document describes. That layout is stage 3, which
      rebuilds it anyway.*
- [~] **Stage 3 — Days & Slots & Conditions.** Part 1b. In pieces, because
      every one of them moves the arithmetic that prices freezes and decides
      verdicts on data that is already deployed.
  - [x] **3a — floors and ceilings together.** `op`/`value` become
        `min`/`max`, both optional, both allowed at once. `clauseBounds()` is
        the one place that knows a condition used to carry an operator and a
        single number, so everything already written still reads.
        *`deficitOf` takes the worse of the two sides rather than adding them:
        a floor above its own ceiling is not a condition anybody can write, so
        only one can break at a time and the result is the single miss it
        always was.*
        *A condition with both gets **two** pace rows — a floor is a debt that
        should reach nothing by Sunday, a ceiling a budget that should not
        fill, and one chart cannot be both.*
        *The lock compares each bound in its own direction: a floor that rises
        is harder, a ceiling that falls is harder, and adding a bound that was
        not there is automatically no-easier. **A condition carrying both is
        pulled both ways at once, so any change to its slots is incomparable
        and waits** — the one-sided test doing exactly what it is for.*
        *Verified against the live project: 127 days, the same 22-day run,
        the same two missed days at the start of August, the same banked
        freezes. Nothing moved.*
  - [x] **3b — per-weekday numbers.** `days` replaces `weekdays`; a day with
        no requirement is a day the rule does not judge.
        *`boundsOnWeekday()` is the resolver everything now goes through —
        every question about a condition's numbers turns out to be a question
        about a weekday, which is what lets the lock and the benchmark ask
        without inventing a date first. `clauseWeekdays()` answers coverage the
        same way, preferring `days` when it is there: per-day figures already
        say which days are judged, by having one.*
        *`weekdays` is kept rather than deprecated. Most conditions ask the
        same thing every day they cover, and that case stays one pair of
        numbers plus a row of day switches instead of seven copies of one
        figure. `days` is the override, and the form seeds it from what the
        condition already asks — so turning the mode on changes nothing about
        the rule, it only makes the numbers editable.*
        *The lock walks weekdays now: every day the old rule judged must still
        be judged, with no lower floor and no higher ceiling. Days it did not
        judge are skipped, since gaining one is more to keep.*
        *The readback groups by figure — "Lessons at least 3h on Mon, Tue,
        Wed, Fri, Sat, Sun, at least 1h 30m on Thu" — because a sentence you
        cannot hold against what you meant is not doing its job.*
        *This is what lets `useDailyGoal` go before its migration does: that
        exact rule, written out, is accepted as the benchmark and derives the
        same seven figures the goal held.*
  - [x] **3c — slot requirements.** Day-level and slot-level at once.
        *`clause.slots` holds a floor or ceiling on a named slot, on top of
        whatever the day as a whole asks. `slotIds` still says where the day's
        own figure is counted — a different question, and both answers apply.
        `DayRequirement.slots` overrides it per weekday.*
        *Shortfalls are added and **then** flattened, rather than flattened one
        at a time: a time condition still costs exactly one freeze however many
        of its parts broke, since it is one broken promise, while a count
        condition costs what it actually fell short by.*
        *Verified as the example that motivated it: "two hours, of which at
        least one in the morning" keeps at 1h+1h, misses at 0h+2h, and misses
        at 1h30 in the morning alone. The readback reads it as a rider —
        "Lessons at least 2h, of which at least 1h in Morning on Mon" — because
        the day's figure is the promise and the slot qualifies it.*

        ***Per-weekday slot sets are readable but not yet editable.*** The
        model carries them and every reader resolves them; the form edits the
        shared set only. Seven days times seven slots is a grid, and it is the
        rare case — putting it in now would cost the common case its
        legibility. Nothing needs re-migrating when it lands.
  - [x] **3d — the form in sections**, labels above fields, and the tab saying
        that the accounting period is the week.
        *Three headings — Judge period, Counters & conditions, Freezes & the
        verdict — over what was eleven fields in a flat list. Labels moved
        above their controls: in a sixteen-pixel column on the left they
        pointed at the first line of something three lines tall, and the eye
        had to pair them up again on every row.*
        *The tab now says the part everyone gets wrong: **you keep a streak by
        the day and pay for it by the week.** The allowance arrives every
        Monday and expires; a clean week banks one more; a week seals on the
        Tuesday after. None of that was visible in a tab that talked about
        days.*
- [x] **Stage 4 — The effectiveness meter goes.** Part 3.
      *The seven goal fields, their on/off switch, the explicit Edit, the
      weekly total and the lower-it-costs-a-freeze confirmation are all gone
      from Setup, and with them `goalCutEdit`, `goalReaders`, `afterGoalCut`
      and `weeklyGoalTotal`. **The lock hole is shut by removing the door**,
      not by narrowing it: those figures were edited in a tab `ruleEdit` never
      saw.*
      *`migrations/019` rewrites every condition that pointed at the goal into
      the seven figures it was pointing at, and nominates that rule as the
      project's benchmark if none is nominated.*
      ***The order of migration and deploy does not matter**, and that was
      worth arranging: `boundsOnWeekday` keeps one branch that resolves an
      unmigrated `useDailyGoal`. Drop it and such a condition falls through to
      a floor of zero, which every day clears — the rule would quietly stop
      judging and its red days would turn green. Carrying a dead branch until
      the migration has been everywhere is much cheaper than failing that way
      round. Verified on the live unmigrated project: same 22-day run, same
      three banked freezes, goal line intact.*
      ***No benchmark now means no goal at all** — no line on the cards, no
      dashed limit, no heatmap shading. Showing the last figures somebody typed
      into a tab that no longer exists would be worse than showing none: a
      target nobody can change and nobody promised.*
- [x] **Stage 5 — The ring: weights and a detail view.** Parts 4 and 5.
      *`StreakRule.weight`, 1 to 5, sets how long a rule's arc is and where it
      starts — heaviest first at twelve o'clock, so the same rule sits in the
      same place on every day of the month.*
      ***Drawing only, and the floor is what makes that safe.*** A missed arc
      never falls below 12% of the circle, and the rest is rescaled to make
      room so the shares still sum to one. Checked at the case that matters: a
      weight-1 rule missing among four weight-5 rules would have taken 4.8% of
      the ring and takes 11.2%. Without that, a ring 90% green on a broken day
      reads as "basically fine", which is the score it must never be.*
      *The control is offered only while the rule votes. A rule that should
      genuinely count for less is a rule that should not be voting, and
      `inDayVerdict` says that honestly.*
      *The ring opens into a popover listing every voting rule and how it came
      out. A popover rather than a dialog: the day dialog exists for editing,
      this is for reading, and everything in it was already in `readings`.*

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

## Stage 6 — the seven the audit found

The list this spec was written from had thirty items. Twenty-three were built
in stages 0–5; an audit against the list found seven that were not, and this
stage is those.

- [x] **`All study time` is removed from the picker after all** — Decision 1
      restored. It cannot be chosen, but a condition already on it still offers
      it, the way a deleted counter keeps its chip: hiding it outright would
      leave the dropdown showing its first option instead, a silent claim that
      the rule is about something it is not. A door you can walk out of and not
      back in, which is what "removed" has to mean for a field already in
      somebody's data.
- [x] **Checks judged by the day name the answers they take** — `clause.allow`,
      a set per weekday. A check is not a number, so a floor and a ceiling say
      nothing useful about one; what a day asks is which of the three it will
      accept. An unanswered check satisfies none of them, which is the reminder,
      and a weekday with nothing ticked is a weekday the rule does not judge.
      *Checked: yes on Mon–Fri, yes-or-skipped at the weekend — Monday yes
      keeps, Monday skip misses, Monday unanswered misses, Saturday skip
      keeps.*
- [x] **Checks judged by the week count each answer** — `clause.states`.
      `{ yes: { min: 6 }, no: { max: 0 } }` is *six good days, no bad ones, and
      the seventh may be skipped*: three requirements about three different
      answers, which no single total could hold. A state left out is
      unconstrained, which is what "skipped: any" means.
      *Checked: 6 yes + 1 skip keeps; 5 yes + 2 skip misses by one; 6 yes + 1
      no misses, because the `no` breaks it even though the yes count is
      satisfied.*
- [x] **The kind dropdown is labelled `Entity` again.** Stage 2 renamed the row
      to Counters and the word was lost with it.
- [x] **A condition is two headed blocks** — `Counters`, then
      `Days & Slots & Conditions`. Counters first, because the rest is
      meaningless until you have said what is being watched.
      **`Judge period` stays above both**, and has to: `scope` belongs to the
      rule, and a rule with several conditions has one of it.
- [x] **Shared time slots**, on by default, with a per-weekday set behind it.
      Turning it off seeds every judged day from the shared set, so nothing
      about the rule changes until a figure does. Absent for a weekly
      condition, which does not ask which day the hour fell on.

## Stage 7 — the form as an interface, and what is still open

The functionality is done; the form had become twenty fields in a list. This
stage is the drawing, and it is guided by `modern-web-guidance`, which is
installed in this repository — **search it before touching this form again.**

- [x] **A condition folds.** What it watches and what it asks stay open —
      together they *are* the condition. Slots, Days and Note fold behind
      native `<details>`, each with **its current value on the lid**: a closed
      fold that says nothing hides state, one that says `Mon, Wed, Fri` is a
      sentence you can check without opening it.
      *`<details>` rather than `useState`, on the guidance's advice: Baseline
      widely available, correct for keyboard and screen readers with no ARIA
      of ours, and find-in-page reveals a closed fold containing the match.*
      *`@container` rather than a viewport breakpoint — the form sits in a
      modal that is 512px on a desktop and full width on a phone.*

### Still open

- [ ] **Fold the rule-level sections too.** `Starts` and `Freezes & the
      verdict` are refinements by the same argument and should fold with their
      values on the lid — `today`, `1 a week, bank 15 · counts`. `The rule`
      (judge period) is one control and wants no section around it at all;
      `Conditions` is the body of the form and needs no heading. Started and
      backed out mid-edit rather than leave the file half-refactored; the
      per-condition half is committed and works.
- [ ] **Deferred edits.** A *new* rule can start today, tomorrow or the coming
      Monday. An **edit** cannot yet be scheduled, and that is not a field —
      it needs the rule to carry two versions, the old terms judging days
      before the changeover and the new ones after. Touches `ruleEdit`, the
      lock, `readClauseDay` and the verdict. Design it before building it.
- [ ] **Weekly-rule slots** ignore the shared/per-day switch, correctly, but
      the fold's summary does not say so.

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

---

# Part 6 — The benchmark *(landed)*

One rule is nominated, and the figure it asks for is the figure every day is
held up against: the `goal 3h` line on the cards, the dashed line in the daily
chart, the heatmap's shading. `lib/benchmark.ts`, `settings.benchmarkRuleId`.

**Why the word.** Not "pinned" and not "key" — those say how it got there and
how much it matters, and neither is the job. A benchmark is the thing you
measure against, which is exactly what that number does and all it does.

**It is display-only, and therefore outside the lock.** Nominating a rule moves
where a printed figure is read from; it changes no verdict, no streak and no
balance, so there is nothing here that can be made easier and nothing to
explain in writing.

**Eligibility is a consequence, not a policy.** `goalForDate` returns minutes
and every reader of it is minutes all the way down, so the rule has to measure
time; a ceiling is not something to aim at, so the conditions have to be
floors; and no two conditions may land on the same weekday, because two figures
on one Tuesday is not a goal. A weekly rule has no per-day figure at all.

**Several conditions are allowed, and that was the correction that made it
usable.** One condition was the first cut and it barred every real goal: "three
hours, but ninety minutes on Thursday" is two conditions. What matters is one
figure per weekday, not one condition per rule.

**`useDailyGoal` does not disqualify a rule**, though it looks circular. Such a
condition's limit *is* `settings.dailyGoals`, so the figure comes back out the
same as it went in — an identity, not a cycle. Barring it would have made the
feature dead on arrival for every migrated project, since the rule `014` built
is exactly that shape. When Part 3 deletes the field, this stops being a
special case and nothing else changes.

**Derived at the edge.** `withBenchmarkGoals` projects the figures into
`settings.dailyGoals` in `App`, layered on the count filter, so the ten files
calling `goalForDate` go on asking the same question and get an answer with a
promise behind it. Read-only, like the count filter: every edit closes over the
stored project, so a derived figure can never be written over a typed one.

## Open questions

- ~~**Does the daily goal survive as a display target?**~~ **Answered, and
  built** — see Part 6. It survives as a *display*, and its figures come from a
  nominated rule rather than from seven numbers nobody promised anything
  about.
- **What is a rule's priority attached to?** A number on the rule is the
  obvious answer; the ordering half works without one.
- **Do weights apply to `VerdictBar` too?** A month cell's segments have the
  same argument for and a worse case against, since at that size a priority-1
  arc would be sub-pixel.
