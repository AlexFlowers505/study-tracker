/* ---------------------------------------------------------------
   Achievements — `spec 010`, part 5.

   Everything else here is built on fear: a streak is what you lose, a red day
   is what you avoid, the balance is what a bad week costs. That works, and it
   is one-sided. **An achievement cannot be taken away**, and it is the only
   reason the history is worth having accumulated rather than merely survived.

   Three things make it honest rather than decorative:

   **Few, and written by you.** A generated 30/60/100 ladder across five rules
   is thirty achievements, which is the dilution problem wearing a rosette. The
   sources are a short list for the same reason — every one is a number the app
   already computes, and a wider list would turn the editor into a second rule
   builder.

   **Earned once, with its date, never recomputed.** The same ledger rule as
   the verdicts and the day marks. What was reached was reached; editing the
   past cannot un-reach it, and cannot re-mint it either.

   **Its own ledger, not `settings`.** The hand that edits the definitions must
   not be the hand that edits what was earned.
--------------------------------------------------------------- */

import type {
  Achievement,
  EarnedAchievement,
  Project,
  StreakTarget,
} from "../types/model"
import { ruleStatus, streakContext, targetInfo } from "./customStreaks"
import type { StreakContext } from "./customStreaks"
import { keptDays } from "./dayVerdict"
import { dayCounters, unitDayTotal } from "./counters"
import { entryActivity } from "./entries"
import { fmtHours } from "./time"
import { toKey } from "./date"

/** Everything a target ever gathered, in whatever it is measured in. */
function totalFor(
  project: Project,
  target: StreakTarget,
  ctx: StreakContext,
): number {
  const info = targetInfo(target, ctx)
  const days = Object.values(project.days)

  if (info.measure === "time") {
    const keep = (id: string) =>
      target.kind === "time"
        ? true
        : target.kind === "activity"
          ? id === target.id
          : ctx.activities.some(
              (a) => a.id === id && a.categoryId === target.id,
            )
    return days.reduce((sum, day) => {
      const cells = day.cells
      if (!cells) return sum
      return (
        sum +
        Object.values(cells)
          .flat()
          .reduce(
            (inner, e) =>
              keep(String(entryActivity(e)))
                ? inner + (Number(e.minutes) || 0)
                : inner,
            0,
          )
      )
    }, 0)
  }

  const unitIds = ctx.units
    .filter((u) =>
      target.kind === "unit"
        ? u.id === target.id
        : target.kind === "tag"
          ? (u.tagIds || []).includes(target.id || "")
          : u.categoryId === target.id,
    )
    .map((u) => u.id)
  return days.reduce(
    (sum, day) =>
      sum +
      unitIds.reduce(
        (inner, id) => inner + unitDayTotal(dayCounters(day), id),
        0,
      ),
    0,
  )
}

/** Where this achievement stands right now. */
export function progressOf(
  project: Project,
  achievement: Achievement,
  today = new Date(),
): number {
  const { source } = achievement
  if (source.kind === "keptDays") return keptDays(project, today)?.current ?? 0
  if (source.kind === "ruleStreak") {
    const rule = (project.settings.streakRules || []).find(
      (r) => r.id === source.ruleId,
    )
    if (!rule) return 0
    return ruleStatus(rule, project, today).current
  }
  return totalFor(project, source.target, streakContext(project))
}

/** Minutes or occurrences — decides how the figure and the goal are printed. */
export function measureOf(
  project: Project,
  achievement: Achievement,
): "time" | "count" {
  const { source } = achievement
  if (source.kind !== "total") return "count"
  return targetInfo(source.target, streakContext(project)).measure
}

export const fmtProgress = (n: number, measure: "time" | "count"): string =>
  measure === "time" ? fmtHours(n) : String(n)

/**
 * The local day an achievement was earned on.
 *
 * `earnedAt` is an instant in UTC, and slicing the first ten characters off it
 * is a day in UTC — which is the wrong day for anything logged in the evening
 * west of Greenwich or after midnight east of it. Every date in this app is a
 * local one on purpose; this is how the instant becomes one.
 */
export const earnedOn = (earnedAt: string): string =>
  toKey(new Date(earnedAt))

/**
 * The achievements reached but not yet written — write these, once.
 *
 * Returns rather than writes, exactly as `dueMarks` and `ruleStatus` do: the
 * caller owns persistence, and an earned achievement is written a single time.
 */
export function dueAchievements(
  project: Project,
  today = new Date(),
): EarnedAchievement[] {
  const earned = project.earned || {}
  const at = new Date().toISOString()
  return (project.settings.achievements || [])
    .filter((a) => !earned[a.id])
    .map((a) => ({ a, value: progressOf(project, a, today) }))
    .filter(({ a, value }) => a.threshold > 0 && value >= a.threshold)
    .map(({ a, value }) => ({ achievementId: a.id, earnedAt: at, value }))
}

/* ---- The lock ------------------------------------------------------------ */

/**
 * Can it be proved this edit cannot make the achievement easier?
 *
 * The same one-sided test the rules use, and for the same reason: a change
 * that cannot be classified waits rather than being guessed at. Changing what
 * is counted is incomparable — a hundred hours of lessons and a hundred gym
 * visits are not two points on one scale — so it waits.
 */
export const achievementNarrows = (
  prev: Achievement,
  next: Achievement,
): boolean =>
  JSON.stringify(prev.source) === JSON.stringify(next.source) &&
  next.threshold >= prev.threshold

export interface AchievementEdit {
  changed: boolean
  narrowing: boolean
  /** Still the day it was written: anything goes and nothing starts the clock. */
  settingUp: boolean
  allowed: boolean
  next: Achievement
}

const terms = (a: Achievement) =>
  JSON.stringify({ source: a.source, threshold: a.threshold })

/** The same shape as `ruleEdit`, down to the grace day. */
export function achievementEdit(
  prev: Achievement,
  draft: Achievement,
  lockDays: number,
  today = new Date(),
): AchievementEdit {
  const todayKey = toKey(today)
  const changed = terms(prev) !== terms(draft)
  const narrowing = achievementNarrows(prev, draft)
  const settingUp = todayKey === prev.createdOn
  const base = { changed, narrowing, settingUp }
  if (!changed) return { ...base, narrowing: true, allowed: true, next: draft }
  if (narrowing || settingUp) return { ...base, allowed: true, next: draft }
  const allowed = todayKey >= prev.lockedUntil
  const unlock = new Date(today)
  unlock.setDate(unlock.getDate() + lockDays)
  return {
    ...base,
    allowed,
    next: allowed ? { ...draft, lockedUntil: toKey(unlock) } : prev,
  }
}

/** A fresh definition. `EditableList` supplies the name, colour and icon. */
export const newAchievement = (
  today: Date,
): Omit<Achievement, "id" | "label" | "color" | "iconName"> => ({
  source: { kind: "keptDays" },
  threshold: 30,
  createdOn: toKey(today),
  lockedUntil: toKey(today),
})
