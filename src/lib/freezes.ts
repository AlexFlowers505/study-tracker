/* ---------------------------------------------------------------
   The editing horizon, and the week that follows from it.

   This file was the goal streak: its day and week states, its freeze ledger,
   its cap, and the rule that lowering the weekly bar forfeits that week's
   reward. `spec 010` dissolved that streak into an ordinary rule — the day's
   colour is now a verdict over every rule with a vote (`lib/dayVerdict.ts`)
   and freezes are per rule (`lib/customStreaks.ts`).

   What is left is the thing all of it rested on and none of it owned: **the
   log can be written for today and yesterday, and nothing else.** Every other
   window in the app is derived from that one, which is why they cannot drift.
--------------------------------------------------------------- */

import { WEEKDAY_ORDER, addDays, fromKey, toKey } from "./date"
import type { DayKey } from "../types/model"

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

/**
 * Total minutes a full week asks for, across the seven per-weekday goals.
 *
 * Lives here because it is a fact about the goal rather than about any rule
 * that happens to read it — Setup prints it beside the seven fields so the
 * week's total is visible while you are editing a day of it.
 */
export function weeklyGoalTotal(dailyGoals: Record<number, number>): number {
  return WEEKDAY_ORDER.reduce((sum, wd) => sum + (dailyGoals[wd] || 0), 0)
}
