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
npm run preview   # serve the built dist/
```

There are no tests. `npm run lint` is the only automated check, and it is **not
clean**: it reports ~35 pre-existing errors — 18 in `src/App.jsx` and 17 in the
dead `src/App-old.jsx` (unused imports, a few `react-hooks` complaints).
Compare against that baseline rather than expecting zero, and don't add to it.
When you only care about your own change, lint the one file:
`npx eslint src/App.jsx`.

## Stack

React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, no config file),
Recharts for charts, `lucide-react` for icons, `react-day-picker` v10 for date
fields (pulls in `date-fns`), `@supabase/supabase-js` for auth and persistence.
Plain JS with JSX — no TypeScript.

## Layout

- `src/main.jsx` — trivial entry point, mounts `<App />`.
- `src/App.jsx` — the entire application, ~5900 lines, one file by design.
  Order: constants and helpers, shared UI primitives (`Tip`, `DateField`,
  `PopoverMenu`, `StatTile`), Supabase auth, `StudyTrackerApp` (line ~1355),
  then the view components. Line numbers drift constantly — search by symbol.
- `src/App-old.jsx` — snapshot of an earlier version. Not imported anywhere.
  Never edit it; useful only for comparison.
- `src/App.css` — Tailwind import plus one global rule: thin scrollbars
  (`scrollbar-width` for Firefox, `::-webkit-scrollbar` for WebKit). Everything
  else is Tailwind utilities inline; don't grow this file without reason.
- `documentation.md` — longer prose reference for the same app. Useful
  background; this file stays the short operational version.
- `README.md` is the untouched Vite template. Don't treat it as documentation.

## Page structure

One page, not tabs. A single period drives everything:

- `PERIODS` — day, week, month, 90days ("3 Months"), year, all, custom.
- `periodRange()` is the only source of truth for "which days are we showing".
  It feeds both halves of the page, so they can never disagree about the range.
- `PeriodBar` (sticky, hides on scroll down) holds the period pills, the
  cursor navigation and the period label.
- Below it: `LogView` (notes, donut breakdowns, day cards / month grid /
  heatmap) and then `AnalyticsView` (stat tiles and charts) for the same range.
- "Overall stats" is project-wide, not period-scoped. It lives outside the main
  flow entirely — a toggle in `PeriodBar` opens it as a sticky sidebar on
  desktop and a bottom sheet on phones (`OverallStatsSection`'s `variant`).

## Data model

All state is one JSON blob:

```js
{ activeProjectId, projects: [ { id, settings, slots, categories,
                                days, weekNotes, monthNotes,
                                weekIgnore, monthIgnore } ] }
```

`days` is keyed by `'YYYY-MM-DD'` (via `toKey`), week keys are the Monday of the
week, month keys are `'YYYY-MM'`. `makeProject`, `normalizeProject` and
`normalizeData` document the exact shapes and handle migrating older saved data
— extend those when adding a field, so existing users' blobs keep loading.

## Persistence

Signed in: Supabase table `study_data` (`user_id`, `data` jsonb, `updated_at`),
upserted in full. Not signed in: local fallback keyed by `STORAGE_KEY`.

Every mutation goes through `persist()` — usually via `updateProject`,
`updateSettings`, `updateDay` and friends. Never call `setData` directly for
user data; it writes state without saving.

`persist()` updates React state immediately but **debounces the write** by
`SAVE_DEBOUNCE_MS` (1s), coalescing bursts — a whole blob per keystroke was the
alternative. A pending write is flushed on `visibilitychange`, `pagehide` and
on unmount, and re-queued if it fails. If you add a code path that must be
durable right away, flush rather than assuming the save already happened.

Known quirk: the local fallback calls `window.storage.get/set`, an API that does
not exist in a browser (left over from the app's origin as a Claude artifact).
The call throws, gets swallowed, and the setup modal appears. Offline mode is
therefore non-functional — add a `localStorage` shim if it's needed.

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
