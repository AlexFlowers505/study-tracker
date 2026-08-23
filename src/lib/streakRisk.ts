/* ---------------------------------------------------------------
   Which streaks are actually in trouble — `spec 010`, part 3.

   The row used to draw every streak the same size and at the same volume, all
   the time. At any given moment the number genuinely at risk is zero, one,
   occasionally two, and five equal chips are exactly what makes each of them
   matter less: a row where everything shouts is a dashboard, and a dashboard
   gets inspected rather than feared.

   So this sorts them, and it answers one question per streak: **is there
   something you could still do about it?**

   - `danger` — it is already broken, or it can no longer be reached. A freeze
     is the only thing left, and only for as long as the day stays writable.
   - `warning` — still fixable today, by doing the thing.
   - `safe` — nothing to say, and it should therefore say nothing.

   Weekly rules are the interesting case, because a week's verdict does not
   exist until the week ends. What does exist every day is **how much is left
   against how many days are left**, and that is enough to be useful on Friday
   rather than on Sunday: "gym 1 of 3, two days left" is a rule already lost,
   and saying so on Sunday is saying it when you can no longer act.

   That reachability test is the first piece of `spec 010` part 2 — the full
   version colours every day rather than only the streak row.
--------------------------------------------------------------- */

import type { Day, DayKey, Project, StreakRule } from "../types/model"
import type { ClauseReading, RuleStatus, StreakContext } from "./customStreaks"
import {
  clauseTarget,
  freezeOffer,
  readDay,
  readWeek,
  ruleDayState,
  ruleWeekState,
  streakContext,
  targetInfo,
} from "./customStreaks"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "./date"
import { canFreeze, dayState } from "./freezes"
import { fmtHours } from "./time"

export type RiskLevel = "danger" | "warning" | "safe"

/** Where a streak stands right now, and what is still worth doing about it. */
export interface StreakRisk {
  /** `"main"` for the goal streak, otherwise the rule's id. */
  id: string
  level: RiskLevel
  /** What has gone wrong, in the rule's own vocabulary. Absent when safe. */
  headline?: string
  /** What it costs to save it, or what would fix it. */
  detail?: string
  /** The day a freeze would go on, while one still can. */
  freezeDay?: DayKey
}

const RANK: Record<RiskLevel, number> = { danger: 0, warning: 1, safe: 2 }

/** Most urgent first; ties keep the order they were given in. */
export const byRisk = (a: StreakRisk, b: StreakRisk) =>
  RANK[a.level] - RANK[b.level]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const freezes = (n: number) =>
  `${plural(n, "freeze")} ${n === 1 ? "covers" : "cover"} it`

/**
 * How long the run would be if this day were kept.
 *
 * The number worth printing when yesterday is already broken. `status.current`
 * is no use there: the streak has *already* reset, so it counts from today and
 * says "1 day at stake" about a nineteen-day run. What a freeze buys is the
 * run that ended yesterday, so that is what gets counted — backwards from the
 * day before, stopping where the rule started judging.
 */
function runIfKept(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  dayKey: DayKey,
  todayKey: DayKey,
): number {
  let run = 1
  for (let d = addDays(fromKey(dayKey), -1); toKey(d) >= rule.startedOn; d = addDays(d, -1)) {
    const key = toKey(d)
    const state = ruleDayState(rule, ctx, days[key], key, todayKey)
    if (state === "unjudged") continue
    if (state !== "met" && state !== "frozen") break
    run += 1
  }
  return run
}

/**
 * The conditions that fell short, said in their own measure.
 *
 * Each condition prints in the unit it is counted in — a compound rule can
 * hold one about hours and one about slips, and a shared format would be wrong
 * for one of them.
 */
function shortfall(readings: ClauseReading[], ctx: StreakContext): string {
  return readings
    .filter((r) => r.applies && r.deficit > 0)
    .map((r) => {
      const info = targetInfo(clauseTarget(r.clause), ctx)
      const fmt = (n: number) =>
        info.measure === "time" ? fmtHours(n) : String(n)
      if (info.check)
        return `${info.label} is ${r.skipped ? "skipped" : "not what you asked"}`
      const limit = r.clause.op === "atMost" ? "at most" : "at least"
      return `${info.label} ${fmt(r.value)} against ${limit} ${fmt(r.clause.value)}`
    })
    .join(" · ")
}

/** How much of this condition is still owed, in its own unit. */
const owed = (r: ClauseReading): number =>
  r.clause.op === "atLeast" ? Math.max(0, r.clause.value - r.value) : 0

/**
 * A rule that judges a week, read against the days it has left.
 *
 * A count is assumed to happen **at most once a day** — three gym trips in one
 * afternoon is technically possible and is not what anybody means by "three
 * times a week", so a rule needing three with two days left is treated as
 * lost. Time has no such ceiling, so it is judged against a straight pro-rata
 * pace instead.
 */
function weeklyRisk(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  today: Date,
  todayKey: DayKey,
): RiskLevel {
  const weekStart = startOfWeek(today)
  const state = ruleWeekState(rule, ctx, days, weekStart, todayKey)
  if (state === "missed") return "danger"
  if (state === "met" || state === "frozen" || state === "unjudged") return "safe"

  const readings = readWeek(rule, ctx, days, weekStart, todayKey)
  const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length

  let level: RiskLevel = "safe"
  const worse = (next: RiskLevel) => {
    if (RANK[next] < RANK[level]) level = next
  }

  readings.forEach((r) => {
    if (!r.applies) return
    // An "at most" week is broken the moment it is exceeded — there is no
    // doing less of something you have already done.
    if (r.clause.op === "atMost" && r.deficit > 0) return worse("danger")
    const need = owed(r)
    if (need <= 0) return
    const info = targetInfo(clauseTarget(r.clause), ctx)
    if (info.measure === "count") {
      if (need > remaining) return worse("danger")
      // Every remaining day now has to carry one. Still possible, barely.
      if (need >= remaining) return worse("warning")
      return
    }
    if (remaining === 0) return worse("danger")
    // Behind the straight line from here to Sunday.
    if (need > r.clause.value * (remaining / 7)) return worse("warning")
  })

  return level
}

/** One custom rule's standing. */
export function ruleRisk(
  status: RuleStatus,
  project: Project,
  today = new Date(),
): StreakRisk {
  const { rule } = status
  const ctx = streakContext(project)
  const todayKey = toKey(today)
  const days = project.days
  const id = rule.id

  if (rule.scope === "week") {
    const level = weeklyRisk(rule, ctx, days, today, todayKey)
    if (level === "safe") return { id, level }
    const weekStart = startOfWeek(today)
    const readings = readWeek(rule, ctx, days, weekStart, todayKey)
    const offer = freezeOffer(rule, project, todayKey, todayKey, status)
    const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length
    return {
      id,
      level,
      headline: shortfall(readings, ctx) || "this week is short",
      detail:
        level === "danger"
          ? offer.ok
            ? `Out of reach — the whole week takes ${plural(offer.cost, "freeze")}`
            : "Out of reach, and there are not enough freezes to cover it"
          : `${plural(remaining, "day")} left, and every one of them has to count`,
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  const yesterdayKey = toKey(addDays(today, -1))
  const yState = ruleDayState(rule, ctx, days[yesterdayKey], yesterdayKey, todayKey)
  // Yesterday first: it is the one with a deadline. Today can still be fixed
  // by doing the thing, which is always the better answer than a freeze.
  if (yState === "missed") {
    const offer = freezeOffer(rule, project, yesterdayKey, todayKey, status)
    const readings = readDay(rule, ctx, days[yesterdayKey], yesterdayKey, todayKey)
    const restores = runIfKept(rule, ctx, days, yesterdayKey, todayKey)
    return {
      id,
      level: "danger",
      headline: `Yesterday — ${shortfall(readings, ctx)}`,
      detail: offer.ok
        ? `${freezes(offer.cost)} · keeps ${plural(restores, "day")} · ${offer.available} available`
        : offer.cost > 0
          ? `${plural(restores, "day")} lost · ${plural(offer.cost, "freeze")} needed and you have ${offer.available}`
          : "Out of the writing window — nothing left to do",
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  const tState = ruleDayState(rule, ctx, days[todayKey], todayKey, todayKey)
  if (tState === "pending") {
    const readings = readDay(rule, ctx, days[todayKey], todayKey, todayKey)
    const offer = freezeOffer(rule, project, todayKey, todayKey, status)
    return {
      id,
      level: "warning",
      headline: `Today — ${shortfall(readings, ctx)}`,
      detail: `${plural(status.current, "day")} at stake · the day is not over`,
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  return { id, level: "safe" }
}

/**
 * The goal streak's standing.
 *
 * Temporary in the sense that `spec 010` part 1 dissolves this streak into an
 * ordinary rule; until then it is assessed on its own terms so the row can be
 * complete.
 */
export function mainRisk(
  project: Project,
  balance: number,
  currentDays: number,
  today = new Date(),
): StreakRisk {
  const { days, slots, settings } = project
  const todayKey = toKey(today)
  const yesterday = addDays(today, -1)
  const yesterdayKey = toKey(yesterday)
  const id = "main"

  const yState = dayState(days[yesterdayKey], yesterday, settings, slots, todayKey)
  if (yState === "missed") {
    const can = canFreeze(yesterday, days[yesterdayKey], settings, slots, today, balance)
    return {
      id,
      level: "danger",
      headline: "Yesterday fell short of its goal",
      detail: can
        ? `A freeze covers it · ${balance} banked`
        : balance > 0
          ? "Out of the writing window — nothing left to do"
          : "No freezes banked",
      freezeDay: can ? yesterdayKey : undefined,
    }
  }

  const tState = dayState(days[todayKey], today, settings, slots, todayKey)
  if (tState === "pending") {
    const can = canFreeze(today, days[todayKey], settings, slots, today, balance)
    return {
      id,
      level: "warning",
      headline: "Today is short of its goal",
      detail: `${plural(currentDays, "day")} at stake · the day is not over`,
      freezeDay: can ? todayKey : undefined,
    }
  }

  return { id, level: "safe" }
}
