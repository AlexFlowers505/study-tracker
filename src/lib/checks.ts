/* ---------------------------------------------------------------
   Checks — the counters that answer "did it happen" rather than "how many".

   Four states, two of them stored. `yes` is a count of one, where it already
   lived; `unknown` is the absence of everything and resolves to `no` once the
   day is over. What is left — an explicit `no` and a `skip` — is the whole of
   `Day.checks`.

   Everything here exists so that rule is written down once. Working the state
   out at a call site means every call site has to remember that a count of one
   is a yes, and the first one that forgets shows a check that happened as a
   check that did not.
--------------------------------------------------------------- */

import type {
  CheckState,
  CounterKind,
  CounterUnit,
  Day,
  DayKey,
} from "../types/model"
import { UNSLOTTED, dayCounters, setSlotCount, unitDayTotal } from "./counters"

/**
 * Which question a unit answers.
 *
 * The fallback reads `oncePerDay`, and that reading is exact rather than a
 * guess: the flag was only ever set on things that either happened or did not,
 * which is the definition of a check. So an Overslept unit written before the
 * split lands in the right tab with nothing to migrate.
 */
export const counterKind = (unit: CounterUnit): CounterKind =>
  unit.kind ?? (unit.oncePerDay ? "check" : "tally")

export const isCheck = (unit: CounterUnit) => counterKind(unit) === "check"

export const splitByKind = (units: CounterUnit[]) => ({
  tallies: units.filter((u) => !isCheck(u)),
  checks: units.filter(isCheck),
})

/** The three a person can choose. `unknown` is only ever arrived at by clearing. */
export const CHECK_CHOICES: CheckState[] = ["yes", "no", "skip"]

export const CHECK_LABELS: Record<CheckState, string> = {
  unknown: "Not set",
  yes: "Yes",
  no: "No",
  skip: "Skipped",
}

/**
 * What a check says about one day — the one place the four states are worked
 * out, and the only place that knows a count of one means yes.
 *
 * A day that has not happened stays `unknown`: nothing is owed on it yet, and
 * resolving it to `no` would report a verdict on a day nobody has lived.
 */
export function checkState(
  day: Day | undefined,
  unitId: string,
  dayKey: DayKey,
  todayKey: DayKey,
): CheckState {
  const mark = day?.checks?.[unitId]
  if (mark) return mark
  if (unitDayTotal(dayCounters(day || {}), unitId) > 0) return "yes"
  return dayKey < todayKey ? "no" : "unknown"
}

const withoutUnit = (
  counters: Day["counters"],
  unitId: string,
): Day["counters"] => {
  const next = { ...(counters || {}) }
  delete next[unitId]
  return next
}

/**
 * The day's two fields after setting a check, as one patch.
 *
 * Both have to move together — `yes` is a count and the other two are marks —
 * and a check is a day-level fact, so setting anything but `yes` clears the
 * unit's counts in *every* slot rather than only the unslotted one. A unit
 * that carried slot counts before it was a check would otherwise go on reading
 * `yes` through whatever you set it to.
 */
export function setCheck(
  day: Day | undefined,
  unitId: string,
  next: CheckState,
): Pick<Day, "counters" | "checks"> {
  const checks = { ...(day?.checks || {}) }
  if (next === "no" || next === "skip") checks[unitId] = next
  else delete checks[unitId]

  if (next !== "yes") return { counters: withoutUnit(day?.counters, unitId), checks }

  // Already a yes by the count it has — leave that count alone. Rewriting it
  // to a flat one would quietly relocate a legacy slotted mark for no reason.
  const counters = day?.counters
  if (unitDayTotal(dayCounters(day || {}), unitId) > 0) return { counters, checks }
  return { counters: setSlotCount(counters, unitId, UNSLOTTED, 1), checks }
}
