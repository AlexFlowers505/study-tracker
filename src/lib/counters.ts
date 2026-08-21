/* ---------------------------------------------------------------
   Counter units, and the one-way door out of `lessons` / `exam`.

   `migrations/009_counter_units.sql` does this to the database. This does the
   same thing to a document arriving through the front door — an Export JSON
   file taken before the migration, which carries the old fields and no
   counters. Without it, refreshing dev from an older backup would drop every
   tally on the floor and look like it worked.

   **The two must agree exactly.** Same ids, same labels, same icons, same
   colours, same rule about when a total exists — otherwise an imported
   project grows a second pair of units alongside the migrated ones. Change
   one and change the other.
--------------------------------------------------------------- */

import type { CounterUnit, Day, DayKey, Settings } from "../types/model"
import { toKey } from "./date"

/** `unitId -> slotId -> value`. See `Day.counters`. */
export type DayCounters = Record<string, Record<string, number>>

/**
 * Where a count sits when it belongs to the day rather than to any part of it.
 * Everything carried over from `lessons`/`exam` is here — those never had a
 * slot, and picking one for them would be inventing data.
 */
export const UNSLOTTED = "unassigned"

/** A unit's figure for the day: its slots added up. */
export function unitDayTotal(
  counters: DayCounters | undefined,
  unitId: string,
): number {
  return Object.values(counters?.[unitId] || {}).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  )
}

/** Every unit's day figure at once, for the badges. */
export function dayTotals(counters: DayCounters | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  Object.keys(counters || {}).forEach((unitId) => {
    const total = unitDayTotal(counters, unitId)
    if (total) out[unitId] = total
  })
  return out
}

export const slotUnitValue = (
  counters: DayCounters | undefined,
  unitId: string,
  slotId: string,
): number => Number(counters?.[unitId]?.[slotId]) || 0

/**
 * Sets one unit's count in one slot. A zero removes the slot, and the last
 * slot going leaves no unit key at all — same rule as everywhere else here:
 * nothing recorded is an absent key, never a stored zero.
 */
export function setSlotCount(
  counters: DayCounters | undefined,
  unitId: string,
  slotId: string,
  value: number,
): DayCounters {
  const next: DayCounters = { ...(counters || {}) }
  const forUnit = { ...(next[unitId] || {}) }
  if (value > 0) forUnit[slotId] = value
  else delete forUnit[slotId]
  if (Object.keys(forUnit).length) next[unitId] = forUnit
  else delete next[unitId]
  return next
}

/** Which units already have a count in a given slot. */
export const unitsInSlot = <T extends { id: string }>(
  units: T[],
  counters: DayCounters | undefined,
  slotId: string,
): T[] => units.filter((u) => slotUnitValue(counters, u.id, slotId) > 0)

export const addSlotCount = (
  counters: DayCounters | undefined,
  unitId: string,
  slotId: string,
  delta: number,
): DayCounters =>
  setSlotCount(
    counters,
    unitId,
    slotId,
    slotUnitValue(counters, unitId, slotId) + delta,
  )

/**
 * Everything tallied so far, per unit, across the whole project.
 *
 * Deliberately not filtered by period or by "ignore in statistics": this is
 * the running total against a unit's total — how much of the syllabus is
 * behind you — and a day you finished a lesson on still counts whether or not
 * its hours are being reported.
 */
export function counterTotals(
  days: Record<DayKey, Day>,
): Record<string, number> {
  const out: Record<string, number> = {}
  Object.values(days).forEach((day) => {
    Object.entries(dayTotals(day.counters)).forEach(([id, value]) => {
      out[id] = (out[id] || 0) + value
    })
  })
  return out
}

/**
 * The same sum, but over a chosen set of dates rather than the whole project —
 * what a week or a month header reports.
 *
 * Ignored days are left out, the same predicate every other figure on the page
 * runs through: a day excluded from the hours cannot still contribute its
 * counts, or the two halves of one header would disagree.
 */
export function counterTotalsIn(
  dates: Date[],
  days: Record<DayKey, Day>,
  isIgnored: (key: DayKey, day: Day | undefined) => boolean,
): Record<string, number> {
  const out: Record<string, number> = {}
  dates.forEach((d) => {
    const key = toKey(d)
    const day = days[key]
    if (!day || isIgnored(key, day)) return
    Object.entries(dayTotals(day.counters)).forEach(([id, value]) => {
      out[id] = (out[id] || 0) + value
    })
  })
  return out
}

export const LESSONS_UNIT_ID = "unit-lessons"
export const EXAMS_UNIT_ID = "unit-exams"

/**
 * The two units the user would have created by hand, for a project that
 * predates them. Built only where the feature was actually on — a project that
 * never tracked exams must not inherit an empty exam unit — and `!== false`
 * because that is how the app itself read those flags when absent.
 */
export function legacyUnits(settings: Partial<Settings>): CounterUnit[] {
  const units: CounterUnit[] = []
  // A stored zero means "no total", not "a total of nothing", so the field
  // is omitted rather than stored as 0.
  const total = (n: unknown) => {
    const value = Number(n) || 0
    return value > 0 ? { total: value } : {}
  }
  if (settings.lessonsEnabled !== false) {
    units.push({
      id: LESSONS_UNIT_ID,
      label: "Lessons",
      iconName: "GraduationCap",
      color: "#4C8FBD",
      relation: "positive",
      ...total(settings.totalLessons),
    })
  }
  if (settings.examsEnabled !== false) {
    units.push({
      id: EXAMS_UNIT_ID,
      label: "Exams",
      iconName: "Award",
      color: "#C1595B",
      relation: "positive",
      ...total(settings.totalExams),
    })
  }
  return units
}

/**
 * A day's counters, filling them in from the old fields when they are absent.
 *
 * A zero or a false writes no key: "none recorded" and "recorded as none" are
 * different, and storing zeroes would make every untouched day in the history
 * look like one somebody had deliberately marked.
 */
export function dayCounters(day: Partial<Day>): DayCounters {
  if (day.counters && Object.keys(day.counters).length) return day.counters
  const out: DayCounters = {}
  const lessons = Number(day.lessons) || 0
  // Under `UNSLOTTED`, matching `migrations/010`: the old fields recorded a
  // day, never a slot within it.
  if (lessons) out[LESSONS_UNIT_ID] = { [UNSLOTTED]: lessons }
  if (day.exam) out[EXAMS_UNIT_ID] = { [UNSLOTTED]: 1 }
  return out
}
