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
   - `warning` — still fixable, and the time to fix it is running out.
   - `safe` — nothing to say, and it should therefore say nothing.

   **Loud when acting is urgent, not merely possible.** That distinction is the
   whole difference between this and the row it replaced. "At least three hours"
   is unmet at nine in the morning and that is not news — it is the ordinary
   state of every day before you have done anything, and a row that says so is
   back to shouting. So an unmet *at least* is measured against the time left
   in the day, exactly as a weekly rule is measured against the days left in
   the week.

   An *at most* that has been exceeded is the opposite case and jumps straight
   to `danger`: you cannot un-watch the video, so no amount of doing fixes it
   and only a freeze is left.

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
  clauseLimit,
  clauseTarget,
  freezeOffer,
  readDay,
  readWeek,
  ruleDayState,
  ruleWeekState,
  weekLostOn,
  streakContext,
  targetInfo,
} from "./customStreaks"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "./date"
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
function shortfall(
  readings: ClauseReading[],
  ctx: StreakContext,
  dayKey: DayKey,
): string {
  return readings
    .filter((r) => r.applies && r.deficit > 0)
    .map((r) => {
      const info = targetInfo(clauseTarget(r.clause), ctx)
      const fmt = (n: number) =>
        info.measure === "time" ? fmtHours(n) : String(n)
      if (info.check)
        return r.skipped
          ? `${info.label} is skipped`
          : r.clause.op === "atLeast"
            ? `${info.label} is not yes yet`
            : `${info.label} is already yes`
      const word = r.clause.op === "atMost" ? "at most" : "at least"
      // The *resolved* limit, not `clause.value`. A condition reading the
      // daily goal keeps a placeholder there, and printing it says "0m
      // against at least 0m" about a day that was three hours short.
      return `${info.label} ${fmt(r.value)} against ${word} ${fmt(
        clauseLimit(r.clause, ctx, dayKey),
      )}`
    })
    .join(" · ")
}

/** Minutes between now and midnight — what is left to act in. */
const minutesLeftToday = (now: Date) =>
  24 * 60 - (now.getHours() * 60 + now.getMinutes())

/** Past this much of the day gone, an unmet count starts to matter. */
const EVENING_MINUTES = 6 * 60

/** How much of this condition is still owed, in its own unit. */
const owed = (r: ClauseReading): number =>
  r.clause.op === "atLeast" ? Math.max(0, r.clause.value - r.value) : 0

/**
 * How much trouble today is in, condition by condition.
 *
 * An exceeded *at most* is already spent and can only be frozen. An unmet *at
 * least* is judged against the hours left: needing two of the three hours you
 * have left is worth saying, and needing two of the twelve you have left is
 * the ordinary shape of a morning.
 */
function todayUrgency(
  readings: ClauseReading[],
  ctx: StreakContext,
  now: Date,
): { level: RiskLevel; spent: boolean } {
  const left = minutesLeftToday(now)
  let level: RiskLevel = "safe"
  // Whether the damage is already done, as opposed to merely running late.
  // The two are different sentences: one cannot be undone, the other cannot
  // be reached, and telling someone the wrong one is telling them to give up
  // when they could still act.
  let spent = false
  const worse = (next: RiskLevel) => {
    if (RANK[next] < RANK[level]) level = next
  }

  readings.forEach((r) => {
    if (!r.applies || r.deficit === 0) return
    if (r.clause.op === "atMost") {
      spent = true
      return worse("danger")
    }
    const need = owed(r)
    if (need <= 0) return
    const info = targetInfo(clauseTarget(r.clause), ctx)
    if (info.measure === "time" && !info.check) {
      if (need > left) return worse("danger")
      // More than half of what is left would have to go on this one thing.
      if (need * 2 > left) return worse("warning")
      return
    }
    // A count or a check has no rate to fall behind, so the day itself is the
    // clock: nothing to say until the evening.
    if (left <= EVENING_MINUTES) return worse("warning")
  })

  return { level, spent }
}

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

  // "Lost" has exactly one definition and it lives in `weekLostOn`, because
  // the day verdict is built on it too and a row that disagreed with the
  // colour of the day would be worse than no row.
  if (weekLostOn(rule, ctx, days, weekStart, todayKey)) return "danger"

  const readings = readWeek(rule, ctx, days, weekStart, todayKey)
  const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length

  let level: RiskLevel = "safe"
  const worse = (next: RiskLevel) => {
    if (RANK[next] < RANK[level]) level = next
  }

  // Still winnable, so the only question left is whether it is getting tight.
  readings.forEach((r) => {
    if (!r.applies) return
    const need = owed(r)
    if (need <= 0) return
    const info = targetInfo(clauseTarget(r.clause), ctx)
    // Every remaining day now has to carry one. Still possible, barely.
    if (info.measure === "count") {
      if (need >= remaining) worse("warning")
      return
    }
    // Behind the straight line from here to Sunday.
    if (need > r.clause.value * (remaining / 7)) worse("warning")
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
      headline: shortfall(readings, ctx, todayKey) || "this week is short",
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
      headline: `Yesterday — ${shortfall(readings, ctx, yesterdayKey)}`,
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
    const { level, spent } = todayUrgency(readings, ctx, today)
    if (level === "safe") return { id, level }
    const offer = freezeOffer(rule, project, todayKey, todayKey, status)
    const restores = runIfKept(rule, ctx, days, todayKey, todayKey)
    const lost = spent ? "Nothing undoes it" : "No longer reachable today"
    return {
      id,
      level,
      headline: `Today — ${shortfall(readings, ctx, todayKey)}`,
      detail:
        level === "danger"
          ? offer.ok
            ? `${lost} · ${freezes(offer.cost)} and keeps ${plural(restores, "day")}`
            : `${lost} · ${plural(offer.cost, "freeze")} needed and you have ${offer.available}`
          : `${plural(restores, "day")} at stake · the day is running out`,
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  return { id, level: "safe" }
}
