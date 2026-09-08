/* ---------------------------------------------------------------
   One activity's sessions, read on the 18:00-rotated clock.

   A stretch that runs from one evening into the next morning is split in two
   on a plain 0–23 axis and thrown to opposite ends of the chart, where its
   shape is unreadable. Rotating the frame makes one stretch one contiguous
   block — and the same rotation is what makes the averages come out right:
   the naive mean of 23:30 and 00:30 is midday, the exact opposite of the
   answer.

   **This was `sleep.ts`, and it read `day.sleep`** — `spec 024`. Sleep is an
   ordinary activity now, so the question it answers ("when does this usually
   start, when does it end, how long does it run") is one you can ask about
   anything you log with times on it. What changed is one argument: the caller
   says which entries to read. What did not change is a line of the
   arithmetic.

   It still feeds nothing. No breakdown, no range stat, no goal reads any of
   it — this is a drawing, and `stats.ts` remains the only place a reported
   number comes from.
--------------------------------------------------------------- */

import type {
  Day,
  DayKey,
  DateRange,
  IsIgnored,
  StudyEntry,
  TimeOfDay,
} from "../types/model"
import { datesInRange, fromKey, pad, startOfWeek, toKey } from "./date"
import { entryActivity } from "./entries"
import {
  DAY_START_HOUR,
  fromRotated,
  minutesToTime,
  spanMinutes,
  timeToMinutes,
  toRotated,
} from "./time"

/** One timed entry placed on the rotated clock. */
export interface Session {
  key: DayKey
  /** Minutes into the rotated day at which sleep began. */
  start: number
  duration: number
  from: TimeOfDay
  to: TimeOfDay
}

/**
 * Which entries a day contributes.
 *
 * An argument rather than a hard-coded list because the one thing that made
 * this file about sleep was the list it read. `entriesOfActivity` is the only
 * caller today; the shape is here so the next question — *one slot's
 * sessions*, say — needs no change to any of the arithmetic below.
 */
export type PickEntries = (day: Day) => StudyEntry[]

/** Every entry filed under one activity, in whatever slot it sits. */
export const entriesOfActivity =
  (activityId: string): PickEntries =>
  (day) =>
    Object.values(day.cells || {})
      .flat()
      .filter((entry) => entryActivity(entry) === activityId)

export function collectSessions(
  days: Record<DayKey, Day>,
  dates: Date[],
  isIgnored: IsIgnored,
  pick: PickEntries,
): Session[] {
  const nights: Session[] = []
  dates.forEach((date) => {
    const key = toKey(date)
    const day = days[key]
    if (!day || isIgnored(key, day)) return
    pick(day).forEach((e) => {
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
  /** Percentage of the days that logged anything covered by this hour. */
  pct: number
}

export interface SessionRow {
  label: string
  labelLong: string
  /** Monday of the week this session belongs to — what the row chart rules
   *  between, so a run of them reads as weeks rather than as a list. */
  weekKey: string
  offset: number
  span: number
  hours: number
  minutes: number
  start: TimeOfDay
  end: TimeOfDay
}

export interface ClockStats {
  data: HourShare[]
  perNight: SessionRow[]
  sessions: number
  daysCovered: number
  from: TimeOfDay
  to: TimeOfDay
  duration: number
}

const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length

/** Null when the period holds no night with both a start and an end. */
export function clockStats(
  days: Record<DayKey, Day>,
  range: DateRange,
  isIgnored: IsIgnored,
  pick: PickEntries,
): ClockStats | null {
  const nights = collectSessions(
    days,
    datesInRange(range.start, range.end),
    isIgnored,
    pick,
  )
  if (!nights.length) return null

  // A day with nothing logged is an unknown, not a zero — counting it as a
  // zero would flatten the curve for every stretch where logging was patchy.
  const daysCovered = new Set(nights.map((n) => n.key)).size
  const covered = Array.from({ length: 24 }, () => new Set<DayKey>())
  nights.forEach((n) => {
    for (let m = n.start; m < n.start + n.duration; m += 1) {
      covered[Math.floor((m % 1440) / 60)].add(n.key)
    }
  })

  const data = covered.map((set, i) => ({
    hour: (DAY_START_HOUR + i) % 24,
    label: pad((DAY_START_HOUR + i) % 24),
    pct: Math.round((set.size / daysCovered) * 1000) / 10,
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
      weekKey: toKey(startOfWeek(fromKey(n.key))),
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
    sessions: nights.length,
    daysCovered,
    from: minutesToTime(fromRotated(avg(nights.map((n) => n.start)))),
    to: minutesToTime(
      fromRotated(avg(nights.map((n) => n.start + n.duration))),
    ),
    duration: avg(nights.map((n) => n.duration)),
  }
}
