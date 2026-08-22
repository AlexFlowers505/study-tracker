/* ---------------------------------------------------------------
   Every number the app reports comes from here.

   Sleep is a separate axis and never appears in any of it: nothing below
   reads `day.sleep`, and nothing should start.
--------------------------------------------------------------- */

import type {
  Activity,
  Day,
  DayKey,
  DayTotals,
  IsIgnored,
  Labeled,
  Settings,
  Slot,
  CounterUnit,
} from "../types/model"
import { fromKey, monthKey, startOfWeek, toKey } from "./date"
import { getById } from "./id"
import { entryActivity } from "./entries"

export const goalForDate = (
  settings: Settings | undefined,
  date: Date,
): number =>
  settings?.goalsEnabled === false
    ? 0
    : Number(settings?.dailyGoals?.[date.getDay()]) || 0

/**
 * A day is out of the statistics if it, its week, or its month carries the
 * "ignore in statistics" flag. Everything that reports a number — the period
 * header, the log's breakdowns, the analytics — goes through this one
 * predicate, so the two halves of the page cannot drift apart on what counts.
 */
export function makeIsIgnored(
  weekIgnore: Record<string, boolean> = {},
  monthIgnore: Record<string, boolean> = {},
): IsIgnored {
  return (key, entry) => {
    if (entry?.ignore) return true
    const d = fromKey(key)
    if (weekIgnore[toKey(startOfWeek(d))]) return true
    return !!monthIgnore[monthKey(d)]
  }
}

export const NEVER_IGNORED: IsIgnored = () => false

export function dayBreakdown(
  dayEntry: Day | undefined,
  slots: Slot[],
): DayTotals {
  const bySlot: Record<string, number> = {}
  const byActivity: Record<string, number> = {}
  let total = 0
  slots.forEach((s) => (bySlot[s.id] = 0))
  if (dayEntry && dayEntry.cells) {
    slots.forEach((s) => {
      const arr = dayEntry.cells?.[s.id] || []
      arr.forEach((e) => {
        const m = Number(e.minutes) || 0
        bySlot[s.id] += m
        total += m
        // An entry with no activity still has to land somewhere, or the
        // activity rows stop adding up to the total. It gets its own bucket
        // and renders through `getById`'s grey fallback.
        const cat = String(entryActivity(e))
        byActivity[cat] = (byActivity[cat] || 0) + m
      })
    })
  }
  return { bySlot, byActivity, total }
}

export function rangeStats(
  dates: Date[],
  days: Record<DayKey, Day>,
  slots: Slot[],
  settings: Settings,
  isIgnored: IsIgnored = NEVER_IGNORED,
): { total: number; goal: number } {
  let total = 0
  let goal = 0
  dates.forEach((d) => {
    const key = toKey(d)
    // An ignored day contributes neither its hours nor its goal — otherwise
    // the period would look like it missed a target it was never held to.
    if (isIgnored(key, days[key])) return
    const { total: t } = dayBreakdown(days[key], slots)
    total += t
    goal += goalForDate(settings, d)
  })
  return { total, goal }
}

export interface BreakdownRow extends Labeled {
  minutes: number
}

export function periodBreakdown(
  dates: Date[],
  days: Record<DayKey, Day>,
  slots: Slot[],
  activities: Activity[],
  isIgnored: IsIgnored,
): { total: number; slotRows: BreakdownRow[]; activityRows: BreakdownRow[] } {
  const bySlot: Record<string, number> = {}
  const byActivity: Record<string, number> = {}
  let total = 0
  slots.forEach((s) => (bySlot[s.id] = 0))
  dates.forEach((d) => {
    const key = toKey(d)
    if (isIgnored(key, days[key])) return
    const b = dayBreakdown(days[key], slots)
    total += b.total
    slots.forEach((s) => (bySlot[s.id] += b.bySlot[s.id] || 0))
    Object.entries(b.byActivity).forEach(([id, m]) => {
      byActivity[id] = (byActivity[id] || 0) + m
    })
  })
  // Configured activities in their configured order, then any id that survives
  // only inside old entries, so the rows always add back up to the total.
  const activityIds = [
    ...activities.map((c) => c.id),
    ...Object.keys(byActivity).filter(
      (id) => !activities.some((c) => c.id === id),
    ),
  ]
  const toRow = (item: Labeled, minutes: number): BreakdownRow => ({
    ...item,
    minutes,
  })
  return {
    total,
    slotRows: slots
      .map((s) => toRow(s, bySlot[s.id] || 0))
      .filter((r) => r.minutes > 0),
    activityRows: activityIds
      .map((id) => toRow(getById(activities, id), byActivity[id] || 0))
      .filter((r) => r.minutes > 0),
  }
}

/**
 * Days of a period that have actually happened and actually count. Per-day
 * averages divide by this rather than by the full length, so neither a month
 * still in progress nor a stretch of ignored days drags the figure down.
 */
export function elapsedDayCount(
  dates: Date[],
  days: Record<DayKey, Day>,
  isIgnored: IsIgnored,
): number {
  const todayKey = toKey(new Date())
  const counted = dates.filter((d) => {
    const key = toKey(d)
    return key <= todayKey && !isIgnored(key, days[key])
  })
  return Math.max(counted.length, 1)
}

export function buildTooltip(
  dayEntry: Day | undefined,
  slots: Slot[],
  activities: Activity[],
  units: CounterUnit[] = [],
): string {
  const { bySlot, byActivity, total } = dayBreakdown(dayEntry, slots)
  if (!dayEntry || total === 0) {
    return dayEntry?.comment
      ? `No study logged\n—\n${dayEntry.comment}`
      : "No study logged"
  }
  const lines = [`Total: ${total}m`]
  slots.forEach((s) => {
    if (bySlot[s.id] > 0) lines.push(`${s.label}: ${bySlot[s.id]}m`)
  })
  lines.push("—")
  activities.forEach((c) => {
    if (byActivity[c.id]) lines.push(`${c.label}: ${byActivity[c.id]}m`)
  })
  units.forEach((u) => {
    const value = dayEntry.counters?.[u.id]
    if (value) lines.push(`${u.label}: ${value}`)
  })
  if (dayEntry.comment) lines.push("—", dayEntry.comment)
  return lines.join("\n")
}
