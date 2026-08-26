/* ---------------------------------------------------------------
   The balance — `spec 010`, part 4.

   A streak resets to zero, and that is the whole source of its power: "20" is
   frightening to lose only because tomorrow it is either 21 or nothing. But it
   leaves one hole that nothing else covers — **the day after it breaks costs
   nothing.** Zero minus zero. The most dangerous stretch is not the slip, it
   is the week that follows it, and a streak has nothing to say about that
   week.

   So a second counter runs beside it, with a different job. A kept day pays
   **points**, a missed day takes them, and it never resets. The streak is
   fear; this is the account.

   **Points, not "kept days", and the rename is a correction rather than a
   coat of paint.** They shared a name and an argument: pricing in the unit the
   streak counts was supposed to stop a second economy existing, because the
   currency *was* the promise. In practice it made two completely different
   numbers wear one name. `keptDays` is a **run** — it resets to nought the
   moment you break it, and it is never spent. This is an **account** — it
   accumulates, it goes negative, and it is the only figure here you can spend.
   Calling both "kept days" produced exactly the confusion you would expect:
   *we mark days with the streak, and then somehow they get spent.* They are
   not the same days. They were never the same days.

   The old worry does not survive the split either. A second economy is
   dangerous when it can be played off against the promise, and points cannot
   be: they are minted by the day's verdict and by nothing else, at a rate that
   is not a setting. What the rename buys is that the thing you spend stops
   pretending to be the thing you are guarding.

   **It goes negative.** A floor at zero would mean that after a bad enough
   month, a bad day is free again — which is the hole this exists to close.

   **A ledger, not a recomputation.** A day's mark is written once, when the
   day leaves the editing window, and never revisited. This is the only figure
   in the app you can *spend*, so editing yesterday must not be able to change
   a balance a purchase was already priced against. Today and yesterday are
   therefore visible but not yet counted.

   **A kept day is `+10`; a missed day is `−20`.** It was symmetric at first,
   on the grounds that a symmetric rate keeps the shop reachable for anyone
   above half — which is true, and was the wrong thing to optimise: a reward
   you can reach while keeping barely half your promises is a reward that says
   half is enough. What matters is the **ratio**, not either number: at two to
   one the account grows above a **two-thirds** keep rate.

   The tens are so the ratio has somewhere to move. At `+1` the only
   asymmetries expressible were whole multiples of a day.

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
export const KEPT_VALUE = 10

/**
 * What a missed day takes.
 *
 * **Twice what a day pays**, so the account grows only above a **two-thirds**
 * keep rate. It was three times, and break-even sat at 75%; loosening it to
 * two is a deliberate choice about how hard the shop should be to reach, and
 * the figure to watch when changing it is that ratio rather than either number
 * on its own.
 *
 * The tens are what make the ratio adjustable at all. At `+1` the only
 * asymmetries available were whole multiples — 1:2, 1:3 — and a scale with
 * room under it can say 10:15 as easily as 10:20.
 */
export const MISSED_COST = 20

export interface Balance {
  /** What is left to spend: every sealed mark, less everything bought. */
  total: number
  /** The marks alone, before anything was taken out. */
  earned: number
  /** Points already spent in the shop. */
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
