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

import type { Project, StreakClause, StreakRule } from "../types/model"
import type { StreakContext } from "./customStreaks"
import {
  boundsOnWeekday,
  clauseTarget,
  clauseWeekdays,
  ruleClauses,
  streakContext,
  targetMeasure,
} from "./customStreaks"
import { WEEKDAY_ORDER } from "./date"

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
  if (rule.scope === "week")
    return "A weekly rule has no figure for a single day."

  const clauses = ruleClauses(rule)

  for (const clause of clauses) {
    if (targetMeasure(clauseTarget(clause), ctx) !== "time")
      return "Only a rule that counts time; this one counts occurrences."
    // Every weekday it judges has to name a floor. A day with only a ceiling
    // has nothing to aim at, and a goal line with a hole in it is worse than
    // no goal line.
    const judged = clauseWeekdays(clause)
    if (judged.some((wd) => boundsOnWeekday(clause, ctx, wd).min === undefined))
      return "Only floors — a ceiling is not something to aim at."
  }

  for (const weekday of WEEKDAY_ORDER) {
    if (clauses.filter((clause) => covers(clause, weekday)).length > 1)
      return "Two of its conditions land on the same weekday, so there is no single figure for that day."
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
  const clauses = ruleClauses(rule)

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
