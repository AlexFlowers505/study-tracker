/* ---------------------------------------------------------------
   The balance — `spec 010`, part 4.

   A streak resets to zero, and that is the whole source of its power: "20" is
   frightening to lose only because tomorrow it is either 21 or nothing. But it
   leaves one hole that nothing else covers — **the day after it breaks costs
   nothing.** Zero minus zero. The most dangerous stretch is not the slip, it
   is the week that follows it, and a streak has nothing to say about that
   week.

   So a second counter runs beside it, with a different job. A kept day is
   `+1`, a missed day is `−1`, and it never resets. The streak is fear; this
   is the account.

   **Denominated in the same thing the streak counts**, which is what stops a
   second economy existing at all: there is no game currency to optimise
   against the promise, because the currency *is* the promise. A reward priced
   at forty kept days cannot be underestimated the way "50,000 points" can.

   **It goes negative.** A floor at zero would mean that after a bad enough
   month, a bad day is free again — which is the hole this exists to close.

   **A ledger, not a recomputation.** A day's mark is written once, when the
   day leaves the editing window, and never revisited. This is the only figure
   in the app you can *spend*, so editing yesterday must not be able to change
   a balance a purchase was already priced against. Today and yesterday are
   therefore visible but not yet counted.

   **A kept day is `+1`; a missed day is `−3`.** It was symmetric at first, on
   the grounds that a symmetric rate keeps the shop reachable for anyone above
   half — which is true, and was the wrong thing to optimise. A reward you can
   reach while keeping barely half your promises is a reward that says half is
   enough. At `−3` the account only grows above a **75%** keep rate, and that
   is the point: the price of the shop is a standard, not a grind.

   Neither figure is a setting. A configurable rate is the forgeable part of
   any economy — the number you quietly edit on the evening you need it to be
   different.
--------------------------------------------------------------- */

import type { DayMark, Project } from "../types/model"
import { dayReport, heldUp } from "./dayVerdict"
import { streakContext } from "./customStreaks"
import { addDays, fromKey, toKey } from "./date"
import { isEditableDay } from "./freezes"
import { makeIsIgnored } from "./stats"

/** What a kept day adds. Not a setting — see the note above. */
export const KEPT_VALUE = 1

/**
 * What a missed day takes. Three, deliberately: break-even sits at a 75% keep
 * rate, so the balance grows only while the promise is mostly being kept.
 */
export const MISSED_COST = 3

export interface Balance {
  /** What is left to spend: every sealed mark, less everything bought. */
  total: number
  /** The marks alone, before anything was taken out. */
  earned: number
  /** Kept days already spent in the shop. */
  spent: number
  /** Days marked so far. */
  sealed: number
  /**
   * Today and yesterday, still inside the editing window: shown as "not yet
   * counted" rather than hidden, because a day you can still fix is a day
   * worth seeing.
   */
  pendingKept: number
  pendingMissed: number
}

/** The running total of every sealed mark, in date order. */
export function balanceOf(project: Project, today = new Date()): Balance {
  const ledger = project.dayLedger || {}
  const todayKey = toKey(today)
  let earnedDays = 0
  let sealed = 0
  Object.values(ledger).forEach((mark) => {
    earnedDays += mark.kept ? KEPT_VALUE : -MISSED_COST
    sealed += 1
  })
  // Purchases come straight off the top. A reward taken is a reward paid for,
  // and there is no refund — see `spec 010` part 6.
  const spent = Object.values(project.purchases || {}).reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0,
  )

  // The two days still in the writing window, reported apart from the total.
  const ctx = streakContext(project)
  let pendingKept = 0
  let pendingMissed = 0
  for (let i = 0; i <= 1; i++) {
    const key = toKey(addDays(today, -i))
    if (ledger[key]) continue
    const { state } = dayReport(project, key, todayKey, ctx)
    if (state === "unjudged" || state === "pending") continue
    if (heldUp(state)) pendingKept += 1
    else pendingMissed += 1
  }

  return {
    total: earnedDays - spent,
    earned: earnedDays,
    spent,
    sealed,
    pendingKept,
    pendingMissed,
  }
}

/**
 * The days that should have a mark and do not yet — write these, once.
 *
 * Sealed on **the log's own horizon**, not the weekly one: a day is settled
 * the moment it can no longer be written, which is a day earlier than a week
 * is. Deliberately returns them rather than writing, exactly as `ruleStatus`
 * does with its verdicts — the caller owns persistence, and a mark must be
 * written exactly once.
 *
 * An **ignored** day is skipped entirely, like everywhere else a number is
 * reported. A day no rule judged is skipped too: there was no promise to keep.
 */
export function dueMarks(project: Project, today = new Date()): DayMark[] {
  const from = project.settings.balanceStart
  if (!from) return []
  const todayKey = toKey(today)
  const ledger = project.dayLedger || {}
  const ctx = streakContext(project)
  const isIgnored = makeIsIgnored(project.weekIgnore, project.monthIgnore)
  const out: DayMark[] = []
  const sealedAt = new Date().toISOString()

  for (let d = fromKey(from); toKey(d) <= todayKey; d = addDays(d, 1)) {
    const key = toKey(d)
    if (isEditableDay(key, todayKey)) continue
    if (ledger[key]) continue
    if (isIgnored(key, project.days[key])) continue
    const { state } = dayReport(project, key, todayKey, ctx)
    if (state === "unjudged" || state === "pending") continue
    out.push({ date: key, kept: heldUp(state), sealedAt })
  }
  return out
}
