/* ---------------------------------------------------------------
   The overview numbers.

   Hours only. Everything derived from lessons and exams was removed with
   `spec 008`: those two tallies became user-defined counter units, and the
   statistics that read them will be redesigned around the new shape rather
   than ported field by field. What is left here never depended on either.

   `computeOverallAllTime` went with them — it existed to feed the project-wide
   forecast, which was lessons end to end.
--------------------------------------------------------------- */

import type { Day, DayKey, Slot } from "../types/model"
import { daysBetween } from "./date"
import { dayBreakdown } from "./stats"

export interface OverviewTotals {
  totalMinutes: number
  activeDays: number
  daysSinceStart: number
  emptyDays: number
  avgHoursPerDay: number | null
}

export function computeOverviewStats(
  keys: DayKey[],
  days: Record<DayKey, Day>,
  slots: Slot[],
  startDate: Date,
  endDateCutoff: Date,
): OverviewTotals {
  let totalMinutes = 0
  let activeDays = 0
  keys.forEach((k) => {
    const { total } = dayBreakdown(days[k], slots)
    if (total > 0) activeDays += 1
    totalMinutes += total
  })

  const daysSinceStart = Math.max(daysBetween(startDate, endDateCutoff) + 1, 1)
  const emptyDays = Math.max(daysSinceStart - activeDays, 0)

  // A plain calendar-day average, not "active days only": the elapsed days you
  // did nothing on are part of the pace, not an absence from it.
  const avgHoursPerDay =
    daysSinceStart > 0 ? totalMinutes / 60 / daysSinceStart : null

  return { totalMinutes, activeDays, daysSinceStart, emptyDays, avgHoursPerDay }
}
