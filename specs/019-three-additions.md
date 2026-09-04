# 019 — Three additions

**Status: designed, not built.** Three unrelated things, batched because each is
small and none is a prerequisite for any other. Build them in any order, or one
at a time.

They share nothing but size. If a fourth turns up that belongs with one of
them, take that one out into its own file rather than growing this one.

---

## 1 — The week's hours answer to somebody

### What is wrong

`WeekSummaryStrip` in the month grid prints, beside `Week II`, the week's total
study time and the week's goal
([MonthGrid.tsx:410](../src/views/MonthGrid.tsx)):

```ts
const { total: wTotal, goal: wGoal } = rangeStats(...)
```

`goal` comes from the benchmark rule. `total` is **every minute logged, whatever
it went on.** The two are not measured through the same thing, so `12h of 15h`
is a comparison between a figure one rule promised and a figure nobody promised
anything about.

The user put the failure exactly:

> Могу же написать activity “Ничего не делал” и вбить 20 часов, и будет
> показано, что я 20 часов в неделю чем-то занимался, но это же будет не совсем
> корректно.

### What it becomes

**The numerator is measured through the benchmark rule's own target.** The rule
that supplies the denominator supplies the numerator, and `of` starts meaning
something.

*Did nothing* is then simply not counted, because the benchmark rule does not
name it — and nothing has to be excluded by hand, which is the part that
matters: an exclusion list is a thing you have to remember to maintain.

**With no benchmark nominated, the hours are absent.** Not zero, not a dash —
gone, the same way `benchmark.ts` already withholds the goal line from the cards
and the dashed limit from the chart:

> Showing the last figures somebody typed into a tab that no longer exists would
> be worse than showing none.

**The verdict dot stays either way.** It reads the composite, which is a
promise; it never depended on hours and does not now.

Dropping the hours entirely was the alternative. It over-corrects: the objection
was never *too many numbers*, it was *a number answerable to nobody*, and the
benchmark exists precisely to answer that.

---

## 2 — Sleep gets a streak, and its charts get shared out

### The invariant that is not being touched

`CLAUDE.md` is as firm about this as about anything:

> `sleep` is a flat list with no slot and no activity … **nothing in
> `dayBreakdown`, `rangeStats` or the goals may ever see it** — sleep is a
> separate axis, not study time.

Making sleep an ordinary activity was on the table and is refused. It buys
conceptual tidiness — a sleep streak would then be free, since it is just a time
target — and it costs every total in the app growing by about eight hours a day,
`goalForDate` counting sleep towards study goals, and ten separate readers each
needing their own answer to *do I want sleep here*. That is exactly the class of
silent wrongness this repo is built to refuse, and it would be paid for a
feature that costs one branch the other way.

### A sleep target

`StreakTargetKind` gains `"sleep"`, alongside `"time"` as the second target with
no id — there is only one of it:

```ts
export type StreakTargetKind =
  "unit" | "activity" | "category" | "tag" | "time" | "sleep"
```

- `targetMeasure` returns `"time"` for it. Minutes, like everything else that
  measures time.
- `targetInfo` names it `Sleep`.
- `minutesOn` gains one branch: read `day.sleep` rather than `day.cells`, summed
  over the nights that **started** on that day — the same ownership rule
  `collectNights` already uses, and the reason most nights carry a `+1d` mark.

That is the whole engine change. Rules, conditions, the lock, the ring, the
notices, the achievements and the freeze economy all work on it without knowing
it arrived, because every one of them is written against `StreakTarget` rather
than against a list of kinds.

**A sleep condition carries no slot bounds**, and the form must not offer them.
A sleep entry has no slot; there is nothing for a slot rider to measure. This is
a constraint of the data, not a policy, and it should read as one wherever it is
said.

`at least 7h of Sleep`, `at most 9h`, and `between 7h and 8h30` all follow from
the pair of bounds a condition already carries.

### The rotated clock, offered to any activity

The sleep panel's charts run on an 18:00 → 17:00 clock, and the reason is in
`time.ts`: a night spans midnight, so on a 0–23 axis every night is split across
both ends of the chart, and the plain mean of 23:30 and 00:30 is midday rather
than midnight.

**Nothing about that is specific to sleep.** Any activity logged across midnight
has the same problem, and any activity you want to see *when* rather than *how
much* wants the same drawing.

So the rotated-clock charts become a **display choice on a time chart**, offered
for any activity, with sleep merely being the one that has it on by default.
`HOUR_TICKS` and the one-hour stepping stay as they are — the grid line is the
ruler you read a start and an end against.

**This is a charts change with no model consequence.** Sleep stays its own axis;
it simply stops being the only thing allowed to be drawn well.

---

## 3 — Tags on activities

### Why they were left out, and why that stops holding

`CounterUnit` carries `tagIds`. `Activity` does not, and `CLAUDE.md` gives the
reason:

> an activity has neither and no tags either, because nothing counts it

That is true and it is beside the point. An activity **is** one of the three
kinds of counter — it is in the table of three, it records time where a tally
records a count — and a streak condition can already name a tag. So *40h of
anything tagged “deep work”* is a sentence the app can nearly say and cannot.

### The field

`tagIds?: string[]` on `Activity`. No migration: activities ride in the
`projects` jsonb, the same reason tags themselves shipped without one.

Setup's Counters tab already lays out all three kinds; the Activities sub-tab
gains the same `+ Tag` row a counter's row has, drawing **only the tags it
wears**, each with a cross — the shape that exists because the whole set on
every row meant a dozen chips of which two were true.

Deleting a tag already strips its id from every unit wearing it. It must now
strip it from every activity too, **in the same write**: `settings` and
`activities` are two arrays of one project, and `CLAUDE.md` records what happens
when they are written separately —

> three calls to `updateProject` in one tick all close over the same `project`
> and the last one wins

which is a bug the tag cleanup already shipped with once.

### The one real consequence: a tag can now span both measures

Today a tag reaches counters only, so it always measures counts.
`memberUnits` resolves it to units; `keepsActivity` has no `tag` branch and
falls through to `() => true`.

With activities tagged, a tag can hold things that record time **and** things
that record a count — which is exactly the situation `Category` already has, and
it was solved there:

> Stored explicitly rather than inferred from the members, so filing one more
> counter under a category cannot silently change what an existing rule
> measures.

**A tag target takes the same explicit `measure`.** `targetMeasure` reads it for
`"tag"` as it does for `"category"`, with the same fallback for a target written
before the field existed — *counts, if it reaches any counters*, which is what
every existing tag rule means.

`keepsActivity` gains a `tag` branch mirroring its `category` one: the set of
activities wearing that tag.

The count filter needs nothing. It already hides activities and counters
separately, and hiding by tag reaches whatever wears the tag.

**A tag still says what a thing is *like*, and a category still says where it
*belongs*.** Nothing here softens that; the tag simply stops being restricted to
two of the three kinds for a reason that was never about tags.

---

## Decisions

**1 — The benchmark supplies both halves of the week's fraction.** The objection
was not that there were too many hours; it was hours nobody had promised. One
rule for the numerator and another for the denominator is not a fraction.

**2 — Sleep stays its own axis and gains a target.** One branch in `minutesOn`
against ten readers each needing a new answer to *does sleep count here*. The
merge's only real prize is tidiness, and tidiness is not worth a silently wrong
weekly total.

**3 — A tag target stores its measure explicitly.** Inferring it from the
members means that filing one activity under a tag can change what a rule
written months ago is measuring — the failure `Category` was given an explicit
`measure` to prevent, arriving by the other door.
