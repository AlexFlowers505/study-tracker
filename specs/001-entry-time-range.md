# Spec 001 — start/end times on an entry

Read `AGENTS.md` and `CLAUDE.md` first.

## Goal

Every entry in the day editor gets an optional **start** and **end** time,
picked on a clock dial. When both are set, the entry's `minutes` is computed
from them and the number input goes read-only. Entries without times keep
working exactly as they do today — minutes typed by hand.

Both fields are optional forever. ~150 existing days have no times and must
not be backfilled, guessed or migrated.

## Files

`src/App.jsx` only. No SQL: entries live inside the `days.cells` jsonb column,
so new keys inside an entry need no schema change and no migration.

## Data model

An entry is currently `{ id, category, minutes, comment }`. It gains two
optional keys:

```js
{ id, category, minutes, comment, start?: "HH:MM", end?: "HH:MM" }
```

Rules, all of which matter:

- **`minutes` stays the stored, authoritative number.** Everything that
  aggregates time (`dayBreakdown`, every stat tile, every chart) keeps reading
  `minutes` and must not learn about `start`/`end`. Do not compute duration at
  read time anywhere.
- Times are `"HH:MM"` strings, 24-hour, zero-padded. Not `Date`, not epoch
  milliseconds — a bare string has no timezone, which is the same reason
  `toKey`/`fromKey` work in local time throughout this repo.
- **Unset means the key is absent**, not `null`. Clearing times deletes both
  keys so an untimed entry is byte-identical to one written before this change.
- Both set → `minutes` is derived and rewritten on every change to either.
  Only one set → nothing is derived; `minutes` stays whatever it was and stays
  editable.
- `end` earlier than `start` means the session crossed midnight: add 24h.
  `end` equal to `start` is zero minutes, not 24 hours.

Add two helpers next to the other small date helpers (near `toKey`):

```js
const timeToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// end before start means it ran past midnight
const spanMinutes = (start, end) => {
  const a = timeToMinutes(start)
  const b = timeToMinutes(end)
  return b === a ? 0 : b > a ? b - a : b + 1440 - a
}
```

## Steps

### 1. `TimeRangeField` component

Put it next to `DateRangeField` (~line 991) and build it the same way — that
component is the model to copy, down to the two-step "pick a start, then an
end" flow and its hint line.

Props: `{ start, end, onChange(start, end), onClear }`. `start`/`end` are
`"HH:MM"` or undefined.

- Trigger: a `FIELD_BOXED` + `btnBase` button with a `Clock` icon (already
  imported), reading `09:15 – 10:40` when set and `Set time` when not.
- Panel: portalled to `document.body` via the existing `useDatePopover()` hook
  and `DATE_PANEL_CLASS`. Do not hand-roll positioning; do not use an
  absolutely positioned div — it would be clipped by the modal's scroll area,
  which is exactly what that hook exists to avoid.
- Panel contents, top to bottom:
  1. Two small `HH:MM` text inputs, Start and End, the active one highlighted.
     Typing a valid `HH:MM` sets that value directly. **This is not optional** —
     a dial alone makes 10:47 painful, and some entries need exact minutes.
  2. The dial (below).
  3. A hint line in the style of `DateRangeField`'s: `Pick the start hour` →
     `…minutes` → `Now the end hour` → `…minutes`.
  4. A `Clear` button that calls `onClear`.
- Flow: start hour → start minute → end hour → end minute → close the panel.
  Clicking either text input jumps the flow to that field's hour step.

### 2. The dial

Plain SVG, no library. `viewBox="0 0 200 200"`, centre `(100, 100)`.

- **Hours, 24h, two rings.** Outer ring r=78 carries 0–11, inner ring r=52
  carries 12–23. Minutes use one ring at r=78 with labels every 5 (`00`, `05`,
  … `55`) but hit-testing at 1-minute resolution.
- Hit-testing a click at `(x, y)` relative to centre:

  ```js
  const angle = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI)
  const step = Math.round((angle / (2 * Math.PI)) * n) % n   // n = 12 or 60
  const radius = Math.hypot(x, y)                            // hours: inner if < 65
  ```

  Convert the click through the SVG's own coordinate space (measure the
  element and scale), not raw client pixels — the panel is responsive.
- Selection marker: a line from the centre to the chosen position plus a filled
  circle r=14 behind that number.
- Colours come from the existing constants — `ACCENT` for the selection, `INK`
  at low opacity for the face. No new hex literals, and remember Tailwind
  cannot see class names built from template literals, so anything computed
  goes in `style`.
- Click only. Dragging the hand is out of scope.

### 3. Wire it into `DayEditForm`

In `updateEntry` (~line 4715), recompute after the patch is applied:

```js
const withDerivedMinutes = (entry) =>
  entry.start && entry.end
    ? { ...entry, minutes: spanMinutes(entry.start, entry.end) }
    : entry
```

In the entry row (~line 4905), keep the layout and add `TimeRangeField` above
the existing category/minutes line. The number input stays where it is but
becomes `disabled` with a muted style whenever both times are set — its value
is then a readout. Clearing the times makes it editable again.

Never allow a state where the typed minutes and the time range disagree; that
would make the entry quietly lie about itself.

### 4. Prefill

When `addEntry` creates an entry in a slot that already has entries, and the
last of those has an `end`, set the new entry's `start` to that `end`. Sessions
in one slot usually run back to back, and this removes half the clicks. Leave
`end` unset. Keep `minutes: 15` as the default for untimed entries.

### 5. Show the range where entries are listed

In the day view's entry line (~line 4088, currently `{e.minutes}m`), show
`09:15–10:40` when both times exist, otherwise the existing `85m`. One line,
same muted style.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- Reasoning checks on `spanMinutes`: `("09:15","10:40") === 85`,
  `("23:30","00:30") === 60`, `("10:00","10:00") === 0`.
- An entry with no times round-trips through the editor with no `start`/`end`
  keys added to it.
- Setting both times updates the entry's minutes, the slot subtotal in the
  editor header and the day total, with no other aggregation code touched.

## Out of scope

- The hour-of-day chart. It comes in a later spec, once there is timed data to
  put in it — building it now would only ever render an empty axis.
- Backfilling, estimating or defaulting times for existing entries. Nothing
  invented: a fabricated distribution is indistinguishable from a real one
  later, and that chart's entire purpose is to be believed.
- Overlap detection between entries, and per-slot default times.
- Dragging the clock hand.

## Reminder

Do not start the dev server to try this out. It connects to the live Supabase
project with real study history, and a test edit there is a real edit. Report
at the end that the UI is not visually verified.
