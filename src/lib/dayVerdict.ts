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
import { ruleDayState, ruleWeekDayState, streakContext } from "./customStreaks"
import { addDays, fromKey, startOfWeek, toKey } from "./date"

/** The day's own standing, drawn wherever a day is drawn. */
export type DayVerdict = "kept" | "missed" | "frozen" | "pending" | "unjudged"

export interface RuleReading {
  rule: StreakRule
  state: RuleState
}

/** How much of the ring a rule takes. 1 to 5; absent is 1. */
export const ruleWeight = (rule: StreakRule): number =>
  Math.min(5, Math.max(1, Math.round(rule.weight ?? 1)))

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
 * The rules with a vote on a day — **daily and weekly alike**.
 *
 * A week has no verdict until it ends, which would have kept a weekly rule out
 * of this entirely. What it does have every day is a burn-down, and the day
 * that crosses zero is a real event with a real date: `weekLostOn`. So the
 * distinction between the two scopes stays in the ledger, where it is honest,
 * and disappears from the day, where it was only ever in the way.
 */
export const votersFor = (
  rules: StreakRule[],
  dayKey: DayKey,
): StreakRule[] => rules.filter((r) => participates(r, dayKey))

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
      state:
        rule.scope === "week"
          ? ruleWeekDayState(rule, ctx, project.days, dayKey, todayKey)
          : ruleDayState(rule, ctx, day, dayKey, todayKey),
    }))
    .filter((r) => r.state !== "unjudged")

  if (!readings.length) return NOTHING

  /* Heaviest first, so the rule that matters most starts at twelve o'clock and
     sits in the same place on every day of the month. Ties keep the rule
     order, which is the order you wrote them in — `sort` is stable, so nothing
     has to be said to keep it. */
  readings.sort((a, b) => ruleWeight(b.rule) - ruleWeight(a.rule))

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
    (r) => r.inDayVerdict === true,
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

export interface WeekMark {
  /** The Monday, which is how every week in this app is named. */
  start: DayKey
  state: DayVerdict
}

export interface KeptWeeks {
  current: number
  best: number
  /** Every week since the first verdict, oldest first. */
  weeks: WeekMark[]
}

/**
 * **The second scale, and the reason there is one.**
 *
 * A run of days has exactly one point of loss: 20 → 0. While it is short that
 * costs almost nothing, so the first week of a new rule is the week you are
 * least invested in and most likely to drop — which is precisely backwards. A
 * week-sized unit fixes that from the other end: a bad Tuesday costs you *the
 * week*, not everything, and on Monday there is always something to start
 * accumulating again.
 *
 * **`kept` in both scales means the same thing**, deliberately: a week is kept
 * when every day in it held up, and a frozen day held up. Two verbs for one
 * idea is how a design ends up with a vocabulary nobody can keep straight, so
 * there is one — `days kept` and `weeks kept`, the same word at two sizes.
 *
 * The week you are living in is `pending` and counts towards nothing. It is
 * still returned, because the point of drawing it is that you can see what is
 * at stake before it is decided.
 */
export function keptWeeks(project: Project, today = new Date()): KeptWeeks | null {
  const from = verdictStart(project)
  if (!from) return null
  const ctx = streakContext(project)
  const todayKey = toKey(today)
  if (from > todayKey) return { current: 0, best: 0, weeks: [] }

  const weeks: WeekMark[] = []
  for (
    let monday = startOfWeek(fromKey(from));
    toKey(monday) <= todayKey;
    monday = addDays(monday, 7)
  ) {
    const states: DayVerdict[] = []
    for (let i = 0; i < 7; i += 1) {
      const key = toKey(addDays(monday, i))
      // Days before the first rule started, and days that have not happened,
      // are not this week's business either way.
      if (key < from || key > todayKey) continue
      states.push(dayReport(project, key, todayKey, ctx).state)
    }
    weeks.push({ start: toKey(monday), state: foldVerdicts(states) })
  }

  let best = 0
  let run = 0
  for (const week of weeks) {
    if (week.state === "unjudged" || week.state === "pending") continue
    if (heldUp(week.state)) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return { current: run, best, weeks }
}

export interface KeptBreakdownRow {
  rule: StreakRule
  /** Days in the range this rule judged at all. */
  judged: number
  /** Of those, the ones it broke. */
  missed: number
  /** Of *those*, the ones where nothing else broke — it alone cost the day. */
  alone: number
  /** Days it would have broken and a freeze paid for. */
  frozen: number
}

/**
 * **What the composite is made of, over one range.**
 *
 * The card says the run is nought and the ring says four of five, and neither
 * answers the question you actually have on a bad month, which is *which
 * promise keeps doing this*. `alone` is the sharpest form of it: days where
 * this rule and nothing else stood between you and a kept day. A rule with a
 * high `missed` and a low `alone` is keeping bad company; one with `alone`
 * near its `missed` is the whole problem by itself.
 *
 * Rules are returned in the order they were written, never sorted by blame —
 * a list that reorders itself as the month goes on is a list you have to
 * re-read from the top every time.
 */
export function keptBreakdown(
  project: Project,
  from: DayKey,
  to: DayKey,
  today = new Date(),
): KeptBreakdownRow[] {
  const rules = project.settings.streakRules || []
  if (!rules.length) return []
  const ctx = streakContext(project)
  const todayKey = toKey(today)
  const rows = new Map<string, KeptBreakdownRow>()

  for (let d = fromKey(from); toKey(d) <= to; d = addDays(d, 1)) {
    const key = toKey(d)
    if (key > todayKey) break
    const { readings } = dayReport(project, key, todayKey, ctx)
    const missing = readings.filter((r) => r.state === "missed")
    for (const reading of readings) {
      const row = rows.get(reading.rule.id) ?? {
        rule: reading.rule,
        judged: 0,
        missed: 0,
        alone: 0,
        frozen: 0,
      }
      row.judged += 1
      if (reading.state === "missed") {
        row.missed += 1
        if (missing.length === 1) row.alone += 1
      }
      if (reading.state === "frozen") row.frozen += 1
      rows.set(reading.rule.id, row)
    }
  }

  return rules.map((r) => rows.get(r.id)).filter((r): r is KeptBreakdownRow => !!r)
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
