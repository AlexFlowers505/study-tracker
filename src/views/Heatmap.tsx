/* ---------------------------------------------------------------
   Heatmap — how the long periods (3 months, year, all time, custom) are
   drawn, where day cards or a month grid would be unreadable.
--------------------------------------------------------------- */

import { useMemo } from "react"
import type {
  Category,
  Day,
  DayKey,
  IsIgnored,
  Settings,
  Slot,
} from "../types/model"
import { addDays, fromKey, startOfWeek, toKey } from "../lib/date"
import { fmtHours } from "../lib/time"
import {
  NEVER_IGNORED,
  buildTooltip,
  dayBreakdown,
  goalForDate,
} from "../lib/stats"
import { ACCENT, EXAM_COLOR, GOAL_MET_COLOR, btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"

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

const NEUTRAL_CELL = "#E7ECF3"
// Excluded days get a hatch rather than a tint. Over a 3-month or year span
// there are too many cells for a subtle wash to register, and a flag set
// months ago and forgotten is exactly what makes the totals confusing.
const IGNORED_CELL = "#1E2A3314"
const IGNORED_HATCH =
  "repeating-linear-gradient(45deg, transparent 0 3px, #1E2A3333 3px 6px)"

export function Heatmap({
  start,
  end,
  days,
  slots,
  categories,
  settings,
  todayKey,
  onSelectDay,
  isIgnored = NEVER_IGNORED,
  showMonths,
}: {
  start: Date
  end: Date
  days: Record<DayKey, Day>
  slots: Slot[]
  categories: Category[]
  settings: Settings
  todayKey: DayKey
  onSelectDay: (key: DayKey) => void
  isIgnored?: IsIgnored
  showMonths?: boolean
}) {
  const weeks = useMemo(() => buildHeatmapWeeks(start, end), [start, end])
  const startDate = settings?.startDate ? fromKey(settings.startDate) : null
  const goalsEnabled = settings?.goalsEnabled !== false

  // Cell colour reflects whether the daily goal was met, not how much was
  // studied relative to other days — and only for days that have actually
  // concluded and that have a goal set.
  const dayGoalOutcome = (date: Date, entry: Day | undefined, total: number) => {
    if (entry?.ignore) return null
    if (date > new Date() || toKey(date) === todayKey) return null
    const goal = goalForDate(settings, date)
    if (goal <= 0) return null
    return total >= goal ? "met" : "missed"
  }

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
                <div className="h-3 text-[8px] font-mono text-[#1E2A33]/40 whitespace-nowrap">
                  {monthTag}
                </div>
              )}
              {week.map((date, di) => {
                if (!date) return <div key={di} className="w-10 h-10" />
                if (startDate && date < startDate) {
                  return (
                    <div
                      key={di}
                      className="w-10 h-10 rounded-lg bg-[#1E2A33]/[0.03] flex items-center justify-center shrink-0"
                    >
                      <span className="text-[8px] font-mono leading-none text-[#1E2A33]/15">
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
                  : dayGoalOutcome(date, entry, total)
                const cellColor = ignored
                  ? IGNORED_CELL
                  : goalOutcome === "met"
                    ? `${GOAL_MET_COLOR}30`
                    : goalOutcome === "missed"
                      ? `${EXAM_COLOR}30`
                      : NEUTRAL_CELL
                const baseTip = `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${buildTooltip(entry, slots, categories, settings)}`
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
                        ...(ignored ? { backgroundImage: IGNORED_HATCH } : {}),
                        outline: isToday ? `2px solid ${ACCENT}` : "none",
                        outlineOffset: "1px",
                      }}
                      className={`${btnBase} w-10 h-10 rounded-lg hover:scale-105 flex flex-col items-center justify-center shrink-0`}
                    >
                      <span
                        className={`text-[8px] font-mono leading-none ${ignored ? "text-[#1E2A33]/30" : "text-[#1E2A33]/40"}`}
                      >
                        {date.getDate()}
                      </span>
                      {total > 0 && (
                        <span
                          className={`text-[9px] font-mono font-bold leading-none mt-0.5 ${
                            ignored
                              ? "text-[#1E2A33]/35 line-through"
                              : "text-[#1E2A33]/80"
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
      <div className="flex items-center gap-3 mt-3 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
        {goalsEnabled && (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: `${GOAL_MET_COLOR}30` }}
              />
              Goal met
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: `${EXAM_COLOR}30` }}
              />
              Goal missed
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px]"
                style={{ backgroundColor: NEUTRAL_CELL }}
              />
              No goal / not yet due
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{
              backgroundColor: IGNORED_CELL,
              backgroundImage: IGNORED_HATCH,
            }}
          />
          Ignored — not counted
        </span>
      </div>
    </div>
  )
}
