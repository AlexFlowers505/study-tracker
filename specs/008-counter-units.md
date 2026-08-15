# 008 — Counter units

Replaces the two hard-coded tallies (`lessons`, `exam`) with a user-defined
list, the same shape as slots and categories. Draft — the open questions at the
bottom decide two of the details before this is buildable.

## The one idea everything rests on

`lessons` and `exam` were never two features. They were one feature — *count
something per day, against an optional target* — implemented twice, once as a
number and once as a boolean. A boolean is a counter that stops at one.

So a unit is a counter, `exam` migrates to a unit whose values happen to be 0
or 1, and nothing in the model needs to know which is which.

## The entity

Stored on the project beside `slots` and `categories`, sortable the same way,
edited through the same `EditableList`.

```ts
interface CounterUnit {
  id: string
  label: string
  iconName: string
  color: string
  /** Absent when the unit has no finish line — a habit rather than a syllabus. */
  total?: number
  relation: "positive" | "neutral" | "negative"
}
```

`relation` is stored and configurable from day one but **drives nothing yet**:
everything that could have read it is being deleted in this pass (see below).
It exists so the data is already right when the statistics come back.

## Where the values live

A new day field, one number per unit:

```ts
interface Day {
  counters?: Record<string, number>   // unitId -> value
  // lessons?: number   ← removed from the model after the migration
  // exam?: boolean     ← removed from the model after the migration
}
```

`schema.ts` makes this cheap: add `counters` to `Day`, and `DAY_COLUMNS` stops
compiling until its column is named, `DAY_SELECT` picks it up, and `DayUpsert`
fails until `applyWriteOp` writes it. The SQL column is the one part the types
cannot do — miss it and the read fails outright.

## Migration (`009_counter_units.sql`)

Not idempotent by nature, so guarded through `applied_migrations` the way
`004` is.

1. `alter table days add column if not exists counters jsonb not null default '{}'`.
2. `alter table projects add column if not exists counter_units jsonb not null default '[]'`.
3. For every project, synthesise the two units the user would have created by
   hand, carrying the totals across from `settings`:
   - `Lessons` — `total` from `settings.totalLessons`, relation `positive`,
     icon `GraduationCap`.
   - `Exams` — `total` from `settings.totalExams`, relation `positive`,
     icon `Award`.
   Only when the corresponding feature was on, so a project that never used
   exams does not inherit an empty unit.
4. Backfill `days.counters` from `days.lessons` and `days.exam` — the exam flag
   becomes `1`, and a zero or false writes no key at all rather than a zero, so
   an untouched day stays an empty object.
5. **Leave `days.lessons` and `days.exam` in place.** Same treatment
   `study_data` got: no longer read or written, kept as a frozen pre-migration
   snapshot until the new shape has been trusted for a while.

Apply to **both** Supabase projects, dev and prod.

## What gets deleted in this pass

The user's call: keep the recorded numbers, drop everything computed from
them, decide later what the statistics should be. That is a bigger cut than it
sounds, so it is written out here in full.

- `OverallStatsSection` **in its entirety**, and its toggle in the period bar.
  Every tile in it is lessons or exams — done/total, remaining, estimated time
  remaining, estimated finish date. With those gone the panel has nothing left
  to draw.
- `computeOverallAllTime` and the lessons/exams half of `computeOverviewStats`,
  which is most of `OverviewTotals`.
- `OverviewStats`: the "Lessons completed" and "Exams passed" tiles.
- `AveragesStats`: avg hours/lesson, avg lessons/day, /week, /month, avg
  days/exam — five of its seven tiles.
- `AnalyticsView`: the "Days per exam" chart, and the `LESSONS` series toggle
  on all four remaining charts.
- The `{n}L` badge and the `Exam` pill on day cards, the month grid and the
  heatmap — replaced by per-unit badges drawn with the unit's own icon and
  colour, which is display rather than statistics.

What survives untouched: everything hours-based. Goals, streaks, freezes, the
donuts, the slot and category breakdowns, sleep. None of it ever read
`lessons` or `exam`.

## Settings that go away

`settings.lessonsEnabled`, `examsEnabled`, `totalLessons`, `totalExams`, and
their toggles and number fields in Setup's Project details tab. A unit
existing is what "enabled" means now; its `total` is where a target lives.

## Things that will break quietly if forgotten

- **`diffDay`** names `lessons` and `exam` explicitly. It has to walk the unit
  list instead, or every counter edit stops appearing in the change log —
  silently, because the log swallows its own failures by design.
- **`importData.ts`** reads whatever the export file holds. An export taken
  *before* this migration carries `lessons`/`exam` and no `counters`, so the
  importer needs the same mapping the SQL migration does. Without it,
  refreshing dev from an older backup drops every tally on the floor and looks
  like it worked.
- **`DEFAULT_SETTINGS` / `makeProject`** seed the two old fields; a new project
  should start with no units at all rather than two invented ones.
- **The freeze ledger and streaks are safe** — both are hours-and-goals only.
  Worth stating because "counters" sounds like it should touch them.

## Settled

1. **`total` keeps a readout.** A small "128 / 218" on the unit's row in Setup
   and on its badge in the day card. That is display of what was typed, not a
   statistic, so it survives the cut and the field means something from day
   one instead of being inert config.
2. **`OverallStatsSection` goes entirely**, along with its period-bar toggle
   and `computeOverallAllTime`. An empty panel reads worse than an absent one,
   and git has it when the replacement statistics are designed.

## Progress

- [x] 1 — `migrations/009_counter_units.sql`, applied to **dev**. Prod still
      pending; nothing reads the new columns there yet, so there is no rush.
- [x] 2 — model, schema, ops, load. `counters` and `counter_units` travel end
      to end; the old columns are still written alongside.
- [x] 3 — the lessons/exams statistics deleted.
- [x] the `importData` half of 6 — `normalizeProject` rebuilds units and day
      counters from an older export, matching what `009` did to the database.
      Done early because it lives in the same funnel as the model change.
- [x] 4 — the Counters tab in Setup, on a now-generic `EditableList`.
- [x] 5 — day editor fields, day-card badges, month-grid dots, tooltips.
- [x] 6 — `diffDay` walks the unit list.

## Follow-up: slots (`migrations/010_counter_slots.sql`)

`counters` reshapes from `{unitId: n}` to `{unitId: {slotId: n}}`. The day's
figure for a unit is the sum of its slots, so nothing stores the same number
twice. Unit first because almost every read is "how many of this unit today".

Counts that predate slots have none, so they sit under the reserved key
`unassigned` rather than being assigned one — inventing a slot would be making
data up. `010` needs no `applied_migrations` guard: it matches only values
still held as bare numbers, so a second run finds nothing.

Counters are shown **under their slot's heading and above its entries**, in
the day card's readout and in the day dialog alike — a count recorded against
the morning describes the morning, so it reads before the sessions. Clicking
one edits it in place, same three buttons as an entry row, cancel being an undo.

In the day dialog each slot carries its own hash button beside its plus. The
form it opens **disables** units already present in that slot rather than
hiding them, with the reason in the option's label: hiding would leave you
hunting for Lessons, while "already here" points at the row above.

A quick-add dialog sits left of the plus on a day card: pick a unit and a slot,
see what that pair already holds, type an amount, see the result. It **adds**
rather than replaces, which is the whole difference between it and the day
editor's grid.

**Done on dev up to `009`. `010` and the prod migrations still pending** — run `009` there before this
ships, or the read fails outright on the missing columns.

## Order of work

The tree has to build at every step, so the model change lands before anything
starts reading it and the deletions come before the new UI.

1. SQL `009` on dev, verify, then prod.
2. `types/model.ts`, `data/schema.ts`, `data/ops.ts`, `data/load.ts` — carry
   `counters` and `counter_units` end to end, still writing the old columns.
3. Delete the statistics listed above. The tree gets smaller and stays green.
4. `lib/counters.ts` plus the Setup tab, reusing `EditableList` with the two
   extra fields.
5. Day editor and the badges.
6. `diffDay` and `importData` last, once the shape is fixed.
