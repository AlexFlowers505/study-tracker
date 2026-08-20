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
import {
  WEEKDAY_ORDER,
  addDays,
  fromKey,
  startOfWeek,
  toKey,
  weekDates,
} from "./date"
import { dayBreakdown, goalForDate } from "./stats"

/** Unused freezes pile up to here and no further. Shown in the UI, never
 *  silently discarded without saying so. */
export const FREEZE_CAP = 15

/** Total minutes a full week asks for, across the seven per-weekday goals. */
export function weeklyGoalTotal(dailyGoals: Record<number, number>): number {
  return WEEKDAY_ORDER.reduce((sum, wd) => sum + (dailyGoals[wd] || 0), 0)
}

/** Was the weekly goal lowered during this week? Then it forfeits its freeze. */
export function weekWasCut(settings: Settings, weekStart: Date): boolean {
  const wk = toKey(weekStart)
  return (settings.goalCuts || []).some((g) => g.weekKey === wk)
}

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
  // Neither does a week in which the bar was lowered. Every other edit makes
  // the week harder or leaves it alone; this is the only one that could buy a
  // green week outright, so it costs the week's freeze.
  if (weekWasCut(settings, weekStart)) return false
  const state = periodState(weekDates(weekStart), days, settings, slots, todayKey)
  return state === "met" || state === "frozen"
}

/**
 * How far back the log can be written at all: **today and yesterday**.
 *
 * One rule, and everything else is a consequence of it. A day you can still
 * change is a day whose verdict is not yet a fact, so the editable window is
 * also the window in which a week is still open — the two cannot drift,
 * because there is only one of them.
 */
export const EDIT_HORIZON_DAYS = 1

export function isEditableDay(key: DayKey, todayKey: DayKey): boolean {
  if (key > todayKey) return false
  return key >= toKey(addDays(fromKey(todayKey), -EDIT_HORIZON_DAYS))
}

/**
 * A week is sealed once **every one of its days has passed out of the editing
 * window** — nothing in it can be changed any more, so its verdict is finally
 * a fact about a finished week rather than about a half-filled one.
 *
 * That lands on the Tuesday after: the Sunday is editable through Monday, and
 * stops being so on Tuesday. Written against `isEditableDay` rather than as
 * its own arithmetic, so changing the horizon moves both together.
 */
export function isSealable(weekStart: Date, today: Date): boolean {
  const lastDay = toKey(addDays(weekStart, 6))
  const todayKey = toKey(today)
  // Over first, out of reach second. `isEditableDay` says no to a *future*
  // day as well as to an old one, so without this the week you are currently
  // living in would seal — and pay out — on its first day.
  if (lastDay >= todayKey) return false
  return !isEditableDay(lastDay, todayKey)
}

/** The week whose verdict has not been written yet — what is still in play. */
export interface OpenWeek {
  weekStart: DayKey
  /** What it would earn if it sealed as it stands right now. */
  wouldEarn: boolean
  /** The day it stops being editable, which is the day it seals. */
  sealsOn: DayKey
}

export interface FreezeLedger {
  /** Verdicts that should exist but do not yet — write these, once. */
  pending: WeekVerdict[]
  /**
   * Weeks still open, newest first. Not a number anyone can spend — it is the
   * answer to "my week is green, where is my freeze", which the ledger used to
   * keep entirely to itself.
   */
  open: OpenWeek[]
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

  const open: OpenWeek[] = []
  if (firstKey && settings.goalsEnabled !== false && accountingStart) {
    const from = startOfWeek(
      accountingStart > fromKey(firstKey) ? accountingStart : fromKey(firstKey),
    )
    let w = from
    for (; isSealable(w, today); w = addDays(w, 7)) {
      const wk = toKey(w)
      if (weekVerdicts[wk]) continue
      pending.push({
        weekKey: wk,
        earned: weekEarned(w, days, settings, slots, todayKey, weekIgnore),
        sealedAt: new Date().toISOString(),
      })
    }
    // Whatever the loop stopped on is the first week still open, plus this one
    // if they differ. Two at most — the horizon is a day, so nothing older can
    // still be in play.
    for (const s2 of [w, addDays(w, 7)]) {
      if (s2 > startOfWeek(today)) break
      open.push({
        weekStart: toKey(s2),
        wouldEarn: weekEarned(s2, days, settings, slots, todayKey, weekIgnore),
        // The day after the last editable day of that week.
        sealsOn: toKey(addDays(s2, 6 + EDIT_HORIZON_DAYS + 1)),
      })
    }
  }

  const all = [...Object.values(weekVerdicts), ...pending]
  const earned = all.filter((v) => v.earned).length
  const spent = Object.values(days).filter((d) => d.frozen).length
  const raw = earned - spent
  return {
    pending,
    open: open.reverse(),
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
  // The same window again: a freeze can only be put on a day you could still
  // be editing, because a sealed week's verdict is already written.
  return isEditableDay(toKey(date), todayKey)
}
