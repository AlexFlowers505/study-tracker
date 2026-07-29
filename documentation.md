# Study Tracker — Project Documentation

A single-page React app for logging daily study time against custom "slots" (time-of-day blocks) and "categories" (types of work), tracking lesson/exam progress, and visualizing pace and effectiveness over time. Ships as one component file (`App.jsx`) styled with Tailwind CSS, with optional multi-user cloud sync via Supabase.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| UI framework | React (function components + hooks only, no class components) |
| Styling | Tailwind CSS (utility classes, arbitrary color values like `bg-[#1E2A33]/10`) |
| Icons | `lucide-react` |
| Charts | `recharts` (Area/Bar/Line/Pie via `ResponsiveContainer`) |
| Auth + database (optional) | `@supabase/supabase-js` |
| Local persistence (default) | `window.storage` (falls back automatically if cloud sync isn't configured) |
| Build tooling | Vite + `@vitejs/plugin-react` + `@tailwindcss/vite` |

The whole app lives in one file, `App.jsx`, organized top-to-bottom as: icon/color constants → data model & helpers → shared UI primitives → optional Supabase auth → root `StudyTrackerApp` component → Log tab components → Analytics tab components.

---

## 2. Core concepts

- **Project** — a self-contained course/subject with its own slots, categories, calendar of logged days, and settings. The app supports multiple projects; you switch between them from Setup → Projects.
- **Slot** — a configurable time-of-day bucket (e.g. "Morning", "Evening Commute"). Each has a label, icon, and color.
- **Category** — a configurable type of work (e.g. "Notes", "Practice problems"). Also has a label, icon, and color.
- **Entry** — a single logged block of time: a slot + category + minutes + optional comment. A day can have any number of entries spread across slots.
- **Day** — keyed by `YYYY-MM-DD`, holds all entries (grouped by slot), a lesson count, an exam-passed flag, an optional day-level comment, and an "ignore in statistics" flag.

---

## 3. Feature overview

### Log tab
- Five zoom levels: **Day, Week, Month, 90 Days, Year** (a segmented control at the top; the same control style is reused for every other mode toggle in the app).
- **Month view** — calendar grid; each cell shows per-slot minute totals, a lesson badge, an exam badge, and total hours vs. that weekday's goal. A weekly summary cell sits to the left of each row. Clicking a day navigates to Day view; a small pencil icon opens the edit modal directly.
- **Week / Day view** — full detail cards per day, listing every logged entry (slot → category → minutes → comment) read-only, plus any day-level note.
- **90 Days / Year view** — a GitHub-style heatmap, colored by hours studied that day, with month labels and spacing between months.
- **Day editor** (modal) — add/edit/remove entries per slot, set lessons completed and exam-passed for that day, write a day-level note, and mark the day "ignore in statistics." Opens as a proper modal: darkened backdrop, closes on outside click or `Escape`, header stays fixed while the entry list scrolls.
- **Week / Month notes** — an auto-saving note field at the top of Week/Month view, plus an "ignore in statistics" checkbox at the right edge of the same header row (next to the "X studied · goal Y" summary).
- **Days before the project's start date** render as plain greyed-out placeholders — no data, not clickable.
- **Effectiveness meter** — a per-weekday minute goal (configured in Setup), shown as a progress comparison on every day/week cell.

### Analytics tab
- **Range picker** — 7/30/90 days, all-time, or a custom date range. This selection persists when you switch to the Log tab and back (state is lifted to the root component, not remounted).
- **Overall stats** (visually distinct, tinted card) — lessons done, exams passed, and the forecast (lessons remaining, estimated time remaining, estimated time to finish, estimated finish date). This section is **course-wide and independent of the selected period** on purpose, since it's measured against the project's total lesson/exam counts.
- **Stats** — hours studied, days since start (shown as `60d (2.0 months)`), empty days — scoped to the selected period.
- **Averages** — avg hours/day, avg hours/lesson, avg lessons/day, avg days/exam, avg lessons/week, avg lessons/month, avg lessons/3 months — scoped to the selected period.
- **Remarkable** — best & worst day/week/month (in hours), scoped to the selected period.
- **Charts** (all with curved/dotted styling, legends as clickable toggle chips below the chart, values in hours):
  - *Daily study time* — stacked area, switchable between Slots / Categories / Hours / Lessons.
  - *Weekday effectiveness* — same four view modes, compared across weekdays.
  - *Weekly effectiveness* / *Monthly effectiveness* — same, bucketed by week/month, with an optional goal reference line.
  - *Days per exam* — how many calendar days elapsed between each exam pass.
- **Ignore in statistics** — any day, week, or month flagged this way is excluded from every chart and every stat above (including "Overall stats"); the affected cells render greyed-out in the Log tab so it's obvious retroactively.

### Setup (modal, 4 tabs)
- **Project details** — name, icon (picker), total lessons, total exams, start date, end date (optional — once set, days after it stop counting as "empty days"), and the per-weekday effectiveness-meter goals.
  - *Lessons/exams tracking toggle*: a switch next to "Total lessons"/"Total exams" (tooltip: "Include lessons log and analytics") lets you disable lesson/exam tracking for a project without deleting any previously logged data. **Note:** as of this version, the toggle is wired into the settings model and disables the corresponding number input, but does not yet hide the lesson/exam UI elsewhere (Day editor fields, Log tab badges, Analytics cards/charts) — see [§6 Known gaps](#6-known-gaps--in-progress-work).
- **Study slots** / **Categories** — add, rename, recolor, re-icon, delete, and set an optional description for each.
- **Projects** — switch active project, create a new one, or delete one (each project is fully independent: own slots, categories, log, settings).

### Account / cloud sync (optional)
- If Supabase isn't configured, the app is single-user and persists via `window.storage` — no login screen, works immediately.
- If configured (see §5), a login/signup screen (email + password) gates the app, and all project data is stored per-user in a single Supabase table instead of local storage.

---

## 4. Data model

Everything the app persists is one JSON object per user (or one per browser, if not using cloud sync):

```jsonc
{
  "activeProjectId": "project-abc123",
  "projects": [
    {
      "id": "project-abc123",
      "settings": {
        "projectName": "Spanish B2",
        "projectIcon": "Train",
        "totalLessons": 100,
        "totalExams": 10,
        "lessonsEnabled": true,
        "examsEnabled": true,
        "startDate": "2026-01-12",
        "endDate": null,
        "dailyGoals": { "0": 60, "1": 90, "2": 90, "3": 90, "4": 90, "5": 90, "6": 60 } // keyed by JS Date.getDay(), minutes
      },
      "slots": [
        { "id": "morning", "label": "Morning", "iconName": "Sunrise", "color": "#4C8FBD", "description": "" }
      ],
      "categories": [
        { "id": "notes", "label": "Lesson notes", "iconName": "NotebookPen", "color": "#4C8FBD", "description": "" }
      ],
      "days": {
        "2026-07-12": {
          "cells": {
            "morning": [
              { "id": "entry-xyz", "category": "notes", "minutes": 25, "comment": "" }
            ]
          },
          "lessons": 2,
          "exam": false,
          "comment": "",
          "ignore": false
        }
      },
      "weekNotes": { "2026-07-06": "Recap week before the exam" },
      "monthNotes": { "2026-07": "" },
      "weekIgnore": { "2026-07-06": false },
      "monthIgnore": { "2026-07": false }
    }
  ]
}
```

Notes on this shape:
- `days` is keyed by local-date string `YYYY-MM-DD` (no timezone conversion — see `toKey`/`fromKey` helpers).
- `weekNotes`/`weekIgnore` are keyed by the **Monday** of that week (`toKey(startOfWeek(date))`); `monthNotes`/`monthIgnore` by `YYYY-MM`.
- All of these fields are additive/optional — loading older saved data that lacks a field (e.g. an early save with no `weekIgnore`) is handled by `normalizeProject`, which fills in defaults without touching anything else. **No migration step is ever required** when the schema gains a new optional field; this has been the working pattern throughout the app's development.
- The whole object round-trips through a single `jsonb` column in Supabase (or a single JSON string in local storage) — there is no relational schema to migrate.

---

## 5. Deployment

### 5.1 Local development
Standard Vite + React project. Typical `package.json` dependencies:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "lucide-react": "^1.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "recharts": "^3.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x"
  }
}
```
Drop `App.jsx` (and its `App.css`, which just wires up Tailwind) into `src/`, run `npm install`, then `npm run dev`.

### 5.2 Netlify
Build command `npm run build`, publish directory `dist`. No server-side code is required — the app is fully static; cloud sync (if enabled) talks directly to Supabase from the browser.

### 5.3 Supabase (optional, for multi-user accounts + cloud sync)
1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run:
   ```sql
   create table study_data (
     user_id uuid primary key references auth.users(id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz default now()
   );
   alter table study_data enable row level security;
   create policy "read own data" on study_data for select using (auth.uid() = user_id);
   create policy "write own data" on study_data for insert with check (auth.uid() = user_id);
   create policy "update own data" on study_data for update using (auth.uid() = user_id);
   ```
3. In Project Settings → API, copy the **Project URL** (root only — no `/rest/v1/` path) and the **anon/public key** into the `SUPABASE_URL` / `SUPABASE_ANON_KEY` constants near the top of `App.jsx`.
4. `npm install @supabase/supabase-js`.
5. The anon/public key is safe to commit/ship in client code — it's constrained entirely by the RLS policies above (which restrict every row to `auth.uid() = user_id`). **Never** put the `service_role` key in frontend code; it bypasses RLS.
6. Until `SUPABASE_URL`/`SUPABASE_ANON_KEY` are filled in with valid values, the app never attempts to load the Supabase package and quietly runs single-user/local-storage — so it's always safe to leave unconfigured during development.

---

## 6. Known gaps / in-progress work

- **Optional lessons/exams tracking**: the `lessonsEnabled`/`examsEnabled` settings and their Setup-tab toggles exist and are persisted, and currently suppress the lesson/exam lines in hover tooltips. Not yet done: hiding the lesson-count/exam-passed inputs in the Day editor when disabled, hiding the corresponding badges in Log-tab day/week cards, and hiding the dependent Analytics cards and chart view-options ("Lessons" mode, "Days per exam" chart, lesson/exam figures in Overall Stats, Averages, and Forecast) when a project has one or both disabled. No data is deleted by the toggle either way — it only needs to affect what's rendered.

---

## 7. File map (single-file component index)

| Section | Purpose |
|---|---|
| `DEFAULT_SLOTS`, `DEFAULT_CATEGORIES`, `DEFAULT_SETTINGS` | Blank-project defaults (intentionally empty/neutral — no fabricated sample data) |
| `makeProject`, `normalizeProject`, `normalizeData`, `buildInitialData` | Data model construction & backward-compatible loading |
| `dayBreakdown`, `buildTooltip`, `computeOverviewStats` | Pure calculation helpers shared across Log and Analytics |
| `Tip`, `AutoTextarea`, `SegmentedControl`, `ToggleChips`, `useSeriesToggle` | Reusable UI primitives (styled tooltips, auto-growing textareas, segmented tab control, chart legend/toggle chips) |
| `useCloudAuth`, `AuthScreen` | Optional Supabase auth |
| `StudyTrackerApp` | Root component: loads/persists data, owns top-level view state, renders `TopBar` + `LogView`/`AnalyticsView` + modals |
| `TopBar`, `SetupModal`, `ProjectsTab`, `ProjectDetailsTab`, `EditableList` | Chrome and configuration UI |
| `LogView`, `MonthGrid`, `CompactDayCell`, `FullCardGrid`, `FullDayCard`, `Heatmap`, `DayEditor` | Log tab |
| `AnalyticsView`, `OverviewStats`, `AveragesStats`, `OverallStatsSection`, `RemarkableStats`, `ChartCard` | Analytics tab |

---

*Generated from a read-through of the current `App.jsx`. If the app changes, regenerate or hand-edit this file to match — it is documentation, not a build artifact, and won't stay in sync automatically.*