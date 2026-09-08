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
  /**
   * How much of a day counts towards the headline hours. Absent means every
   * minute logged; the callers hand in the benchmark rule's own reading when
   * one is nominated, so the figure answers *how did the period go* rather
   * than *how thorough is the log* — see `benchmarkMeter`.
   *
   * **Only the hours.** `activeDays` and the empty days it implies stay on the
   * raw breakdown: a day you wrote something on is not an empty day, whatever
   * the benchmark thinks of what you wrote, and "empty" has always meant
   * nothing recorded.
   */
  measure?: (key: DayKey, day: Day | undefined) => number,
): OverviewTotals {
  let totalMinutes = 0
  let activeDays = 0
  keys.forEach((k) => {
    const { total } = dayBreakdown(days[k], slots)
    if (total > 0) activeDays += 1
    totalMinutes += measure ? measure(k, days[k]) : total
  })

  const daysSinceStart = Math.max(daysBetween(startDate, endDateCutoff) + 1, 1)
  const emptyDays = Math.max(daysSinceStart - activeDays, 0)

  // A plain calendar-day average, not "active days only": the elapsed days you
  // did nothing on are part of the pace, not an absence from it.
  const avgHoursPerDay =
    daysSinceStart > 0 ? totalMinutes / 60 / daysSinceStart : null

  return { totalMinutes, activeDays, daysSinceStart, emptyDays, avgHoursPerDay }
}
