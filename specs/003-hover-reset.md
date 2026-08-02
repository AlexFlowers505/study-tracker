# Spec 003 — stale hover value in `TimeRangeField`

Read `AGENTS.md` and `CLAUDE.md` first. Small follow-up to
`specs/002-time-picker-fixes.md`. Everything else in that spec landed
correctly; do not revisit it.

## The bug

`hoverValue` is one number shared by all four steps, but the scale under it
changes when the step does. Committing a click advances the step and leaves the
old hover number in place, so it is re-read on the new scale until the mouse
moves again.

Worked example, second click of the flow:

1. Step `start-minute`, pointer on the 30 mark, so `hoverValue === 30`.
2. Click. `start` becomes `09:30`, step becomes `end-hour`.
3. Re-render: `isMinute` is now false and `hoverValue` is still 30, so 30 is
   read as an **hour**. `timeFromDialValue(30)` builds `"30:00"`, which is what
   the End input displays. `timeToMinutes("30:00")` is 1800, so the duration
   readout shows roughly 20 hours and flags "crosses midnight". The marker
   lands on the inner ring at `30 % 12 = 6`, reading as 18:00.

None of it matches the data, and it persists until the pointer moves one pixel.
The duration readout was added to catch nonsense values, so it must not be the
thing inventing them.

## Fix

Clear the hover value whenever the step it belongs to is left — at minimum
inside `selectDialValue`, so a commit never carries a hover value into the next
step. Prefer a change that makes the whole class of bug impossible: either
reset on every `setStep`, or store the hover as `{ step, value }` and ignore it
when `step` does not match the current one.

Do not fix this by clamping or validating `timeFromDialValue`'s output. The
value is not out of range — it is being read on the wrong scale, and hiding
that would leave the marker and the readout disagreeing with each other.

## Also

- `DATE_PANEL_CLASS` is now unused: its content was copied inline into the time
  panel to escape the `w-max` conflict. Split the constant into a base part and
  a width part instead, and have both the date fields and the time panel use
  the base — otherwise the copy silently drifts the next time the panel styling
  changes.
- In `dialValueFromPointer`, `Math.round(value / 5) * 5 % 60` is correct only
  because `*` and `%` share precedence and associate left to right. Parenthesise
  it.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- Clicking through hour → minute → hour → minute never shows a time outside
  `00:00`–`23:59` in either input, at any point, including the frame right
  after a click with the pointer held still.
- `DATE_PANEL_CLASS` has exactly one definition and every panel uses it.

## Out of scope

Keyboard access to the dial, dragging the hand, entry overlap detection, the
hour-of-day chart.

## Reminder

Do not start the dev server — it connects to the live Supabase project with
real study history. Report at the end that the UI is not visually verified.
