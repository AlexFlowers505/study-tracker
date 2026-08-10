/* ---------------------------------------------------------------
   Streaks — project-wide, not period-scoped.

   Read from raw day data. **Ignoring is invisible here**: a red ignored day
   breaks a streak like any other, or marking every bad day "ignored" would be
   the obvious way to fake one. The count-filter is invisible too — streaks
   always cover every slot and category, whatever the page is showing.

   Weeks and months are judged by their days, not by summed hours: a streak is
   about regularity, not volume. A frozen day counts as kept, everywhere.

   Today is the one thing still in flight — falling short of the goal at 3pm
   must not read as a broken streak.
--------------------------------------------------------------- */

import type { Project } from "../types/model"
import { addDays, addMonths, fromKey, monthDates, startOfWeek, toKey, weekDates } from "./date"
import { dayState, periodState } from "./freezes"

export interface Streaks {
  bestDays: number
  currentDays: number
  bestWeeks: number
  bestMonths: number
}

export function computeStreaks(project: Project): Streaks | null {
  const { days, slots, settings } = project
  // No effectiveness meter, no metric to build a streak out of.
  if (settings.goalsEnabled === false) return null

  const keys = Object.keys(days).sort()
  const firstKey = settings.startDate || keys[0]
  if (!firstKey) return null

  const today = new Date()
  const todayKey = toKey(today)
  const dates: Date[] = []
  for (let d = fromKey(firstKey); toKey(d) <= todayKey; d = addDays(d, 1)) {
    dates.push(d)
  }
  if (!dates.length) return null

  const states = dates.map((d) =>
    dayState(days[toKey(d)], d, settings, slots, todayKey),
  )

  let bestDays = 0
  let run = 0
  states.forEach((s) => {
    if (s === "pending") return
    if (s === "missed") {
      run = 0
      return
    }
    run += 1
    if (run > bestDays) bestDays = run
  })

  let currentDays = 0
  for (let i = states.length - 1; i >= 0; i -= 1) {
    const s = states[i]
    if (s === "pending") continue // today is not over yet
    if (s === "missed") break
    currentDays += 1
  }

  // Whole periods only: a week or month still running has not been missed.
  const bucketStreak = (starts: Date[], datesOf: (d: Date) => Date[]) => {
    let best = 0
    let streak = 0
    starts.forEach((start, i) => {
      if (i === starts.length - 1) return
      const s = periodState(datesOf(start), days, settings, slots, todayKey)
      if (s === "pending") return
      if (s === "missed") {
        streak = 0
        return
      }
      streak += 1
      if (streak > best) best = streak
    })
    return best
  }

  const weekStarts: Date[] = []
  for (
    let w = startOfWeek(fromKey(firstKey));
    toKey(w) <= toKey(startOfWeek(today));
    w = addDays(w, 7)
  ) {
    weekStarts.push(w)
  }

  const first = fromKey(firstKey)
  const monthStarts: Date[] = []
  for (
    let m = new Date(first.getFullYear(), first.getMonth(), 1);
    m <= new Date(today.getFullYear(), today.getMonth(), 1);
    m = addMonths(m, 1)
  ) {
    monthStarts.push(m)
  }

  return {
    bestDays,
    currentDays,
    bestWeeks: bucketStreak(weekStarts, weekDates),
    bestMonths: bucketStreak(monthStarts, monthDates),
  }
}
