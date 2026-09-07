/* ---------------------------------------------------------------
   Date helpers.

   Local time throughout, deliberately: a day key is what the calendar on the
   wall says, and going through UTC would shift it by a day for anyone east
   or west of Greenwich. Weeks start Monday.
--------------------------------------------------------------- */

import { currentLocale, t } from "./i18n"

import type { DayKey } from "../types/model"

export const pad = (n: number): string => String(n).padStart(2, "0")

export const toKey = (d: Date): DayKey =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (k: DayKey): Date => {
  const [y, m, d] = k.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** `"YYYY-MM"` — the month key a date belongs to. */
export const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const addMonths = (d: Date, n: number): Date => {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

export const addYears = (d: Date, n: number): Date => {
  const r = new Date(d)
  r.setFullYear(r.getFullYear() + n)
  return r
}

export const startOfWeek = (d: Date): Date => {
  const r = new Date(d)
  const day = r.getDay()
  const diff = (day === 0 ? -6 : 1) - day // Monday as week start
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

export const daysBetween = (a: Date, b: Date): number =>
  Math.round(
    (new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) /
      86400000,
  )

export const sameDay = (a: Date | null, b: Date | null): boolean =>
  !!a && !!b && toKey(a) === toKey(b)

/** Every date in an inclusive range, so a readout aggregates over exactly
 *  what the grid or heatmap below it is showing. */
export function datesInRange(start: Date, end: Date): Date[] {
  const count = daysBetween(start, end) + 1
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function weekDates(cursor: Date): Date[] {
  const s = startOfWeek(cursor)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

export function monthDates(cursor: Date): Date[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from(
    { length: daysInMonth },
    (_, i) => new Date(year, month, i + 1),
  )
}

// getDay() indices: 0=Sun ... 6=Sat
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // displayed Mon -> Sun

/**
 * **A getter, not a constant.** The labels have to follow the language, and a
 * module-level object is built once at import and then says `Mon` forever.
 * Every reader already called it as a lookup, so it stays a lookup — it is
 * just rebuilt per call, which is seven `t()` hits and nothing worth caching.
 */
export const weekdayLabels = (): Record<number, string> => ({
  1: t("Mon"),
  2: t("Tue"),
  3: t("Wed"),
  4: t("Thu"),
  5: t("Fri"),
  6: t("Sat"),
  0: t("Sun"),
})

/** Kept for the call sites that read one label out of it. */
export const WEEKDAY_LABELS = new Proxy(
  {},
  { get: (_t, k) => weekdayLabels()[Number(k)] },
) as Record<number, string>

/**
 * Which locale a date is formatted in.
 *
 * `undefined` used to be passed, which means *this browser's* language — so a
 * Russian interface printed `Aug 17` on an English machine and an English one
 * printed `17 авг.` on a Russian one. The app's own choice is the only answer
 * that cannot disagree with the sentence around it.
 */
export const dateLocale = (): string =>
  currentLocale() === "ru" ? "ru-RU" : "en-GB"

export const fmtShort = (k: DayKey): string => {
  const d = fromKey(k)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`
}

export const fmtDateLong = (k: DayKey): string =>
  fromKey(k).toLocaleDateString(dateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

export const monthLabel = (d: Date): string =>
  d.toLocaleDateString(dateLocale(), { month: "long", year: "numeric" })

// A month never holds more than six week rows, so the table is the whole
// implementation — no need for the subtractive-notation algorithm.
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]
export const toRoman = (n: number): string => ROMAN[n - 1] || String(n)

/** Day count -> "60d (2.0 months)", where the months scale reads better. */
export const fmtDaysWithMonths = (days: number): string =>
  t("{days}d ({months} months)", {
    days,
    months: (days / 30.44).toFixed(1),
  })
