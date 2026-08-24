/* ---------------------------------------------------------------
   Checks — the counters that answer "did it happen" rather than "how many".

   Three answers, two of them stored. `yes` is a count of one, where it already
   lived; the other two — an explicit `no` and a `skip` — are the whole of
   `Day.checks`. A check with none of the three has **not been answered**, and
   that is an absence rather than a fourth state: `checkState()` returns null.

   There used to be an `unknown` that resolved to `no` once the day was over.
   It existed so a day card could draw every check as a checklist; it went with
   the checklist, because an unanswered check is not a failed one and the app
   should not say that it is. `spec 011`, Part 2.

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

/** All of them. There is no fourth, and no state you can only arrive at. */
export const CHECK_CHOICES: CheckState[] = ["yes", "no", "skip"]

export const CHECK_LABELS: Record<CheckState, string> = {
  yes: "Yes",
  no: "No",
  skip: "Skipped",
}

/** What an unanswered check reads as, wherever one has to be named. */
export const UNANSWERED = "Not answered"

/**
 * What a check says about one day — the one place the three answers are worked
 * out, and the only place that knows a count of one means yes.
 *
 * **Null is not an answer.** It used to resolve to `no` on a day that had
 * ended, which quietly turned every check you never got round to into a check
 * you failed. Nothing is inferred now: a day with no mark and no count simply
 * has nothing to say about this check, exactly as it has nothing to say about
 * a tally you never counted.
 *
 * The date arguments are gone with the inference. A check's answer no longer
 * depends on what day it is or on whether that day has ended, and a signature
 * that still asked would be inviting somebody to make it depend on them again.
 */
export function checkState(
  day: Day | undefined,
  unitId: string,
): CheckState | null {
  const mark = day?.checks?.[unitId]
  if (mark) return mark
  if (unitDayTotal(dayCounters(day || {}), unitId) > 0) return "yes"
  return null
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
  /** Null takes the answer back, which is a deletion rather than an answer. */
  next: CheckState | null,
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
