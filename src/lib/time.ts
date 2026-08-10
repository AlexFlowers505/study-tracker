/* ---------------------------------------------------------------
   Times of day, durations, and the rotated clock the sleep view runs on.
--------------------------------------------------------------- */

import type { TimeEntry, TimeOfDay } from "../types/model"
import { pad } from "./date"

export const timeToMinutes = (hhmm: TimeOfDay): number => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export const minutesToTime = (m: number): TimeOfDay =>
  `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

/** End before start means the session ran past midnight. */
export const spanMinutes = (start: TimeOfDay, end: TimeOfDay): number => {
  const a = timeToMinutes(start)
  const b = timeToMinutes(end)
  return b === a ? 0 : b > a ? b - a : b + 1440 - a
}

/**
 * A sleep entry belongs to the day the night *ended* — the night of the 3rd
 * into the 4th is logged on the 4th, which is how you think about it the
 * morning after. So a start later than the end means bedtime was the evening
 * before, and it is the start that carries the day marker.
 *
 * Anywhere an end time is shown on its own it has to say so, or 23:30–07:00
 * reads as a time machine.
 */
export const startedPreviousDay = (entry: TimeEntry): boolean =>
  !!entry.start &&
  !!entry.end &&
  timeToMinutes(entry.end) < timeToMinutes(entry.start)

/* ---- Minutes as hours ---- */

/** One digit after the dot unless it's a whole number. */
export const fmtHours = (minutes: number): string => {
  const h = Math.round((minutes / 60) * 10) / 10
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

/** Same rounding, but always one decimal — for fixed-width "Xm / Y.Zh" pairs. */
export const fmtHoursFixed1 = (minutes: number): string =>
  `${(minutes / 60).toFixed(1)}h`

/** Full precision, for stacking and summing in charts. */
export const toHours = (minutes: number): number => minutes / 60

/** Two digits after the dot unless it's a whole number. */
export const fmtHoursChart = (hoursValue: number): string => {
  const h = Math.round(hoursValue * 100) / 100
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(2)}h`
}

/**
 * Axis ticks stay whole hours — "2" and "3" rather than "2.55". Paired with
 * `allowDecimals={false}`; this is the belt-and-braces for any fractional tick
 * that still slips through on a tiny domain.
 */
export const fmtAxisHours = (hoursValue: number): string =>
  `${Math.round(hoursValue)}`

/* ---- The rotated clock ---------------------------------------------------

   The sleep axis starts at 18:00 rather than midnight. A night runs from one
   evening into the next morning, so on a plain 0–23 axis every night is split
   in two and thrown to opposite ends of the chart, where its shape is
   unreadable. Rotating the frame makes one night one block — and the same
   rotation is what makes the averages come out right: the naive mean of 23:30
   and 00:30 is midday, the exact opposite of the answer.
-------------------------------------------------------------------------- */

export const DAY_START_HOUR = 18
export const ROTATION = DAY_START_HOUR * 60

/** Every three hours across the rotated 24, shared by the sleep charts. */
export const HOUR_TICKS = Array.from({ length: 9 }, (_, i) => i * 180)

export const toRotated = (minutes: number): number =>
  (minutes - ROTATION + 1440) % 1440

export const fromRotated = (minutes: number): number =>
  (Math.round(minutes) + ROTATION) % 1440
