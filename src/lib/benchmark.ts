/* ---------------------------------------------------------------
   The benchmark — which rule supplies the day's goal.

   Every day card prints `goal 3h (1h 20m left)`, the daily chart draws a
   dashed line, and the heatmap shades against it. Those numbers came from
   `settings.dailyGoals`: seven figures with no rule behind them, set in a tab
   of their own, answerable to nothing. That was fine while the app had one
   hard-coded promise. It stopped being fine when every promise became a rule —
   a target nobody has promised anything about is a target, and the point of
   this app is that its numbers are promises.

   **So there is no goal without a rule.** Nominate nothing and no goal is
   drawn: no line on the cards, no dashed limit on the chart, no shading on the
   heatmap. Showing the last figures somebody typed into a tab that no longer
   exists would be worse than showing none — a target nobody can change and
   nobody promised.

   So one rule is nominated as the **benchmark**, and the figure it asks for is
   the figure the day is held up against. The word is deliberately not "pinned"
   or "key": those say how it got there and how much it matters, and neither is
   the job. A benchmark is the thing you measure against, which is exactly what
   that number does and all it does.

   **It changes no verdict.** Nominating a rule moves where a displayed figure
   is read from and nothing else: the rule judged what it judged, the others
   still judge what they judge, and the day's colour is the same composite it
   was. That is why it sits outside the lock and needs no written reason —
   there is nothing here that can be made easier.

   **Only a rule that measures time can be one**, and that is not a policy:
   `goalForDate` returns minutes and every reader of it is minutes all the way
   down. "Three gym trips" has no minutes to lend them.

   **One figure per weekday, from as many conditions as it takes.** A single
   condition was the first cut and it was too tight to be usable: real goals
   are not one number — three hours most days, ninety minutes on Thursday — and
   saying that takes two conditions. What actually matters is that no weekday
   is claimed twice, because two figures on one Tuesday is not a goal.
--------------------------------------------------------------- */

import type {
  Day,
  DayKey,
  Project,
  StreakClause,
  StreakRule,
  StudyEntry,
} from "../types/model"
import type { StreakContext } from "./customStreaks"
import {
  boundsOnWeekday,
  clauseTarget,
  clauseWeekdays,
  dayClauses,
  measuredOn,
  slotIdsOnWeekday,
  streakContext,
  targetMeasure,
  timeKeptBy,
} from "./customStreaks"
import type { IsIgnored } from "../types/model"
import { entryActivity } from "./entries"
import { fromKey, toKey } from "./date"
import { WEEKDAY_ORDER } from "./date"
import { t } from "./i18n"

/** Why a rule cannot be the benchmark, in the words the form should use. */
export type BenchmarkBar = string | null

/** Does this condition judge this weekday? */
const covers = (clause: StreakClause, weekday: number): boolean =>
  clauseWeekdays(clause).includes(weekday)

/**
 * Whether this rule could supply the day's goal, and if not, why not.
 *
 * Returns the obstacle rather than a boolean because the form has to say it
 * out loud: a switch that is quietly absent teaches nothing, and "why can't I
 * pick this one" has a short, true answer every time.
 */
export function benchmarkBar(
  rule: StreakRule,
  ctx: StreakContext,
): BenchmarkBar {
  /* **Its day-scoped conditions**, since `spec 025`. A rule may hold a
     weekly condition beside its daily ones — *three hours a day of the
     course, and at most four a week of one part of it* — and that weekly half
     has no figure for a single day and is not meant to have one. What would
     disqualify the rule is having no daily half at all. */
  const clauses = dayClauses(rule)
  if (!clauses.length)
    return t("A weekly rule has no figure for a single day.")

  for (const clause of clauses) {
    if (targetMeasure(clauseTarget(clause), ctx) !== "time")
      return t("Only a rule that counts time; this one counts occurrences.")
    // Every weekday it judges has to name a floor. A day with only a ceiling
    // has nothing to aim at, and a goal line with a hole in it is worse than
    // no goal line.
    const judged = clauseWeekdays(clause)
    if (judged.some((wd) => boundsOnWeekday(clause, ctx, wd).min === undefined))
      return t("Only floors — a ceiling is not something to aim at.")
  }

  for (const weekday of WEEKDAY_ORDER) {
    if (clauses.filter((clause) => covers(clause, weekday)).length > 1)
      return t(
      "Two of its conditions land on the same weekday, so there is no single figure for that day.",
    )
  }

  return null
}

export const canBenchmark = (rule: StreakRule, ctx: StreakContext): boolean =>
  benchmarkBar(rule, ctx) === null

/**
 * The nominated rule, if it still qualifies.
 *
 * Re-checked rather than trusted: a rule can be edited into something that no
 * longer qualifies — a second condition on the same day, the operator flipped
 * — and a goal line quietly going wrong is a worse failure than one that
 * disappears.
 */
export function benchmarkRule(
  project: Project,
  ctx: StreakContext = streakContext(project),
): StreakRule | null {
  const id = project.settings.benchmarkRuleId
  if (!id) return null
  const rule = (project.settings.streakRules || []).find((r) => r.id === id)
  if (!rule) return null
  return canBenchmark(rule, ctx) ? rule : null
}

/**
 * The seven per-weekday figures the benchmark asks for, in minutes.
 *
 * A weekday no condition covers asks for nothing, so "three hours on weekdays"
 * prints `goal 3h` Monday to Friday and no goal line at all on Saturday —
 * rather than a goal of zero, which reads as a promise already kept.
 *
 * There was a special case here for a condition that read the project's daily
 * goal — an identity rather than the cycle it looked like. `migrations/019`
 * wrote those figures into the conditions themselves, so there is nothing left
 * to special-case and this reads one thing from one place.
 */
export function benchmarkGoals(
  project: Project,
  ctx: StreakContext = streakContext(project),
): Record<number, number> | null {
  const rule = benchmarkRule(project, ctx)
  if (!rule) return null
  const clauses = dayClauses(rule)

  const goals: Record<number, number> = {}
  WEEKDAY_ORDER.forEach((weekday) => {
    const clause = clauses.find((x) => covers(x, weekday))
    // `useDailyGoal` is keyed on the weekday, so `ctx.dailyGoals` answers it
    // directly — there is no day to look up.
    goals[weekday] = clause
      ? (boundsOnWeekday(clause, ctx, weekday).min ?? 0)
      : 0
  })
  return goals
}

/**
 * **What the benchmark itself counted, over a stretch of days** — `spec 019`.
 *
 * The month grid printed a week's total study time beside its goal, and the
 * two were measured through different things: the goal came from the
 * benchmark rule, the total from *every minute logged, whatever it went on*.
 * So `12h of 15h` compared a figure one rule promised against a figure nobody
 * promised anything about — write an activity called *Did nothing*, put twenty
 * hours in it, and the week reports twenty hours of work.
 *
 * Measured through the rule that supplies the denominator, so `of` means
 * something. *Did nothing* is then simply not counted, and nothing has to be
 * excluded by hand — which is the part that matters, because an exclusion list
 * is a thing you have to remember to maintain.
 *
 * **Per day through the condition that covers that weekday**, not through the
 * first one: *three hours most days, ninety minutes on Thursday* is two
 * conditions, and they are allowed to name different activities.
 *
 * Null when nothing is nominated. Not zero, not a dash — the caller draws
 * nothing at all, the same silence `benchmarkGoals` keeps for the same reason.
 */
export function benchmarkMinutes(
  project: Project,
  dates: Date[],
  isIgnored: IsIgnored = () => false,
  ctx: StreakContext = streakContext(project),
): number | null {
  const meter = benchmarkMeter(project, ctx)
  if (!meter) return null

  let total = 0
  for (const date of dates) {
    const key = toKey(date)
    const day = project.days[key]
    // An ignored day contributes nothing, exactly as it contributes no goal.
    if (!day || isIgnored(key, day)) continue
    total += meter(key, day)
  }
  return total
}

/**
 * **One day, measured through the benchmark** — the same reading
 * `benchmarkMinutes` sums, handed out one day at a time.
 *
 * A factory rather than a plain function because the rule and its conditions
 * are found once and then asked about three hundred days: `benchmarkMinutes`
 * over a year was resolving the nominated rule three hundred times to get the
 * same answer.
 *
 * **Null when nothing is nominated**, which is the caller's cue to go on
 * totalling everything — there is no promise to measure through, so there is
 * nothing better to show. Every other reading in this file keeps the same
 * silence for the same reason.
 */
export function benchmarkMeter(
  project: Project,
  ctx: StreakContext = streakContext(project),
): ((dayKey: DayKey, day: Day | undefined) => number) | null {
  const rule = benchmarkRule(project, ctx)
  if (!rule) return null
  const clauses = dayClauses(rule)
  return (dayKey, day) => {
    if (!day) return 0
    const weekday = fromKey(dayKey).getDay()
    // **Per day through the condition that covers that weekday**, not through
    // the first one: *three hours most days, ninety minutes on Thursday* is
    // two conditions, and they may name different activities.
    const clause = clauses.find((x) => covers(x, weekday))
    if (!clause) return 0
    // The weekday's own slots, like every other reader — a condition can
    // restrict where the figure comes from differently on each day.
    return measuredOn(clause, ctx, day, slotIdsOnWeekday(clause, weekday))
  }
}

/**
 * **The days as the benchmark rule counted them** — every entry it does not
 * count dropped.
 *
 * `spec 022` measured the headline hours through the benchmark and stopped
 * there, on the argument that a total over every entry says how thorough the
 * log is rather than how the period went. Everything else on the analytics
 * half of the page still totalled the lot, so the same period reported `4h
 * 25m` in its header and `17h 5m` in the donut directly beneath it — and once
 * `spec 024` made a night an ordinary activity, three quarters of that donut
 * was sleep, filed under *where the time went* as though it were work.
 *
 * The argument does not stop at one figure. So it is applied where every
 * figure is read: one projection of `days`, filtered to the entries the
 * nominated rule counts, and the two donuts, the four Trends charts, the
 * averages and the extremes all follow without a line of their own — the same
 * trick `withBenchmarkGoals` and the count filter use, for the same reason.
 *
 * **Only the entries, and only the time.** `counters` and `checks` are left
 * exactly as they are: the benchmark is a promise about hours, and a tally is
 * not measured through it any more than it is measured in minutes.
 *
 * Null when nothing is nominated — the caller then goes on totalling
 * everything, which is the only answer there is, and says so.
 */
export function benchmarkDays(
  project: Project,
  ctx: StreakContext = streakContext(project),
): Record<DayKey, Day> | null {
  const rule = benchmarkRule(project, ctx)
  if (!rule) return null
  const clauses = dayClauses(rule)

  const out: Record<DayKey, Day> = {}
  for (const [key, day] of Object.entries(project.days)) {
    const weekday = fromKey(key).getDay()
    // A weekday the rule does not cover counts nothing, exactly as it asks
    // for nothing — the same silence `benchmarkGoals` keeps there.
    const clause = clauses.find((x) => covers(x, weekday))
    const keep = clause ? timeKeptBy(clause, ctx, weekday) : null
    const cells: Record<string, StudyEntry[]> = {}
    if (keep && day.cells)
      for (const [slotId, arr] of Object.entries(day.cells)) {
        const kept = arr.filter((e) =>
          keep(slotId, String(entryActivity(e) ?? "")),
        )
        if (kept.length) cells[slotId] = kept
      }
    out[key] = { ...day, cells }
  }
  return out
}

/**
 * The project as the page should read it: the benchmark's figures standing in
 * for `settings.dailyGoals`.
 *
 * Derived at the edge rather than threaded through `goalForDate`, which ten
 * files call. Those ten go on asking the same question of the same shape, and
 * get an answer with a promise behind it.
 *
 * **Never written back.** It is a projection, exactly like the count filter's:
 * every edit still closes over the stored project, so a derived figure can
 * never be saved over one somebody typed.
 */
export function withBenchmarkGoals(project: Project): Project {
  const goals = benchmarkGoals(project)
  return {
    ...project,
    settings: goals
      ? { ...project.settings, dailyGoals: goals, goalsEnabled: true }
      : // Nothing nominated, so nothing is claimed. `dailyGoals` is left in
        // storage as the record of what `019` read; it is simply not shown.
        { ...project.settings, dailyGoals: {}, goalsEnabled: false },
  }
}
