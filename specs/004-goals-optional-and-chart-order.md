# Spec 004 — optional effectiveness meter, chart option order, overall-stats icon

Read `AGENTS.md` and `CLAUDE.md` first. Three independent changes, all in
`src/App.jsx`. No database change.

## 1. Make the effectiveness meter optional

The daily minute goal becomes a feature you can switch off, the same way
lessons and exams already are. When it is off, **the goal disappears
everywhere** — charts, day cards, week strips, month grid, heatmap and the
`goal 19.5h` line in the period header.

- Add `goalsEnabled: true` to `DEFAULT_SETTINGS` (~line 243). Read it the way
  the file already reads the others: `settings?.goalsEnabled !== false`, so
  existing projects with no such key keep their goals.
- In Setup, put a `SwitchToggle` next to the `Effectiveness meter — daily
  minute goal` heading (~line 2740), wrapped in a `Tip`, exactly like the exams
  toggle above it. The seven weekday inputs get `disabled` and the same muted
  style the exams count input uses.
- **Make sure `goalsEnabled` is part of the settings object the modal saves**
  (~lines 2597 and 2612). A new field that is not added there will look like it
  works and will be gone after a reload.
- `goalForDate(settings, date)` (~line 392) returns 0 when goals are off. Most
  goal UI in this file is already guarded by `goal > 0`, so the day tints, the
  week-strip dots, the heatmap colours and the header text fall away on their
  own. Walk each call site and confirm that — do not assume it.

**Charts need explicit removal, not a zero.** There are four `dataKey="goal"`
series (~5672 daily, ~5806 weekday, ~5904 weekly, ~6009 monthly). If
`goalForDate` merely returns 0 they will draw a flat line along the bottom,
which is worse than the line they replace. Do not render those series at all
when goals are off, and drop the matching entries from the legend and tooltip.

The three "effectiveness" charts still show hours without a goal, so keep them.
Adjust their subtitles when goals are off so they stop promising a comparison
that is not on screen.

The heatmap legend (~line 4517) has a `No goal / not yet due` key. Drop the
goal-related keys from it when goals are off.

## 2. One order for the chart options

Four `SegmentedControl`s currently disagree: daily (~5625) and weekday (~5742)
run Slots → Categories → Hours → Lessons, while weekly (~5833) and monthly
(~5937) run Hours → Slots → Categories → Lessons.

Make all four:

```
Hours → Categories → Slots → Lessons
```

Options a chart does not have are simply skipped; any extra option a chart has
goes after these four. Only the order changes — keep the `id` values
(`hours`, `category`, `slot`, `lessons`), keep the `lessonsEnabled` guard on
Lessons, and **do not change which mode each chart starts on**.

If the same list is now repeated four times, lift it to one helper next to the
charts rather than copying a fifth.

## 3. Replace the overall-stats icon

`Rocket` does not say "project totals and forecast". Use `Sigma` — it reads as
"the sum of everything", which is what the panel is.

Both places: the toggle in `PeriodBar` (~line 3143) and the header of
`OverallStatsSection` (~line 6207). `Rocket` stays in the import block and in
`ICON_LIBRARY` — it is a project icon a user can pick, so removing it would
break existing projects.

## Done when

- `npx eslint src/App.jsx` — 16 errors, the pre-existing baseline. Not 17.
- `npm run build` succeeds.
- With goals off: no goal line in any chart, no green/red day tints, no
  `goal Xh` in the period header, and the weekday inputs in Setup are disabled.
- Toggling goals off, closing Setup and reloading keeps them off.
- All four charts list their options in the same order.

## Out of scope

Renaming the "effectiveness" charts, changing default modes, any change to how
goals are stored.

## Reminder

Do not start the dev server — it connects to the live Supabase project with
real study history. Report at the end that the UI is not visually verified.
