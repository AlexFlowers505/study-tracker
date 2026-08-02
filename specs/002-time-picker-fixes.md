# Spec 002 — fixes to `TimeRangeField`

Read `AGENTS.md` and `CLAUDE.md` first. This corrects the component added by
`specs/001-entry-time-range.md`. The data model from 001 is correct and must
not change: `minutes` stays the stored authoritative number, `start`/`end` are
optional `"HH:MM"` keys that are deleted rather than set to `null`.

All changes are in `TimeRangeField` in `src/App.jsx` unless stated otherwise.

## 1. Live preview while hovering the dial

Today the blue marker only moves on click, so you aim blind.

- Add local state for a hovered value. On `onMouseMove` over the SVG, compute
  the value with the **same** function the click handler uses, and store it.
  Clear it on `onMouseLeave`.
- While a hover value exists, the marker (line + filled circle) is drawn at the
  hovered position instead of the committed one, and the text input for the
  field being edited displays the hovered time.
- A click still commits and advances the step exactly as it does now.

**The preview must never call `onChange`.** It is local state only. `onChange`
writes to the entry, and `persist()` debounces a save one second later — wiring
a preview into it would queue a write for every mouse move and hammer the
server with hundreds of saves per visit.

Give the committed marker and the hover marker a visible difference — e.g. the
hover one at lower opacity — so it is clear which one is real. Touch devices
never fire hover; click must keep working unchanged.

## 2. Show the resulting duration in the panel

A single mis-click can produce a silent 23-hour entry: `end` earlier than
`start` is treated as crossing midnight, so 10:00 → 09:00 becomes 1380 minutes
with nothing on screen saying so, and the minutes input is disabled.

- When both times are set, show the computed duration in the panel, near the
  two inputs, using `spanMinutes` and `fmtHours` (e.g. `1h 25m` / `85m` —
  match the formatting used elsewhere in the editor).
- When that duration is over 12 hours, mark it: colour it `EXAM_COLOR` and add
  a short note that the range crosses midnight. Do not block it — an overnight
  session is legitimate — just stop it from being invisible.
- The duration follows the hover preview too, so you see what a click will
  produce before making it.

## 3. The panel width class is dead

`DATE_PANEL_CLASS` already contains `w-max`, and Tailwind emits `.w-max` after
`.w-[236px]` in the stylesheet, so the arbitrary width never applies and the
panel is sized by its widest child.

Do not fight this with `!important`. Drop `w-max` for this panel by composing
the class list explicitly, or give the dial a fixed width and let the panel
shrink-wrap it. Either way the dial must end up square and around 220–240px
wide, with the panel not wider than that.

## 4. The text input loses focus as you finish typing

The inputs are uncontrolled (`defaultValue`) with `key={start || "empty"}`.
Changing a `key` remounts the element, so the moment your typed value becomes
valid, the input is destroyed and rebuilt and the caret is gone.

Replace the `key`/`defaultValue` pair with a local buffer, the pattern
`NoteCard` already uses in this file: hold the text in `useState`, sync it from
props with an effect when the prop changes, and commit upward only when the
buffer parses as a valid time. No `key` hack.

While you are there, accept `9:15` as well as `09:15` — pad the hour on commit.

## 5. Half-set times must be visible on the trigger

The trigger reads `Set time` unless **both** values exist, so an entry that has
a `start` and no `end` looks empty from the outside while the data says
otherwise.

Show what is actually stored: `09:00 – …` when only the start is set, `… – 10:40`
when only the end is. Keep `Set time` for the genuinely empty case.

## 6. Snap the dial to 5 minutes

Minute clicks are hit-tested at 1-minute resolution, but the marker circle is
r=14 and covers about three minute positions, so an exact minute cannot be
aimed at anyway and the selected-label highlight only ever matches multiples of
5. Snap the minute dial to 5. Exact minutes are still reachable by typing in
the input, which is what it is there for.

## 7. Small cleanups

- The SVG is interactive but carries `role="img"`. Drop the role, and label it
  in a way that suits a control rather than an image.
- `updateEntry` in `DayEditForm` now contains an IIFE inside `.map()` with a
  `"start" in patch` dance to detect deletion. Pull it out into a named helper
  above `addEntry` and keep `.map()` a one-liner — match the density of the
  code around it.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- Hovering the dial moves the marker and updates the shown time; moving the
  mouse away and clicking nothing leaves the entry unchanged.
- Picking 10:00 → 09:00 shows a flagged 23h duration rather than looking normal.
- Typing `9:15` into the start input keeps focus and commits `09:15`.

## Out of scope

- Keyboard navigation of the dial.
- Dragging the clock hand.
- Overlap detection between entries.
- The hour-of-day chart.

## Reminder

Do not start the dev server to try this out — it connects to the live Supabase
project with real study history. Report at the end that the UI is not visually
verified.
