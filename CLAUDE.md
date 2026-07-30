# study-tracker

Personal study-time logbook: log minutes per day across time slots and categories,
track lesson/exam progress against a goal, and view week/month/heatmap analytics.

Scope note: this file applies to this repository only. Keep machine-wide or
unrelated-project instructions out of it — and out of `~/.claude/CLAUDE.md`, which
would leak into every other project on the machine.

## Commands

```
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run lint      # ESLint — run before finishing a change
npm run preview   # serve the built dist/
```

There are no tests. `npm run lint` is the only automated check.

## Stack

React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, no config file),
Recharts for charts, `lucide-react` for icons, `@supabase/supabase-js` for auth
and persistence. Plain JS with JSX — no TypeScript.

## Layout

- `src/main.jsx` — trivial entry point, mounts `<App />`.
- `src/App.jsx` — the entire application, ~4600 lines, one file by design.
  Constants and helpers at the top, then `StudyTrackerApp` (line ~823), then the
  view components below it.
- `src/App-old.jsx` — snapshot of an earlier version. Not imported anywhere.
  Never edit it; useful only for comparison.
- `src/App.css` — effectively empty. All styling is Tailwind utilities inline.
- `documentation.md` — longer prose reference for the same app. Useful
  background; this file stays the short operational version.
- `README.md` is the untouched Vite template. Don't treat it as documentation.

## Data model

All state is one JSON blob:

```js
{ activeProjectId, projects: [ { id, settings, slots, categories,
                                days, weekNotes, monthNotes,
                                weekIgnore, monthIgnore } ] }
```

`days` is keyed by `'YYYY-MM-DD'` (via `toKey`), week keys are the Monday of the
week, month keys are `'YYYY-MM'`. `makeProject`, `normalizeProject` and
`normalizeData` (lines ~215–265) document the exact shapes and handle migrating
older saved data — extend those when adding a field, so existing users' blobs
keep loading.

## Persistence

Signed in: Supabase table `study_data` (`user_id`, `data` jsonb, `updated_at`),
upserted in full on every change. Not signed in: local fallback keyed by
`STORAGE_KEY`.

Every mutation goes through `persist()` — usually via `updateProject`,
`updateSettings`, `updateDay` and friends. Never call `setData` directly for
user data; it writes state without saving.

Known quirk: the local fallback calls `window.storage.get/set`, an API that does
not exist in a browser (left over from the app's origin as a Claude artifact).
The call throws, gets swallowed, and the setup modal appears. Offline mode is
therefore non-functional — add a `localStorage` shim if it's needed.

## Conventions

Match the existing file:

- No semicolons, double-quoted strings, Prettier-style wrapping.
- Function components declared with `function`, small helpers as arrow consts.
- Reuse the color constants (`PALETTE`, `ACCENT`, `EXAM_COLOR`,
  `GOAL_MET_COLOR`) and the `CARD` class string instead of new hex literals.
- Use the date helpers (`toKey`, `fromKey`, `addDays`, `startOfWeek`,
  `daysBetween`) — they work in local time deliberately, to avoid UTC drift.
  Weeks start Monday (`WEEKDAY_ORDER`).
- Icons come from `ICON_LIBRARY` / `RenderIcon`, not direct lucide imports.

## Secrets

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are inline constants near line 579. The
anon key is publishable by design; the actual protection is row-level security on
`study_data`. Don't add any other credentials to the source — a service-role key
in this file would be a real leak.
