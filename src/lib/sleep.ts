/* ---------------------------------------------------------------
   Sleep, reduced to numbers.

   Everything here works on the 18:00-rotated clock from `time.ts`. A night
   runs from one evening into the next morning, so on a plain 0–23 axis every
   night is split in two and thrown to opposite ends of the chart. Rotating
   the frame makes one night one contiguous block — and the same rotation is
   what makes the averages come out right: the naive mean of 23:30 and 00:30
   is midday, the exact opposite of the answer.

   Sleep is a separate axis from study time. Nothing here feeds a breakdown,
   a range stat or a goal.
--------------------------------------------------------------- */

import type { Day, DayKey, DateRange, IsIgnored, TimeOfDay } from "../types/model"
import { datesInRange, fromKey, pad, toKey } from "./date"
import {
  DAY_START_HOUR,
  fromRotated,
  minutesToTime,
  spanMinutes,
  timeToMinutes,
  toRotated,
} from "./time"

/** One timed sleep entry placed on the rotated clock. */
export interface Night {
  key: DayKey
  /** Minutes into the rotated day at which sleep began. */
  start: number
  duration: number
  from: TimeOfDay
  to: TimeOfDay
}

export function collectNights(
  days: Record<DayKey, Day>,
  dates: Date[],
  isIgnored: IsIgnored,
): Night[] {
  const nights: Night[] = []
  dates.forEach((date) => {
    const key = toKey(date)
    const day = days[key]
    if (!day || isIgnored(key, day)) return
    ;(day.sleep || []).forEach((e) => {
      if (!e.start || !e.end) return
      const duration = spanMinutes(e.start, e.end)
      if (duration <= 0) return
      nights.push({
        key,
        start: toRotated(timeToMinutes(e.start)),
        duration,
        from: e.start,
        to: e.end,
      })
    })
  })
  return nights
}

export interface HourShare {
  hour: number
  label: string
  /** Percentage of logged nights spent asleep during this hour. */
  pct: number
}

export interface NightRow {
  label: string
  labelLong: string
  offset: number
  span: number
  hours: number
  minutes: number
  start: TimeOfDay
  end: TimeOfDay
}

export interface SleepStats {
  data: HourShare[]
  perNight: NightRow[]
  nights: number
  daysWithSleep: number
  bedtime: TimeOfDay
  wake: TimeOfDay
  duration: number
}

const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length

/** Null when the period holds no night with both a start and an end. */
export function sleepStats(
  days: Record<DayKey, Day>,
  range: DateRange,
  isIgnored: IsIgnored,
): SleepStats | null {
  const nights = collectNights(
    days,
    datesInRange(range.start, range.end),
    isIgnored,
  )
  if (!nights.length) return null

  // A day with nothing logged is an unknown, not a zero — counting it as a
  // zero would flatten the curve for every stretch where logging was patchy.
  const daysWithSleep = new Set(nights.map((n) => n.key)).size
  const covered = Array.from({ length: 24 }, () => new Set<DayKey>())
  nights.forEach((n) => {
    for (let m = n.start; m < n.start + n.duration; m += 1) {
      covered[Math.floor((m % 1440) / 60)].add(n.key)
    }
  })

  const data = covered.map((set, i) => ({
    hour: (DAY_START_HOUR + i) % 24,
    label: pad((DAY_START_HOUR + i) % 24),
    pct: Math.round((set.size / daysWithSleep) * 1000) / 10,
  }))

  const perNight = nights
    .slice()
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((n) => ({
      label: fromKey(n.key).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      }),
      // Longer form for the axis that has room for it; the per-night rows
      // keep the short one, their axis is 42px wide.
      labelLong: fromKey(n.key).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      offset: n.start,
      span: n.duration,
      hours: Number((n.duration / 60).toFixed(2)),
      minutes: n.duration,
      start: n.from,
      end: n.to,
    }))

  return {
    data,
    perNight,
    nights: nights.length,
    daysWithSleep,
    bedtime: minutesToTime(fromRotated(avg(nights.map((n) => n.start)))),
    wake: minutesToTime(
      fromRotated(avg(nights.map((n) => n.start + n.duration))),
    ),
    duration: avg(nights.map((n) => n.duration)),
  }
}
