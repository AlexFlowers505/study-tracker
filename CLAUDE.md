# study-tracker

Personal study-time logbook: log minutes per day across time slots and categories,
track lesson/exam progress against a goal, and view week/month/heatmap analytics.

Scope note: this file applies to this repository only. Keep machine-wide or
unrelated-project instructions out of it — and out of `~/.claude/CLAUDE.md`, which
would leak into every other project on the machine.

## Commands

```
npm run dev       # Vite dev server (port 5173)
npm run build     # production build to dist/
npm run lint      # ESLint — run before finishing a change
npm run typecheck # tsc --noEmit — clean, and must stay clean
npm run preview   # serve the built dist/
```

There are no tests. Lint and typecheck are the only automated checks, and
**both are clean — expect zero from each and leave them at zero.** They were
not always: the old `App.jsx` and its dead `App-old.jsx` snapshot carried ~30
standing errors between them, and that noise is exactly how a real bug (a
binding mutated mid-render in the heatmap) sat unnoticed for months.

## Stack

React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, no config file),
Recharts for charts, `lucide-react` for icons, `react-day-picker` v10 for date
fields (pulls in `date-fns`), `@supabase/supabase-js` for auth and persistence.

**`src/` is TypeScript throughout, all of it strict.** The migration out of one
8400-line `App.jsx` is finished: there is no `allowJs`, nothing left to convert,
and the only JavaScript in the repo is `eslint.config.js` and `vite.config.js`,
which are Node config and get their own lint block.

## Layout

- `src/main.tsx` — trivial entry point, mounts `<App />`.
- `src/types/model.ts` — the in-memory data model. Everything else imports its
  shapes from here.
- `src/lib/` — pure functions, no JSX, all TypeScript and all strict:
  - `date.ts` — local-time date keys and arithmetic, `datesInRange`,
    `weekDates`, `monthDates`, weekday order and labels.
  - `time.ts` — `"HH:MM"` arithmetic, hour formatting, and the 18:00-rotated
    clock the sleep view runs on.
  - `theme.ts` — colours, the `CARD`/`FIELD_*` class strings, `cellSurface`
    and `dayStateSurface`.
  - `stats.ts` — `dayBreakdown`, `rangeStats`, `periodBreakdown`,
    `elapsedDayCount`, `goalForDate`, `makeIsIgnored`. **Every number the app
    reports comes from here, and none of it ever reads `day.sleep`.**
  - `period.ts` — `PERIODS`, `periodRange`, `stepCursor`, `rangeLabel`.
  - `analytics.ts` — `computeOverviewStats` and `computeOverallAllTime`. One
    function serves both scopes: "Overall stats" hands it every logged day,
    "Stats" hands it the period, and the returned `OverviewTotals` is the same
    shape either way, so the two can't disagree about what a number means.
  - `freezes.ts` — `dayState` / `periodState` (what colour a day, week or
    month is) and `freezeLedger`. **Earning is a ledger of events, not a
    recomputation**: each finished week gets one verdict, written once, so
    re-breaking and re-fixing a past week can never mint a second freeze.
    `spec 007` is the full design.
  - `sleep.ts` — `collectNights` and `sleepStats`, the whole sleep panel's
    arithmetic on the rotated clock. Its own file because sleep is a separate
    axis: none of it may ever reach `stats.ts`.
  - `defaults.ts`, `id.ts`, `changelog.ts`, `streaks.ts`.
- `src/data/` — the only place that knows the server shape is four tables and
  not one document:
  - `supabase.ts` — the URL, the anon key, `CLOUD_ENABLED`, `PAGE_SIZE`.
  - `schema.ts` — row types plus `DAY_COLUMNS` / `DAY_SELECT` / `DayUpsert`.
  - `load.ts` — `loadFromTables`, which reassembles the in-memory document.
  - `ops.ts` — the `WriteOp` union, its constructors, and `applyWriteOp`.
  - `auth.ts` — `useCloudAuth`, which lazily imports the Supabase package.
- `src/ui/` — presentational primitives. **Everything that floats lives here
  and nowhere else**: `Tip.tsx`, `PopoverMenu.tsx`, `DateField.tsx`
  (`DateField`, `DateRangeField`) and `TimeRangeField.tsx` all portal to
  `document.body`. Nothing outside `src/ui/` imports `createPortal`, and it
  should stay that way — a hand-rolled bubble inside the tree gets clipped by
  the modal shell, its scroll area or the month grid.
  - `datePopover.ts` — `useDatePopover` plus the react-day-picker styling,
    which has to sit on the calendar's own root to win.
  - `icons.tsx` — `RenderIcon`; the list itself is data in `iconLibrary.ts`,
    and `buttonStyles.ts` holds `segBtn` / `segBtnStyle`.
  - `controls.tsx` (`AutoTextarea`, `SegmentedControl`), `toggles.tsx`
    (`SwitchToggle`, `MenuToggle`), `EditableList.tsx`, `StatTile.tsx`,
    `ChartCard.tsx`, `ToggleChips.tsx`, `Brand.tsx`, and the hooks
    `useSeriesToggle.ts` / `useRevealOnScrollUp.ts`.
  - **A module here exports components or plain values, never both** —
    mixing them fails `react-refresh/only-export-components`. That is why the
    hooks, the icon list and the button styles each have their own file.
- `src/views/` — the page's own sections.
  - `PanelSection.tsx` — the shell every panel the period bar opens is built
    from: a wash of one tint, a round icon badge, a title, an optional
    subtitle, an `action` slot and a close X. **Use it rather than hand-rolling
    a sixth copy** — the panels read as siblings because they are one
    component wearing different tints.
    All five panels are built from it: `CountFilter.tsx`,
    `OverallStatsSection.tsx`, `SleepSection.tsx`, `StreaksSection.tsx`,
    `ChangeLogSection.tsx`.
  - `PeriodTotals.tsx` — the two donuts, `MonthGrid.tsx` — the week blocks and
    compact day cells, and `Heatmap.tsx` — how the long periods are drawn.
  - `EntriesReadout.tsx` — the entry list inside a day card. Two tiers of
    sticky header, and the numbers have to agree: the slot header is `h-6`
    (24px) at `top-0`, the entry header sits at `top-6`. Change one and
    comments scroll through the gap. Its opaque background is the card's own
    surface, passed in — a transparent sticky row shows the text underneath.
  - `StatsSection.tsx` — the plain heading-plus-subtitle a stats block sits
    under, shared by `OverviewStats.tsx`, `AveragesStats.tsx` and
    `RemarkableStats.tsx` so the three read as one column.
    `OverviewStats` takes the donuts as `children`: where the period's time
    went is one of the period's numbers, not a heading of its own.
  - Overall stats and streaks share `PROJECT_TINT`: both are project-wide
    while everything else on the page is period-scoped, so they read as a
    pair on purpose.
  - `LogView.tsx`, `AnalyticsView.tsx` — the two halves of the page, both
    driven by the one range `periodRange()` hands them.
  - `DayCards.tsx` (the week row and the day view's wide card),
    `DayEditor.tsx` (the day dialog: preview that flips into the editor),
    `QuickAddEntryModal.tsx`, `SetupModal.tsx`, `TopBar.tsx`,
    `AuthScreen.tsx`, `PeriodBar.tsx`, `NoteCard.tsx`.
- `src/App.tsx` — the shell and nothing else: auth, the load, the save queue,
  the count-filter projection, and which panels are open. ~700 lines, down
  from 8400.
- `src/App.css` — Tailwind import plus one global rule: thin scrollbars
  (`scrollbar-width` for Firefox, `::-webkit-scrollbar` for WebKit). Everything
  else is Tailwind utilities inline; don't grow this file without reason.
- `documentation.md` — longer prose reference for the same app. Useful
  background; this file stays the short operational version.
- `AGENTS.md` — instructions for Codex, which implements specs written here.
  It points at this file rather than restating it, so repo facts have one
  home; keep the pointer honest and don't let the two drift.
- `README.md` is the untouched Vite template. Don't treat it as documentation.

## Page structure

One page, not tabs. A single period drives everything:

- `PERIODS` — day, week, month, quarter ("3 Months"), year, all, custom.
  `quarter` is a calendar quarter, not a rolling 90 days: `periodRange()` snaps
  it to the 1st of the quarter's first month and the last day of its third.
- `periodRange()` is the only source of truth for "which days are we showing".
  It feeds both halves of the page, so they can never disagree about the range.
- `PeriodBar` (sticky, hides on scroll down) holds the period pills, the
  cursor navigation and the period label.
- Below it: `LogView` (notes, donut breakdowns, day cards / month grid /
  heatmap) and then `AnalyticsView` (stat tiles and charts) for the same range.
- Three panels open from `PeriodBar` and render between it and `LogView`, the
  filter first because it governs everything below it:
  - `CountFilter` — which slots/categories count. Not period-scoped; switching
    periods leaves it alone, so its toggle carries a dot while anything is
    struck out, or a live filter would silently shrink every figure.
  - `OverallStatsSection` — project-wide totals and forecast. Inline block on
    desktop, bottom sheet on phones (its `variant`).
  - `SleepSection` — only when `settings.sleepEnabled`; its toggle is absent,
    not disabled, when the feature is off. Unlike the other two it *is*
    period-scoped, and it reads `project.days` rather than `visibleProject`,
    since sleep has neither slots nor categories for the filter to act on.
    Its clock runs 18:00 → 17:00: a night spans midnight, so on a 0–23 axis
    every night is split across both ends of the chart. The same rotation is
    what makes its averages correct — the plain mean of 23:30 and 00:30 is
    midday, not midnight.

## Data model

In memory, all state is one object — every view below `StudyTrackerApp`
receives this and nothing else:

```js
{ activeProjectId, projects: [ { id, settings, slots, categories,
                                days, weekNotes, monthNotes,
                                weekIgnore, monthIgnore } ] }
```

`days` is keyed by `'YYYY-MM-DD'` (via `toKey`), week keys are the Monday of the
week, month keys are `'YYYY-MM'`.

A day holds two independent lists. `cells` is study time, keyed by slot, and
every figure in the app comes from it via `dayBreakdown`. `sleep` is a flat
list with no slot and no category, present only when sleep tracking is on
(`settings.sleepEnabled`), and **nothing in `dayBreakdown`, `rangeStats` or the
goals may ever see it** — sleep is a separate axis, not study time.

Study entries and sleep entries share a shape: optional `start`/`end` as
`"HH:MM"` strings, with `minutes` staying the stored authoritative number.
`spanMinutes` derives it when both times are set (an end before the start means
the session crossed midnight), and a sleep entry belongs to the date it
*started*, so most nights end on the following day — hence `endsNextDay` and
the `+1d` marks.

## Persistence

**On the server the shape is different.** Four tables, not one document:
`projects` (settings/slots/categories as jsonb — small and always read as a
unit), `days` keyed `(project_id, date)`, `period_notes` keyed
`(project_id, kind, key)` where the note and its ignore flag share a row, and
`user_prefs` for `active_project_id`. RLS on all four; days and notes inherit
ownership from their project. See `migrations/001_normalize_schema.sql`, then
`002_sleep.sql` (the `sleep` column on `days`), `003_change_log.sql` (the
`change_log` table), `004_sleep_night_end.sql` (a one-shot data move, guarded
by `applied_migrations`) and `005_freezes.sql` (`days.frozen` and the
`week_verdicts` ledger).

`change_log` is the one exception to everything below. It records what an edit
changed — old value and new — capped at `CHANGE_LOG_LIMIT`, oldest dropped. It
is a convenience, not data anybody typed, so both its read and its write are
**deliberately best-effort**: the read ignores `{ error }` so a missing table
leaves an empty log instead of the dead-end screen, and the write swallows
failures so it can never raise the save banner or re-queue forever. That is the
only place in this file where skipping the error check is right, and there is a
comment saying so.

Adding a field to a day used to mean three edits — the column, the `select`
list, and the `upsert` — where missing one saved nothing or read back empty,
silently. The type system now does two of them for you: add the field to `Day`
and `DAY_COLUMNS` in `src/data/schema.ts` stops compiling until you name its
column, `DAY_SELECT` picks it up automatically, and the `DayUpsert` type makes
`applyWriteOp` fail to compile until the value is written. What is left to you
is the SQL column itself — miss that and the read fails outright, which puts
the whole app on the dead-end screen, because a missing column is not a
missing value.

`loadFromTables()` reads all four and assembles the in-memory shape above, so
the split stops at the edge of the app. It pages at `PAGE_SIZE` because
PostgREST caps a response at 1000 rows.

Writes are **per row, never the whole document**. `persist(next, ops)` takes
the new state plus one or more ops — `opProject`, `opDay`, `opNote`,
`opPrefs`, `opDeleteProject` — and each op names *which row* changed, not its
contents. `applyWriteOp` reads the contents from the latest state at flush
time, so repeated edits to one day collapse into a single write. Add a field
that needs saving and you must also emit the right op; state alone won't
persist.

`persist()` updates React state immediately and debounces the write by
`SAVE_DEBOUNCE_MS` (1s). Pending ops flush on `visibilitychange`, `pagehide`
and unmount, and are re-queued on failure (they're idempotent upserts, so a
replay is harmless).

Three failure rules, each of which exists because it once went wrong:

- **supabase-js returns errors in the payload, it does not throw.** Every call
  must check `{ error }`. Not doing so silently dropped a day and a half of
  edits while the app looked healthy.
- **A failed read is not an empty account.** On a load error the app sets
  `loadFailed`, refuses to write anything, and shows a dead-end screen. The
  old behaviour — open the setup modal over `DEFAULT_DATA` — let its auto-save
  overwrite the real data.
- **A failed write must be visible.** `saveFailed` raises a banner and a retry
  runs every `SAVE_RETRY_MS`. Never log a save failure and carry on.

`study_data` is the old single-blob table. It is no longer read or written,
and is kept only as a frozen pre-migration snapshot. Setup has an
**Export JSON** button; suggest it before anything destructive.

Known quirk: the local (signed-out) fallback calls `window.storage.get/set`, an
API that does not exist in a browser (left over from the app's origin as a
Claude artifact). Offline mode is therefore non-functional — add a
`localStorage` shim if it's needed.

## Conventions

Match the existing file:

- No semicolons, double-quoted strings, Prettier-style wrapping.
- Function components declared with `function`, small helpers as arrow consts.
- Reuse the color constants (`PALETTE`, `ACCENT`, `EXAM_COLOR`,
  `GOAL_MET_COLOR`, `INK`) and the `CARD` / `FIELD_*` class strings instead of
  new hex literals. Tailwind cannot see class names built from template
  literals — dynamic colors go in `style`, not `className`.
- Use the date helpers (`toKey`, `fromKey`, `addDays`, `startOfWeek`,
  `daysBetween`) — they work in local time deliberately, to avoid UTC drift.
  Weeks start Monday (`WEEKDAY_ORDER`).
- Icons: slot/category icons are user-configurable and go through
  `ICON_LIBRARY` / `RenderIcon`. Fixed UI chrome imports from `lucide-react`
  directly (see the import block at the top).
- **Anything that floats — tooltips, date pickers, menus — renders into a
  portal on `document.body` with fixed coordinates measured from its trigger.**
  Absolutely positioned overlays get clipped by the modal shell, its scroll
  area and the month grid. `Tip`, `DateField`, `DateRangeField` and
  `PopoverMenu` all do this; follow suit rather than adding a fourth
  hand-rolled bubble.
- Design leans on fills, not outlines: white cards on the page tint, tinted
  headers, filled inputs. Keep a border only where it carries meaning (small
  selects and number inputs — `FIELD_BOXED`).
- A translucent wash needs its own opaque base — use `cellSurface()`. Setting
  a semi-transparent `backgroundColor` alone lets whatever is behind bleed
  through, which made the month grid render different colours on desktop and
  mobile.
- "Ignore in statistics" (day, week or month) means *excluded everywhere*.
  One predicate, `makeIsIgnored(weekIgnore, monthIgnore)`, is threaded through
  `rangeStats`, `periodBreakdown`, `elapsedDayCount` and the analytics. Don't
  add a stat that counts ignored days.

## Secrets

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are inline constants (search for
`SUPABASE_URL`). The anon key is publishable by design; the actual protection is
row-level security on `study_data`. Don't add any other credentials to the
source — a service-role key in this file would be a real leak.
