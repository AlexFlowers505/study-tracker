# Spec 006 — the sleep section on the page

Read `AGENTS.md` and `CLAUDE.md` first. Depends on spec 005 being done. No
database change.

## Goal

A togglable section showing when the person usually sleeps over the chosen
period. Today it holds one chart; more will be added, so build it as a section
that can grow, not as a lone chart.

## 1. The toggle

A `Moon` button in `PeriodBar`, in the same group as the count filter and the
overall-stats toggles, placed after the filter and before the jump-to-current
button. It behaves like those two: active state while the section is open, and
the section carries a close X of its own.

**The button is not rendered at all when `sleepEnabled` is off.** Not disabled
— absent. There is nothing behind it to show.

The open/closed state is local UI state in `StudyTrackerApp`, like `showFilter`
and `showOverall`. Do not persist it.

## 2. Where the section renders

Between the period bar and `LogView`, after the overall-stats block — the same
band the count filter and overall stats already use, which `CLAUDE.md`
describes as the place panels opened from the period bar live.

Style it as a sibling of those two: tinted panel, round icon badge with `Moon`,
title, close X. Give it its own tint constant next to `FILTER_TINT`.

Unlike those two panels, this one **is** period-scoped: it shows the current
`range` and changes when the period changes.

## 3. The chart — when you sleep

For every day in the range that is not ignored, take its sleep entries with
both times set and mark which hours of the day they cover.

- X axis: hour of day, **rotated to start at 18:00** — 18, 19, … 23, 0, 1, …
  17. A night runs from evening into morning, so on a plain 0–23 axis every
  night is split into two blocks at opposite ends of the chart and the shape is
  unreadable. The rotation makes one night one contiguous block.
- Y axis: the share of days in the range that were asleep during that hour, as
  a percentage. Percentages, not totals, so the chart means the same thing on a
  week and on a year.
- An area chart fits the shape; match the styling of the existing charts and
  use `ChartCard`.
- Denominator: days in the range that have at least one timed sleep entry. Days
  with no sleep logged are not zeros, they are unknowns — counting them as
  zeros would flatten the curve for every period where logging was patchy.

Add three tiles above the chart: **average bedtime**, **average wake time**,
**average duration**.

> Averaging times of day naively is wrong: the mean of 23:30 and 00:30 is
> 12:00, the exact opposite of the right answer. Compute bedtime and wake time
> in the same rotated frame the axis uses — minutes since 18:00, with anything
> earlier than 18:00 treated as the next day — average there, then convert
> back. Duration averages normally, since `spanMinutes` already resolves the
> wrap.

**Ignored days are excluded**, like everywhere else in this app. Use
`makeIsIgnored(weekIgnore, monthIgnore)` — do not write a second predicate.

Empty state: when the range has no timed sleep at all, show a short line saying
so instead of an empty axis. A range that predates sleep tracking is the normal
case for a long while, not an error.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- The `Moon` button is absent when sleep tracking is off.
- Switching periods changes the chart; toggling the count filter does not,
  since sleep has neither slots nor categories.
- A day marked "ignore in statistics" does not appear in the chart or the
  averages.
- A range with no sleep data shows the empty-state line, not a blank chart.

## Out of scope

Sleep goals or targets, sleep quality, correlating sleep with study time,
per-day sleep rows in the log, anything on the month grid or heatmap.

## Reminder

Do not start the dev server — it connects to the live Supabase project with
real study history. Report at the end that the UI is not visually verified.
