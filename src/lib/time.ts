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

/**
 * A duration as hours **and minutes** — `2h 30m`, never `2.5h`.
 *
 * Decimal hours read fine as a magnitude and badly as a plan: "0.4h left" has
 * to be multiplied by 60 before it means anything you can act on, and doing
 * that arithmetic is the whole job of this app. Minutes are also what gets
 * stored, so this prints the exact figure instead of one rounded to a tenth of
 * an hour — `2.3h` was never a number anybody had logged.
 *
 * One unit when the other is zero: `45m`, `3h`. Both only when both are real.
 */
export const fmtHours = (minutes: number): string => {
  const sign = minutes < 0 ? "-" : ""
  const total = Math.round(Math.abs(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${sign}${m}m`
  if (!m) return `${sign}${h}h`
  return `${sign}${h}h ${m}m`
}

/** Full precision, for stacking and summing in charts. */
export const toHours = (minutes: number): number => minutes / 60

/** The same format for the charts, which carry hours rather than minutes. */
export const fmtHoursChart = (hoursValue: number): string =>
  fmtHours(hoursValue * 60)

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

/**
 * Every hour across the rotated 24, for the sleep charts' clock axis.
 *
 * Every hour rather than every third: the grid line is the ruler you read a
 * night's start and end against, and three-hour spacing meant estimating
 * inside a block two hours wide. Recharts thins the *labels* when they would
 * collide, so a phone still gets a readable axis over the same grid.
 */
export const HOUR_TICKS = Array.from({ length: 25 }, (_, i) => i * 60)

export const toRotated = (minutes: number): number =>
  (minutes - ROTATION + 1440) % 1440

export const fromRotated = (minutes: number): number =>
  (Math.round(minutes) + ROTATION) % 1440
