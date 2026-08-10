/* ---------------------------------------------------------------
   The period.

   One period drives the whole page: `periodRange` is the only source of
   truth for "which days are we showing", and it feeds both halves, so the
   log and the analytics can never disagree about the range.
--------------------------------------------------------------- */

import type { DateRange, DayKey, PeriodId } from "../types/model"
import {
  addDays,
  addMonths,
  addYears,
  fromKey,
  monthLabel,
  startOfWeek,
} from "./date"

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "3 Months" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
]

export const NAVIGABLE_PERIODS = new Set<PeriodId>([
  "day",
  "week",
  "month",
  "quarter",
  "year",
])

/** Too long to draw as day cards or a month grid — these render as a heatmap. */
export const WIDE_PERIODS = new Set<PeriodId>([
  "quarter",
  "year",
  "all",
  "custom",
])

export function stepCursor(cursor: Date, period: PeriodId, dir: number): Date {
  switch (period) {
    case "day":
      return addDays(cursor, dir)
    case "week":
      return addDays(cursor, dir * 7)
    case "month":
      return addMonths(cursor, dir)
    // Steps a whole quarter, so the window stays aligned to month boundaries
    // instead of sliding by 90 days and landing mid-month.
    case "quarter":
      return addMonths(cursor, dir * 3)
    case "year":
      return addYears(cursor, dir)
    default:
      return cursor
  }
}

/**
 * `allStart` is where an all-time range begins — the first logged day, or the
 * project start; the caller owns that because it needs the saved data.
 */
export function periodRange(
  period: PeriodId,
  cursor: Date,
  customStart?: DayKey | null,
  customEnd?: DayKey | null,
  allStart?: Date | null,
): DateRange {
  const today = new Date()
  switch (period) {
    case "day":
      return { start: cursor, end: cursor }
    case "week": {
      const s = startOfWeek(cursor)
      return { start: s, end: addDays(s, 6) }
    }
    case "month": {
      const y = cursor.getFullYear()
      const m = cursor.getMonth()
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
    }
    // Whole calendar months, aligned to quarters, so it behaves like Month and
    // Year do: the block that contains the cursor, first day to last day.
    case "quarter": {
      const y = cursor.getFullYear()
      const firstMonth = Math.floor(cursor.getMonth() / 3) * 3
      return {
        start: new Date(y, firstMonth, 1),
        end: new Date(y, firstMonth + 3, 0),
      }
    }
    case "year":
      return {
        start: new Date(cursor.getFullYear(), 0, 1),
        end: new Date(cursor.getFullYear(), 11, 31),
      }
    case "all":
      return { start: allStart || today, end: today }
    case "custom": {
      const s = customStart ? fromKey(customStart) : today
      const e = customEnd ? fromKey(customEnd) : today
      return e < s ? { start: e, end: s } : { start: s, end: e }
    }
    default:
      return { start: today, end: today }
  }
}

export const fmtRangeEdge = (d: Date, withYear?: boolean): string =>
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  })

export function rangeLabel(
  period: PeriodId,
  cursor: Date,
  range: DateRange,
): string {
  if (period === "month") return monthLabel(cursor)
  if (period === "year") return String(cursor.getFullYear())
  if (period === "day") {
    return cursor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }
  // Whole months, so name the months rather than their first and last days.
  if (period === "quarter") {
    const month = (d: Date, withYear?: boolean) =>
      d.toLocaleDateString(undefined, {
        month: "short",
        ...(withYear ? { year: "numeric" } : {}),
      })
    return `${month(range.start)} – ${month(range.end, true)}`
  }
  if (period === "all") {
    return `All time · ${fmtRangeEdge(range.start, true)} – ${fmtRangeEdge(range.end, true)}`
  }
  return `${fmtRangeEdge(range.start)} – ${fmtRangeEdge(range.end, true)}`
}
