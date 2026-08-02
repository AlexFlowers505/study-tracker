# Spec 005 — sleep tracking

Read `AGENTS.md` and `CLAUDE.md` first. This one **does** change the database.
The charts and the page toggle are a separate spec (006); stop at the data and
the editor.

## Goal

An optional second thing to log per day: sleep. Same entry mechanics as study
entries — a start/end time range picked with `TimeRangeField` — but with no
categories and no slots. Sleep never counts as study time.

## 1. Database

`days` stores its fields as real columns, so a new field needs a column. Write
`migrations/002_sleep.sql`:

```sql
alter table days add column if not exists sleep jsonb not null default '[]'::jsonb;
```

That is the whole migration. RLS is inherited from `projects` through the
existing policy, so nothing else is needed. **Do not touch `study_data`** and do
not run the migration — the user applies it by hand in the Supabase SQL editor.
Say so in your report.

Then wire the column through both directions, or the column will exist and stay
empty:

- `loadFromTables` (~line 1514): add `sleep` to the `days` select list, and map
  `sleep: r.sleep || []` in the row mapping (~line 1542).
- `applyWriteOp`, the `"day"` case (~line 1625): add `sleep: day.sleep || []`
  to the upsert.

No new op type — sleep lives on the day row, so `opDay` already covers it.

## 2. Data model

```js
days['YYYY-MM-DD'].sleep = [{ id, start: "HH:MM", end: "HH:MM", minutes, comment }]
```

- Omit the key entirely when there are no sleep entries, the same way
  `start`/`end` are omitted from a study entry. An untouched day must stay
  byte-identical to one written before this change.
- `minutes` is derived by `spanMinutes(start, end)` whenever both times are
  set, exactly as for study entries. Reuse `withDerivedMinutes`/`patchEntry`
  rather than writing a second copy.
- **A sleep entry belongs to the date the sleep started.** Going to bed at
  23:30 on the 1st is logged on the 1st, even though most of it happens on the
  2nd. `spanMinutes` already handles the wrap. Where the end time is shown and
  it is earlier than the start, mark it `+1d` so the day it lands on is never
  ambiguous.
- **Sleep minutes must never reach study totals.** `dayBreakdown`, `rangeStats`,
  goals, the donuts, every stat tile and every existing chart stay blind to it.
  If you find yourself editing `dayBreakdown`, stop — that is the wrong file
  region for this task.

Update the shape comment on `days` in `makeProject` (~line 261).

## 3. Setting

Add `sleepEnabled: false` to `DEFAULT_SETTINGS` — off by default, this is
opt-in. Read it as `settings?.sleepEnabled === true`.

In Setup, a `SwitchToggle` labelled `Enable sleep tracking`, wrapped in a
`Tip`, placed with the other feature toggles. As in spec 004: make sure the
field is part of the settings object the modal actually saves, or it will not
survive a reload.

## 4. Two tabs in the day editor

When `sleepEnabled` is on, `DayEditForm` gets two tabs above its body:
`Project tracker` and `Sleep tracker`. Use the existing `SegmentedControl` —
do not build a new tab strip. When sleep is off, no tabs appear and the editor
looks exactly as it does today.

`Project tracker` is the current content, unchanged.

`Sleep tracker` is a single white card in the same style as a slot card,
containing a list of sleep entries. Each row has:

- a `TimeRangeField` for start and end,
- the derived minutes as a read-only readout in the same place the study row
  puts its number input,
- the same optional comment `AutoTextarea`,
- the same delete button.

Plus an add button in the card header like the slot cards have, and the total
slept for that day beside it. Entries carry no category and no slot.

The tab is local UI state; do not persist which tab was open.

## 5. Show sleep in the day's information

Where a day's entries are listed (`EntriesReadout`, ~line 4088), show sleep
entries **as their own group**, clearly separated from study, and only when
`sleepEnabled` is on. Never merge them into a slot or into the day total.

Use `Moon` from `lucide-react` for sleep throughout, and pick one colour for it
from `PALETTE` rather than inventing a hex.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- `migrations/002_sleep.sql` exists and contains only the `alter table`.
- With sleep off, nothing in the UI changes anywhere.
- With sleep on, logging a sleep entry leaves every study figure on the page
  unchanged — day total, week total, goals, donuts, all charts.
- A day with no sleep entries has no `sleep` key in its in-memory object.

## Out of scope

The sleep chart and the page toggle — spec 006. Sleep goals, sleep quality,
naps as a separate category, any change to study entries.

## Reminder

Do not start the dev server and do not run the migration — both touch the live
Supabase project with real study history. Report at the end that the UI is not
visually verified and that the migration still needs to be applied by hand.
