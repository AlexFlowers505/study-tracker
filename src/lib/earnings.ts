/* ---------------------------------------------------------------
   Where the account came from, day by day — `spec 016`, part 4.

   The balance already says what you have. What it cannot say is *how it got
   there*, and on a bad month that is the more useful question: a total of
   forty is a very different month depending on whether it is eight good weeks
   and one catastrophe or a steady slide.

   **Read off `dayLedger`, never recomputed.** Each finished day carries one
   mark, written once when it left the writing window. That is the whole point
   of the ledger — the one figure in this app you can *spend* must not move
   because you edited a Tuesday — so this reads the marks and does arithmetic
   on nothing else.

   **Bucketed, because a year is 365 bars.** Days up to a month, weeks in a
   quarter, months beyond it — the same thinning `Heatmap` applies to a long
   period, and for the same reason. The caption says which, without it a `−60`
   bar in the year view reads as one catastrophic day rather than as a quiet
   month with three misses.
--------------------------------------------------------------- */

import type { DayKey, Project } from "../types/model"
import { KEPT_VALUE, MISSED_COST } from "./balance"
import { addDays, fromKey, monthLabel, startOfWeek, toKey } from "./date"

/** How wide one bar is. Chosen from the range, never asked for. */
export type EarningStep = "day" | "week" | "month"

export interface EarningBar {
  /** The bucket's own key — a day, a Monday, or `YYYY-MM`. */
  key: string
  label: string
  /** Points, signed. Up is a day that paid, down is one that took. */
  value: number
  kept: number
  missed: number
}

/**
 * Which step a range wants.
 *
 * Thresholds rather than the period id: the account panel follows the period
 * bar, and a custom range of forty days should read like a month rather than
 * like whatever pill happens to be lit.
 */
export const stepFor = (days: number): EarningStep =>
  days <= 31 ? "day" : days <= 100 ? "week" : "month"

/** What the caption says, so a bar is never read as the wrong size of thing. */
export const STEP_CAPTION: Record<EarningStep, string> = {
  day: "by day",
  week: "by week",
  month: "by month",
}

const bucketOf = (key: DayKey, step: EarningStep): string =>
  step === "day"
    ? key
    : step === "week"
      ? toKey(startOfWeek(fromKey(key)))
      : key.slice(0, 7)

const labelOf = (bucket: string, step: EarningStep): string => {
  // A month bucket is `YYYY-MM`; `fromKey` wants a day, so it gets the first.
  if (step === "month") return monthLabel(fromKey(`${bucket}-01`))
  const d = fromKey(bucket)
  const said = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`
  return step === "day" ? said : `w/c ${said}`
}

/**
 * The marks in a range, folded into bars.
 *
 * **Every bucket in the range appears**, including the empty ones. A gap in a
 * bar chart is a period you did not log; a missing bucket is a period the
 * chart pretends did not happen, and the two look identical once the bars are
 * side by side.
 */
export function earningBars(
  project: Project,
  from: Date,
  to: Date,
  step: EarningStep,
): EarningBar[] {
  const ledger = project.dayLedger || {}
  const bars = new Map<string, EarningBar>()

  for (let d = new Date(from); toKey(d) <= toKey(to); d = addDays(d, 1)) {
    const key = toKey(d)
    const bucket = bucketOf(key, step)
    const bar =
      bars.get(bucket) ??
      ({ key: bucket, label: labelOf(bucket, step), value: 0, kept: 0, missed: 0 })
    const mark = ledger[key]
    if (mark) {
      if (mark.kept) {
        bar.kept += 1
        bar.value += KEPT_VALUE
      } else {
        bar.missed += 1
        bar.value -= MISSED_COST
      }
    }
    bars.set(bucket, bar)
  }
  return [...bars.values()]
}

/** One thing that moved the account other than a day. */
export interface AccountEvent {
  id: string
  at: string
  label: string
  /** Signed, so the list reads the same way the bars do. */
  points: number
  kind: "reward" | "purchase"
}

/**
 * Achievements paid and rewards taken, newest first.
 *
 * **Not marks on the chart.** They are not earnings-by-day; they are events,
 * and a spike on a bar chart that is one purchase rather than one terrible
 * week is a chart that lies about its own axis. The shop already lists
 * purchases this way.
 */
export function accountEvents(project: Project): AccountEvent[] {
  const rewards: AccountEvent[] = Object.values(project.earned || {})
    .filter((e) => (Number(e.reward) || 0) > 0)
    .map((e) => ({
      id: `earned-${e.achievementId}`,
      at: e.earnedAt,
      label:
        (project.settings.achievements || []).find(
          (a) => a.id === e.achievementId,
        )?.label || "an achievement",
      points: Number(e.reward) || 0,
      kind: "reward" as const,
    }))
  const bought: AccountEvent[] = Object.values(project.purchases || {}).map(
    (p) => ({
      id: `bought-${p.id}`,
      at: p.boughtAt,
      label: p.label,
      points: -(Number(p.price) || 0),
      kind: "purchase" as const,
    }),
  )
  return [...rewards, ...bought].sort((a, b) => (a.at < b.at ? 1 : -1))
}
