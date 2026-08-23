/* ---------------------------------------------------------------
   What a day came to, across every rule that gets a vote — `spec 010`, part 1.

   The app used to have one hard-coded promise (hours against a per-weekday
   goal) and colour every day by it. That worked while there was one, and broke
   the moment there were five: a day stopped having *one* verdict and got five,
   and five verdicts do not add up. **Fear does not divide** — a colour you
   have to assemble out of a row of chips is not a colour you avoid.

   So the day gets its single verdict back, and it is composed rather than
   hard-coded: **a day is kept when every participating rule that judged it
   held.** Which rules participate is yours to choose — that is what makes the
   app general, and what lets a project with no interest in hours-per-day still
   have a day worth keeping.

   **Binary, and deliberately.** Four rules out of five may be *drawn* as a ring
   one segment short of closed — honest, and it says which one you dropped —
   but here it is a miss. The moment four out of five almost counts, the
   verdict stops being a verdict.

   Freezes stay per rule. A day is saved when every rule that failed on it is
   separately frozen, and its price is the sum of theirs; this file needs no
   pool of its own and does no arithmetic about them.
--------------------------------------------------------------- */

import type { DayKey, GoalOutcome, Project, StreakRule } from "../types/model"
import type { RuleState, StreakContext } from "./customStreaks"
import { ruleDayState, streakContext } from "./customStreaks"
import { addDays, fromKey, toKey } from "./date"

/** The day's own standing, drawn wherever a day is drawn. */
export type DayVerdict = "kept" | "missed" | "frozen" | "pending" | "unjudged"

export interface RuleReading {
  rule: StreakRule
  state: RuleState
}

export interface DayReport {
  state: DayVerdict
  /** Every participating rule that had something to say, in the rule's order. */
  readings: RuleReading[]
  /** How many of them held, and how many spoke. The ring's two numbers. */
  kept: number
  judged: number
}

const NOTHING: DayReport = {
  state: "unjudged",
  readings: [],
  kept: 0,
  judged: 0,
}

/**
 * When this rule started having a vote.
 *
 * Falls back to `startedOn` for a rule written before the flag existed, which
 * is right: such a rule has judged from its own beginning and there is no
 * earlier history for it to reach back into.
 */
export const votesFrom = (rule: StreakRule): DayKey =>
  rule.inDayVerdictSince || rule.startedOn

/** Does this rule get a vote on this particular day? */
export const participates = (rule: StreakRule, dayKey: DayKey): boolean =>
  rule.inDayVerdict === true && dayKey >= votesFrom(rule)

/**
 * The rules with a vote on a day.
 *
 * **Daily rules only, for now.** A week has no verdict until it ends, so a
 * weekly rule has nothing to say about a Tuesday until `spec 010` part 2
 * gives it a notion of pace. Until then it keeps its own streak and stays out
 * of the day's.
 */
export const votersFor = (
  rules: StreakRule[],
  dayKey: DayKey,
): StreakRule[] =>
  rules.filter((r) => r.scope === "day" && participates(r, dayKey))

/**
 * One day, judged by everything that gets a vote on it.
 *
 * `ctx` is optional only so a single call site does not have to build one; the
 * walkers below pass theirs in, because rebuilding it per day over a year of
 * them is a great deal of garbage for no reason.
 */
export function dayReport(
  project: Project,
  dayKey: DayKey,
  todayKey: DayKey,
  ctx: StreakContext = streakContext(project),
): DayReport {
  const rules = votersFor(project.settings.streakRules || [], dayKey)
  if (!rules.length) return NOTHING

  const day = project.days[dayKey]
  const readings = rules
    .map((rule) => ({
      rule,
      state: ruleDayState(rule, ctx, day, dayKey, todayKey),
    }))
    .filter((r) => r.state !== "unjudged")

  if (!readings.length) return NOTHING

  const kept = readings.filter(
    (r) => r.state === "met" || r.state === "frozen",
  ).length
  const base = { readings, kept, judged: readings.length }

  // Missed beats pending: one rule already broken decides the day whatever the
  // others are still doing. Frozen is a kept day wearing the freeze colour, so
  // it is worked out after the verdict rather than as one of its outcomes.
  if (readings.some((r) => r.state === "missed")) return { ...base, state: "missed" }
  if (readings.some((r) => r.state === "pending")) return { ...base, state: "pending" }
  if (readings.some((r) => r.state === "frozen")) return { ...base, state: "frozen" }
  return { ...base, state: "kept" }
}

/**
 * The verdict as a surface colour.
 *
 * `GoalOutcome` is the older, narrower word for the same three states, and
 * `dayStateSurface` speaks it. Keeping the translation in one place is what
 * lets every card, cell and heatmap square go on painting exactly as before
 * while what decides the colour changes underneath them.
 */
export const asOutcome = (state: DayVerdict): GoalOutcome =>
  state === "kept"
    ? "met"
    : state === "frozen"
      ? "frozen"
      : state === "missed"
        ? "missed"
        : null

/** Kept and frozen both count; a frozen day was paid for, not failed. */
export const heldUp = (state: DayVerdict): boolean =>
  state === "kept" || state === "frozen"

/**
 * The first day any rule had a vote — where a walk over the composite has to
 * start. Null when nothing participates at all.
 */
export function verdictStart(project: Project): DayKey | null {
  const rules = (project.settings.streakRules || []).filter(
    (r) => r.scope === "day" && r.inDayVerdict === true,
  )
  if (!rules.length) return null
  return rules.map(votesFrom).sort()[0]
}

export interface KeptDays {
  current: number
  best: number
}

/**
 * The run of kept days — the number this whole design exists to make you
 * afraid of losing.
 *
 * No ledger of its own, and it does not need one: a day before a rule's
 * `startedOn` is simply not judged by that rule, so the walk is correct over
 * the whole history. In the months when only one rule voted, this equals that
 * rule's own streak — which is how an existing streak survives the day the
 * app stops having a hard-coded one.
 *
 * `pending` neither extends nor breaks: falling short at three in the
 * afternoon is not a failure yet, the same choice every other state machine
 * here makes about today.
 */
export function keptDays(project: Project, today = new Date()): KeptDays | null {
  const from = verdictStart(project)
  if (!from) return null
  const ctx = streakContext(project)
  const todayKey = toKey(today)
  if (from > todayKey) return { current: 0, best: 0 }

  let best = 0
  let run = 0
  for (let d = fromKey(from); toKey(d) <= todayKey; d = addDays(d, 1)) {
    const { state } = dayReport(project, toKey(d), todayKey, ctx)
    if (state === "unjudged" || state === "pending") continue
    if (heldUp(state)) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return { current: run, best }
}

/**
 * A stretch of days as one verdict — a week strip in the month grid, or any
 * other block that has to say how the whole of it went.
 *
 * Missed if any day missed; otherwise pending while any is still open. The
 * same shape `periodState` had, so the grid's reading of it is unchanged.
 *
 * Takes the states rather than the days, because the grid already has a report
 * per day and recomputing them would be the same walk done twice.
 */
export function foldVerdicts(states: DayVerdict[]): DayVerdict {
  let frozen = false
  let pending = false
  let judged = false
  for (const state of states) {
    if (state === "unjudged") continue
    judged = true
    if (state === "missed") return "missed"
    if (state === "frozen") frozen = true
    if (state === "pending") pending = true
  }
  if (!judged) return "unjudged"
  if (pending) return "pending"
  return frozen ? "frozen" : "kept"
}

export const periodVerdict = (
  project: Project,
  dates: Date[],
  todayKey: DayKey,
  ctx: StreakContext = streakContext(project),
): DayVerdict =>
  foldVerdicts(dates.map((d) => dayReport(project, toKey(d), todayKey, ctx).state))
