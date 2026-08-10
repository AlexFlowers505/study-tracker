/* ---------------------------------------------------------------
   Streak freezes.

   The one idea everything rests on: **earning is a ledger of events, not a
   function of the current data.** Every finished week gets exactly one
   verdict, written once and never revisited. Editing a past week afterwards
   changes its colours and the displayed streak, but not its verdict — so
   re-breaking and re-fixing the same week can never mint a second freeze, and
   editing any past date stays completely unrestricted.

   Streaks themselves stay derived: change your goals and the number changes.
   Only the spendable thing is ledgered, because only the spendable thing is
   worth protecting.
--------------------------------------------------------------- */

import type {
  Day,
  DayKey,
  Project,
  Settings,
  Slot,
  WeekVerdict,
} from "../types/model"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "./date"
import { dayBreakdown, goalForDate } from "./stats"

/** Unused freezes pile up to here and no further. Shown in the UI, never
 *  silently discarded without saying so. */
export const FREEZE_CAP = 15

export type DayState = "met" | "frozen" | "missed" | "pending"
export type PeriodState = "met" | "frozen" | "missed" | "pending"

/**
 * A day's standing for streak purposes, read from raw data.
 *
 * **Ignoring is invisible here.** A red ignored day breaks a streak like any
 * other — otherwise marking every bad day "ignored" would be the obvious way
 * to fake one. Ignoring may take things away (an ignored week earns no
 * freeze) but never give them.
 *
 * A goal of 0 counts as met: there was nothing to miss.
 */
export function dayState(
  day: Day | undefined,
  date: Date,
  settings: Settings,
  slots: Slot[],
  todayKey: DayKey,
): DayState {
  const key = toKey(date)
  // Frozen always wins, even over a day that would now pass: a freeze spent
  // back when the day was red stays spent, and settings never rewrite it.
  if (day?.frozen) return "frozen"
  if (key > todayKey) return "pending"
  const goal = goalForDate(settings, date)
  if (goal <= 0) return "met"
  if (dayBreakdown(day, slots).total >= goal) return "met"
  // Today is still in progress — falling short at 3pm is not a miss yet.
  return key === todayKey ? "pending" : "missed"
}

/**
 * A week or month, judged by its days rather than by summed hours: a streak
 * is about regularity, not volume. Hours are still displayed truthfully; only
 * the colour comes from here.
 *
 * - every day met            → "met"    (green)
 * - no unfrozen miss, ≥1 frozen → "frozen" (blue: we spent freezes, so this
 *                                 is not a failure — but the goal was missed)
 * - any unfrozen miss        → "missed" (red)
 */
export function periodState(
  dates: Date[],
  days: Record<DayKey, Day>,
  settings: Settings,
  slots: Slot[],
  todayKey: DayKey,
): PeriodState {
  let anyFrozen = false
  let anyPending = false
  for (const d of dates) {
    const s = dayState(days[toKey(d)], d, settings, slots, todayKey)
    if (s === "missed") return "missed"
    if (s === "frozen") anyFrozen = true
    if (s === "pending") anyPending = true
  }
  if (anyFrozen) return "frozen"
  return anyPending ? "pending" : "met"
}

/**
 * Whether a week earns its freeze — the same condition as "green or blue".
 * Frozen days count, so 6 met + 1 frozen earns one back and breaks even: one
 * missed day a week is a standing allowance, and a second one costs.
 */
function weekEarned(
  weekStart: Date,
  days: Record<DayKey, Day>,
  settings: Settings,
  slots: Slot[],
  todayKey: DayKey,
  weekIgnore: Record<DayKey, boolean>,
): boolean {
  // An ignored week earns nothing. Not inconsistent with "ignoring is
  // invisible to streaks": it can only cost you, so there is nothing to game.
  if (weekIgnore[toKey(weekStart)]) return false
  const state = periodState(weekDates(weekStart), days, settings, slots, todayKey)
  return state === "met" || state === "frozen"
}

/**
 * A week is sealed once the *following* week has ended, not the moment it
 * does itself. Logging a past date is normal in this app, so that leaves a
 * full week to fill one in honestly; after that the verdict is fixed forever.
 * The same one-week horizon governs spending, so the whole system has one.
 */
export function isSealable(weekStart: Date, today: Date): boolean {
  return addDays(weekStart, 13) < today
}

export interface FreezeLedger {
  /** Verdicts that should exist but do not yet — write these, once. */
  pending: WeekVerdict[]
  earned: number
  spent: number
  /** Capped at `FREEZE_CAP`. */
  balance: number
  /** How many earned freezes the cap has thrown away. */
  forfeited: number
}

/**
 * Reads the ledger and works out which sealed weeks are still missing a
 * verdict. Deliberately returns them rather than writing: the caller owns
 * persistence, and a verdict must be written exactly once.
 */
export function freezeLedger(project: Project, today = new Date()): FreezeLedger {
  const {
    days,
    slots,
    settings,
    weekIgnore = {},
    weekVerdicts = {},
  } = project
  const todayKey = toKey(today)
  const keys = Object.keys(days).sort()
  const firstKey = settings.startDate || keys[0]

  const pending: WeekVerdict[] = []
  // Accounting starts when the feature does; earlier weeks never grant.
  const accountingStart = settings.freezeStart
    ? fromKey(settings.freezeStart)
    : null

  if (firstKey && settings.goalsEnabled !== false && accountingStart) {
    const from = startOfWeek(
      accountingStart > fromKey(firstKey) ? accountingStart : fromKey(firstKey),
    )
    for (let w = from; isSealable(w, today); w = addDays(w, 7)) {
      const wk = toKey(w)
      if (weekVerdicts[wk]) continue
      pending.push({
        weekKey: wk,
        earned: weekEarned(w, days, settings, slots, todayKey, weekIgnore),
        sealedAt: new Date().toISOString(),
      })
    }
  }

  const all = [...Object.values(weekVerdicts), ...pending]
  const earned = all.filter((v) => v.earned).length
  const spent = Object.values(days).filter((d) => d.frozen).length
  const raw = earned - spent
  return {
    pending,
    earned,
    spent,
    balance: Math.max(0, Math.min(raw, FREEZE_CAP)),
    forfeited: Math.max(0, raw - FREEZE_CAP),
  }
}

/**
 * A freeze can only be spent on a day that needs one, and only inside the
 * one-week horizon — the same window a verdict is still unsealed in.
 */
export function canFreeze(
  date: Date,
  day: Day | undefined,
  settings: Settings,
  slots: Slot[],
  today: Date,
  balance: number,
): boolean {
  if (settings.goalsEnabled === false) return false
  if (balance <= 0) return false
  if (day?.frozen) return false
  const todayKey = toKey(today)
  const state = dayState(day, date, settings, slots, todayKey)
  // Red days, or today while it is still short.
  if (state !== "missed" && !(state === "pending" && toKey(date) === todayKey))
    return false
  const thisWeek = startOfWeek(today)
  const earliest = addDays(thisWeek, -7)
  return date >= earliest
}
