# 024 — Sleep is an activity

**Status: built. `migrations/021` has NOT been run.** Apply it by hand to dev
first, then production — see part 6. The app works either way in the meantime;
that is what `sleepMove.ts` is for.

> сделать сон обычной activity. Она же работает так же как и обычная activity.

It did. A night was a list of timed entries with a start, an end and a
duration — which is an activity. What it had *instead* of a slot and an
activity was six pieces of machinery: a column of its own, a switch in Setup,
a panel, three charts, a tab in the add dialog, and a `StreakTargetKind`.

---

## 1 — Why the axis stopped earning its place

`spec 019` recorded the reason it existed, and it was a good one:

> the alternative was making it an ordinary activity, which buys the streak
> free and costs every total in the app about eight hours a day.

That argument died in `spec 022`. The figure a period reports is measured
through the **benchmark rule** now, so what counts is what you promised rather
than everything you happened to write down. Sleep is not in the promise, so it
does not appear in the figure — and if you ever do want to promise something
about it, you now can, in the same sentence as everything else.

**The same argument had to be finished at day scope to make this safe.** `spec
022` measured the period header and the Overview tile; the day cards still
totalled everything, which was survivable while sleep sat elsewhere and became
wrong the moment it did not: a card reading `goal 3h (+3h 25m)` on a day whose
only entry was a night's sleep is the drawing congratulating you for having
gone to bed. `benchmarkDayOf` is `benchmarkMeter` one day at a time, threaded
to the day card and the month cell.

**And `logged` parted company with `total`.** A day holding nothing but a night
has a benchmark figure of nought and is plainly not an empty day, so *is there
anything here* is now asked of the raw breakdown while *what does this count
for* is asked of the rule. Telling a day to "tap to add" over the top of its
own entry is the drawing calling the data missing.

---

## 2 — Where the nights went

A slot and an activity, both created by the migration with fixed ids
(`slot-sleep`, `activity-sleep`) because two things have to agree about them
without talking: the migration, and the fold below. They are **ordinary rows**
once created — rename them, recolour them, move entries out of them, delete
them when they are empty.

A new project gets neither. That is what "ordinary activity" means: if you want
to track sleep you add an activity called Sleep, exactly as you would add
anything else.

---

## 3 — The fold, and why the deploy order does not matter

`lib/sleepMove.ts` folds any night still sitting in `days.sleep` into the day's
cells **as it loads**, and invents the slot and the activity if the migration
has not made them yet. Nothing is invisible while the SQL is waiting to be run.

This is the `entryActivity()` pattern from `spec 013`, and it is here for the
same reason: a rename that requires the deploy and the migration to happen in a
particular order is a rename that will one day happen in the other one.

**It never writes.** The fold is in memory. The column is cleared by the
migration, or by `dayUpsertRow` writing an empty list for a day you edit — so a
day you touch migrates itself and one you do not waits for the SQL. Neither
path can duplicate an entry: the fold skips any id already in the sleep slot,
and has nothing to read once the column is empty. Six cases in `npm run sweep`
(`fold:`) pin exactly that, because this is the one piece of the change that
can lose data.

Once `021` has run everywhere the column is empty on every row, the fold is a
no-op on every load, and `sleepMove.ts` can go.

---

## 4 — What the migration also has to rewrite

**Any condition that named `kind: "sleep"`.** The rule keeps meaning exactly
what it meant — it counted the minutes in `days.sleep`, and those minutes are
the new activity's — so the target is rewritten to point at it. Left to fall
through to a default, a condition whose target stops resolving is a rule that
quietly judges nothing, which is the one failure this codebase is built to
refuse.

`settings.sleepEnabled` is dropped in the same pass. It is nobody's setting now.

---

## 5 — The charts, generalised

The three rotated-clock charts were never about sleep except in the list they
read from. *When does this usually start, when does it end, how long does it
run* are questions worth asking about a commute, a gym trip or an evening's
reading.

- `lib/sleep.ts` becomes `lib/rotatedClock.ts`. `collectNights` becomes
  `collectSessions` and takes a `PickEntries` selector; `sleepStats` becomes
  `clockStats`. **Not a line of the arithmetic changed** — the rotation, the
  hour coverage, the week rules, the averages that only come out right because
  the frame is rotated. One argument changed.
- `SleepSection` becomes `views/ClockCharts.tsx`, a **Trends tab** with an
  activity picker, drawn in the chosen activity's own colour.
- It opens on the first activity that has a timed session in the period.
  A tab that opens empty on most projects reads as a broken chart rather than
  as a question you have not asked. Only on the first render: after that the
  choice is yours and must not jump when you step the period.

`spec 019` deferred this and said why — generalising `collectNights` means
teaching the one file that must never reach `stats.ts` to read what `stats.ts`
is built on. It still must never reach `stats.ts`, and it still does not: this
is a drawing, and nothing in it feeds a breakdown, a range stat or a goal.

---

## 6 — Applying it

`migrations/021_sleep_as_activity.sql`, by hand, **to both projects** — dev
first, then production, or dev stops being a rehearsal. It is idempotent: every
step is guarded on the thing it creates or empties, which it has to be, because
the app may have migrated some days already.

Nothing is deleted. `days.sleep` is emptied, not dropped.

---

## 7 — What is gone

`settings.sleepEnabled` · `SleepSection` and its panel toggle · the moon in the
period bar · the **Sleep** tab in the add dialog and the `variant` prop that
opened it · `StreakTargetKind.sleep` and its `PickKind` · the sleep branch in
`minutesOn` · the separate sleep group in `EntriesReadout` · `onChangeSleep` /
`onDeleteSleep` · `restoreSleepEntry` / `updateSleepEntry` / `removeSleepEntry`
· the sleep half of `diffEntry`'s day diff · the moon on a month cell · about
twenty Russian strings.

`Day.sleep` stays in the type and the column stays in the table, deprecated and
read only by the fold — an upgrade throws nothing away, the same treatment
`lessons` and `exam` got.

---

## 8 — The consequence to be clear about

**Sleep is time now, so it is in the donuts and in the Trends charts**, which
is what "where did the time went" honestly means — a night is most of a day.
The count filter reaches it like anything else, and the figures that are
supposed to mean *how did this period go* go through the benchmark rule and do
not see it.
