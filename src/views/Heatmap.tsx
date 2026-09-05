/* ---------------------------------------------------------------
   Heatmap — how the long periods (3 months, year, all time, custom) are
   drawn, where day cards or a month grid would be unreadable.

   **A cell is the day's verdict, like every other drawing of a day.** This
   file was the last one still colouring itself the way the app worked before
   `spec 010`: its own `dayGoalOutcome`, `total >= goalForDate`, two outcomes.
   It therefore knew nothing about freezes, so a day you had paid for came out
   red — and red on a day that was saved is the worst thing a colour can say
   here. It also disagreed with the month grid about the very same Tuesday, on
   any project whose rules are not the daily goal.

   So it takes `verdictOf` and reads it through `asOutcome`, exactly as
   `MonthGrid` and the day cards do. One function decides what a day is, and
   the three views cannot drift.
--------------------------------------------------------------- */

import { useMemo } from "react"
import type {
  Activity,
  Day,
  DayKey,
  IsIgnored,
  Settings,
  Slot,
  CounterUnit,
} from "../types/model"
import type { DayReport } from "../lib/dayVerdict"
import { asOutcome } from "../lib/dayVerdict"
import { addDays, fromKey, startOfWeek, toKey } from "../lib/date"
import { fmtHours } from "../lib/time"
import { NEVER_IGNORED, buildTooltip, dayBreakdown } from "../lib/stats"
import type { Palette } from "../lib/theme"
import { btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

function buildHeatmapWeeks(start: Date, end: Date): (Date | null)[][] {
  const alignedStart = startOfWeek(start)
  const weeks: (Date | null)[][] = []
  let cur = new Date(alignedStart)
  while (cur <= end) {
    const week: (Date | null)[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur)
      week.push(d < start || d > end ? null : d)
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  return weeks
}

interface WeekTag {
  /** The month's short name, on the first week that reaches it. */
  monthTag: string | null
  /** True for every month boundary after the first — those get a wider gap. */
  newMonth: boolean
}

/**
 * Which weeks open a new month. A plain function rather than inline in the
 * render: it walks the weeks carrying the previous month along, and mutating
 * a binding while rendering misbehaves as soon as React re-runs the pass.
 */
function buildMonthTags(
  weeks: (Date | null)[][],
  showMonths?: boolean,
): WeekTag[] {
  let lastMonth: number | null = null
  return weeks.map((week) => {
    const firstReal = week.find((d) => d)
    if (!showMonths || !firstReal) return { monthTag: null, newMonth: false }
    const m = firstReal.getMonth()
    if (m === lastMonth) return { monthTag: null, newMonth: false }
    const monthTag = firstReal.toLocaleDateString(undefined, { month: "short" })
    const newMonth = lastMonth !== null
    lastMonth = m
    return { monthTag, newMonth }
  })
}

/** A day inside the range with nothing logged. On white it is a wash of
 *  blue-grey; on a dark page that reads as a hole, so it becomes a step up
 *  from the surface instead — "empty", not "absent". */
const neutralCell = (c: Palette) => (c.mode === "dark" ? `${c.ink}1A` : "#E7ECF3")
// Excluded days get a hatch rather than a tint. Over a 3-month or year span
// there are too many cells for a subtle wash to register, and a flag set
// months ago and forgotten is exactly what makes the totals confusing.
const ignoredCell = (c: Palette) => `${c.ink}14`
const ignoredHatch = (c: Palette) =>
  `repeating-linear-gradient(45deg, transparent 0 3px, ${c.ink}33 3px 6px)`

export function Heatmap({
  start,
  end,
  days,
  slots,
  activities,
  settings,
  todayKey,
  onSelectDay,
  isIgnored = NEVER_IGNORED,
  showMonths,
  counterUnits,
  verdictOf,
}: {
  start: Date
  end: Date
  days: Record<DayKey, Day>
  slots: Slot[]
  activities: Activity[]
  counterUnits: CounterUnit[]
  settings: Settings
  todayKey: DayKey
  onSelectDay: (key: DayKey) => void
  isIgnored?: IsIgnored
  showMonths?: boolean
  /** The day's composite verdict, the same callback `MonthGrid` takes. */
  verdictOf: (key: DayKey) => DayReport
}) {
  const c = usePalette()
  const weeks = useMemo(() => buildHeatmapWeeks(start, end), [start, end])
  const startDate = settings?.startDate ? fromKey(settings.startDate) : null
  /* Whether anything votes at all. The legend is a key to a colour scheme, and
     one that lists three states a project can never reach is as misleading as
     none — the same "absent, not disabled" the rest of the page follows. It
     used to hang off `goalsEnabled`, which stopped being what decides these
     colours the moment the verdict did. */
  const judging = (settings?.streakRules || []).some(
    (r) => r.inDayVerdict === true,
  )

  const weekTags = useMemo(
    () => buildMonthTags(weeks, showMonths),
    [weeks, showMonths],
  )

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max">
        {weeks.map((week, wi) => {
          const { monthTag, newMonth } = weekTags[wi]
          return (
            <div
              key={wi}
              className={`flex flex-col gap-1.5 ${newMonth ? "ml-6" : "ml-2"}`}
            >
              {showMonths && (
                <div className="h-3 text-[8px] font-mono text-ink/40 whitespace-nowrap">
                  {monthTag}
                </div>
              )}
              {week.map((date, di) => {
                if (!date) return <div key={di} className="w-10 h-10" />
                if (startDate && date < startDate) {
                  return (
                    <div
                      key={di}
                      className="w-10 h-10 rounded-lg bg-ink/[0.03] flex items-center justify-center shrink-0"
                    >
                      <span className="text-[8px] font-mono leading-none text-ink/15">
                        {date.getDate()}
                      </span>
                    </div>
                  )
                }
                const key = toKey(date)
                const entry = days[key]
                const { total } = dayBreakdown(entry, slots)
                const isToday = key === todayKey
                const ignored = isIgnored(key, entry)
                const goalOutcome = ignored
                  ? null
                  : asOutcome(verdictOf(key).state)
                const cellColor = ignored
                  ? ignoredCell(c)
                  : goalOutcome === "met"
                    ? `${c.goalMet}30`
                    : goalOutcome === "frozen"
                      ? `${c.freeze}30`
                      : goalOutcome === "missed"
                        ? `${c.exam}30`
                        : neutralCell(c)
                const baseTip = `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${buildTooltip(entry, slots, activities, counterUnits)}`
                return (
                  <Tip
                    key={di}
                    multiline
                    text={
                      ignored
                        ? `${baseTip}\n\nIgnored — not counted in any statistics`
                        : baseTip
                    }
                  >
                    <button
                      onClick={() => onSelectDay(key)}
                      style={{
                        backgroundColor: cellColor,
                        ...(ignored ? { backgroundImage: ignoredHatch(c) } : {}),
                        outline: isToday ? `2px solid ${c.accent}` : "none",
                        outlineOffset: "1px",
                      }}
                      className={`${btnBase} w-10 h-10 rounded-lg hover:scale-105 flex flex-col items-center justify-center shrink-0`}
                    >
                      <span
                        className={`text-[8px] font-mono leading-none ${ignored ? "text-ink/30" : "text-ink/40"}`}
                      >
                        {date.getDate()}
                      </span>
                      {total > 0 && (
                        <span
                          className={`text-[9px] font-mono font-bold leading-none mt-0.5 ${
                            ignored
                              ? "text-ink/35 line-through"
                              : "text-ink/80"
                          }`}
                        >
                          {fmtHours(total)}
                        </span>
                      )}
                    </button>
                  </Tip>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[9px] font-mono uppercase tracking-widest text-ink/40">
        {/* The words follow the colours: a cell says the day was kept, not
            that a goal was met. `Frozen` earns its swatch on being the one
            state you paid for — an unexplained blue among reds is exactly the
            confusion the old drawing caused by having no blue at all. */}
        {judging && (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: `${c.goalMet}30` }}
              />
              Kept
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: `${c.freeze}30` }}
              />
              Frozen
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: `${c.exam}30` }}
              />
              Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: neutralCell(c) }}
              />
              Not judged yet
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{
              backgroundColor: ignoredCell(c),
              backgroundImage: ignoredHatch(c),
            }}
          />
          Ignored — not counted
        </span>
      </div>
    </div>
  )
}
