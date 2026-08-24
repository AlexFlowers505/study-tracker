/* ---------------------------------------------------------------
   Custom streaks — `spec 009`, part 2.

   A rule is a sentence: *judge every [day / week], keeping [this] in [these
   slots] [at least / at most] [n] on [these weekdays]* — **and as many more
   conditions as the promise needs.** One shape covers every rule the feature
   was designed against, which is the test that it is the right shape.

   Five ideas do all the work here.

   **A condition names a target, not a counter.** It named a counter unit for
   as long as a counter was a tally or a check. Once an activity became a kind
   of counter that stopped being enough: "at least two hours of lessons a day"
   is the same sort of promise as "no youtube in the evening", and only one of
   them could be written. So a condition names one of five things — a unit, an
   activity, a category, a tag, or all study time — and the target decides
   whether the number beside it is minutes or occurrences.

   **A rule is one promise with several conditions.** "No Pinterest on a
   weekday morning, and no YouTube in the evening or at night" is one streak,
   not two: breaking either half breaks the week. Two separate rules would give
   you two streaks to keep and two allowances to spend, which is a weaker thing
   wearing the same name. So every clause must hold, and the weekdays live on
   the clause rather than on the rule, which is what lets one half be a weekday
   condition and the other an every-day one.

   **Failure has a size.** Not "the day broke" but *by how much* — the deficit,
   summed across the conditions that applied. A freeze pays for one unit of it,
   and a period is frozen only if the whole deficit can be paid. Two YouTube
   slips in one evening is a deficit of two, one freeze is not enough, nothing
   is spent, and the streak breaks. That falls out of the arithmetic rather
   than being a special case, and partial spending is refused on purpose: a day
   that breaks anyway should not also cost you the freeze.

   **Earning is a ledger, not a recomputation** — the same rule `freezes.ts`
   is built on. Every finished week gets exactly one verdict per rule, written
   once, so re-breaking and re-fixing a past week cannot mint a second reward.

   **The lock is one-sided.** Nothing here sorts an edit into "loosening" and
   "tightening", because that sort is not always possible and a rule that
   guesses wrong in the wrong direction is worse than no rule. It asks one
   question — *is every period that passes under the new rule also one that
   passed under the old?* — and anything it cannot prove waits.
--------------------------------------------------------------- */

import type {
  Activity,
  Category,
  CounterUnit,
  Day,
  DayKey,
  Project,
  RuleVerdict,
  Slot,
  StreakClause,
  StreakOp,
  StreakRule,
  StreakTarget,
  Tag,
} from "../types/model"
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  addDays,
  fromKey,
  startOfWeek,
  toKey,
  weekDates,
} from "./date"
import { checkState, counterKind, isCheck } from "./checks"
import { dayCounters, slotUnitValue, unitDayTotal } from "./counters"
import { entryActivity } from "./entries"
import { makeId } from "./id"
import { fmtHours } from "./time"
import { EDIT_HORIZON_DAYS, isEditableDay, isSealable } from "./freezes"

/** How long a loosening waits. A week, so a bad Tuesday cannot rewrite Tuesday. */
export const LOCK_DAYS = 7

/** The date a rule edited today unlocks on. */
export const lockFrom = (today: Date): DayKey =>
  toKey(addDays(today, LOCK_DAYS))

/* ---- What a condition can be about ------------------------------------- */

/**
 * Everything a rule needs to read itself against a project.
 *
 * One object rather than five arguments, because a condition can now name any
 * of five kinds of thing and every caller would otherwise have to know which
 * lists this particular rule happens to reach into.
 */
export interface StreakContext {
  units: CounterUnit[]
  activities: Activity[]
  slots: Slot[]
  categories: Category[]
  tags: Tag[]
  /**
   * The project's daily goal, by `Date.getDay()` — what a condition with
   * `useDailyGoal` is held to. Empty when the goal is switched off, which
   * makes such a condition vacuous rather than impossible.
   */
  dailyGoals: Record<number, number>
}

export const streakContext = (project: Project): StreakContext => ({
  units: project.counterUnits || [],
  activities: project.activities || [],
  slots: project.slots || [],
  categories: project.settings.categories || [],
  tags: project.settings.tags || [],
  dailyGoals:
    project.settings.goalsEnabled === false
      ? {}
      : project.settings.dailyGoals || {},
})

/**
 * What this condition is actually held to on this day.
 *
 * The only place `useDailyGoal` is resolved. A weekly rule asks for the sum
 * across the days it covers, which is why this takes a day rather than
 * returning a single number for the rule.
 */
export const clauseLimit = (
  clause: StreakClause,
  ctx: StreakContext,
  dayKey: DayKey,
): number =>
  clause.useDailyGoal
    ? ctx.dailyGoals[fromKey(dayKey).getDay()] || 0
    : clause.value

/** The same, summed over every day of a week the condition covers. */
const weekLimit = (
  clause: StreakClause,
  ctx: StreakContext,
  keys: DayKey[],
): number =>
  clause.useDailyGoal
    ? keys.reduce((sum, k) => sum + clauseLimit(clause, ctx, k), 0)
    : clause.value

/**
 * What a condition measures — **the list**, and the one place that knows it was
 * once a single target, and before that a bare counter id.
 *
 * Never empty: a condition with nothing chosen still has to read as something,
 * and a removed counter names itself as removed rather than vanishing.
 */
export const clauseTargets = (clause: StreakClause): StreakTarget[] => {
  if (clause.targets?.length) return clause.targets
  if (clause.target) return [clause.target]
  return [{ kind: "unit", id: clause.unitId || "" }]
}

/**
 * The first of them, for the places that genuinely want one — the measure, the
 * colour, whether this is a lone check.
 *
 * Every target in a condition measures the same thing, so "the first" is not a
 * guess about the others; it is the cheapest way to ask a question they all
 * answer identically.
 */
export const clauseTarget = (clause: StreakClause): StreakTarget =>
  clauseTargets(clause)[0]

/** Minutes, or occurrences. */
export type StreakMeasure = "time" | "count"

/**
 * Which of the two a target counts in.
 *
 * Only a category can be either, since it is the one grouping that holds both
 * things that record time and things that record a count. A stored `measure`
 * always wins: filing one more tally under a category must not silently change
 * what a rule written months ago is measuring.
 */
export function targetMeasure(
  target: StreakTarget,
  ctx: StreakContext,
): StreakMeasure {
  if (target.kind === "time" || target.kind === "activity") return "time"
  if (target.kind !== "category") return "count"
  if (target.measure) return target.measure
  return ctx.units.some((u) => u.categoryId === target.id) ? "count" : "time"
}

export interface TargetInfo {
  /** The thing's own name. */
  label: string
  /** The name as it reads in a sentence, qualified where it has to be. */
  qualified: string
  color?: string
  iconName?: string
  measure: StreakMeasure
  /** A single check, the one target that answers rather than counts. */
  check: boolean
}

const byId = <T extends { id: string }>(list: T[], id?: string) =>
  list.find((x) => x.id === id)

/**
 * A target, named and described.
 *
 * A deleted counter is named as one rather than vanishing: a condition about a
 * thing that no longer exists is a rule you need to go and fix, and a blank
 * where its name was is indistinguishable from a bug.
 *
 * Categories and tags say which they are. "Distractions at most 2 times" is
 * ambiguous the moment a counter and a category can share a name, and the one
 * job of the sentence is that you can check it against what you meant.
 */
export function targetInfo(
  target: StreakTarget,
  ctx: StreakContext,
): TargetInfo {
  const measure = targetMeasure(target, ctx)
  const plain = (label: string, thing?: Labelish): TargetInfo => ({
    label,
    qualified: label,
    color: thing?.color,
    iconName: thing?.iconName,
    measure,
    check: false,
  })

  if (target.kind === "time") return plain("Study time")

  if (target.kind === "activity") {
    const activity = byId(ctx.activities, target.id)
    return plain(activity?.label || "a removed activity", activity)
  }

  if (target.kind === "category") {
    const category = byId(ctx.categories, target.id)
    const label = category?.label || "a removed category"
    return { ...plain(label, category), qualified: `${label} (category)` }
  }

  if (target.kind === "tag") {
    const tag = byId(ctx.tags, target.id)
    const label = tag?.label || "a removed tag"
    return { ...plain(label, tag), qualified: `${label} (tag)` }
  }

  const unit = byId(ctx.units, target.id)
  return {
    ...plain(unit?.label || "a removed counter", unit),
    check: !!unit && isCheck(unit),
  }
}

interface Labelish {
  color: string
  iconName: string
}

/**
 * Several targets, named as one phrase: *Lessons, Q&A or Polishing*.
 *
 * **"or", not "and".** They are added together, so any of them moves the
 * figure — and "Lessons and Q&A at least 3h" reads as a demand for both, which
 * is the one thing a single condition cannot express.
 *
 * Past three it stops listing and counts instead. A sentence you have to
 * scroll is not a sentence you can check against what you meant, and checking
 * it is the entire job.
 */
export function targetsLabel(
  targets: StreakTarget[],
  ctx: StreakContext,
): string {
  const names = targets.map((target) => targetInfo(target, ctx).qualified)
  if (names.length === 1) return names[0]
  if (names.length > 3) return `any of ${names.length} things`
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`
}

/**
 * The units a target adds up. Empty for anything that measures time.
 *
 * `memberKind` narrows a set to one kind of counter inside it. Absent means
 * everything under it, which is how every rule written before that field read.
 */
const memberUnits = (
  target: StreakTarget,
  ctx: StreakContext,
): CounterUnit[] => {
  const ofKind = (units: CounterUnit[]) =>
    target.memberKind
      ? units.filter((u) => counterKind(u) === target.memberKind)
      : units

  if (target.kind === "unit") return ctx.units.filter((u) => u.id === target.id)
  if (target.kind === "tag")
    return ofKind(
      ctx.units.filter((u) => (u.tagIds || []).includes(target.id || "")),
    )
  if (target.kind === "category")
    return ofKind(ctx.units.filter((u) => u.categoryId === target.id))
  return []
}

/** Every unit a whole condition reaches, with no id counted twice. */
export const clauseUnits = (
  clause: StreakClause,
  ctx: StreakContext,
): CounterUnit[] => {
  const seen = new Set<string>()
  const out: CounterUnit[] = []
  clauseTargets(clause).forEach((target) => {
    memberUnits(target, ctx).forEach((unit) => {
      if (seen.has(unit.id)) return
      seen.add(unit.id)
      out.push(unit)
    })
  })
  return out
}

/** Which entries a time target counts. */
const keepsActivity = (
  target: StreakTarget,
  ctx: StreakContext,
): ((activityId: string) => boolean) => {
  if (target.kind === "activity") return (id) => id === target.id
  if (target.kind === "category") {
    const ids = new Set(
      ctx.activities.filter((a) => a.categoryId === target.id).map((a) => a.id),
    )
    return (id) => ids.has(id)
  }
  return () => true
}

/** Kept by *any* of them — several targets in one condition add up. */
const keepsAnyActivity = (
  targets: StreakTarget[],
  ctx: StreakContext,
): ((activityId: string) => boolean) => {
  const keeps = targets.map((target) => keepsActivity(target, ctx))
  return (id) => keeps.some((keep) => keep(id))
}

/**
 * Minutes logged on a day, through the clause's slots and the target's filter.
 *
 * Its own walk rather than `dayBreakdown`, which has no way to answer "this
 * activity, in these slots only" — and the slots are half the point: "two
 * hours of lessons before noon" is a different promise from "two hours of
 * lessons".
 */
const minutesOn = (
  day: Day | undefined,
  slots: Slot[],
  slotIds: string[] | undefined,
  keep: (activityId: string) => boolean,
): number => {
  const cells = day?.cells
  if (!cells) return 0
  const ids = slotIds?.length ? slotIds : slots.map((slot) => slot.id)
  let total = 0
  ids.forEach((slotId) => {
    ;(cells[slotId] || []).forEach((entry) => {
      if (keep(String(entryActivity(entry))))
        total += Number(entry.minutes) || 0
    })
  })
  return total
}

/** Counts on a day, added across every unit the target reaches. */
const countOn = (
  counters: ReturnType<typeof dayCounters>,
  unitIds: string[],
  slotIds: string[] | undefined,
): number =>
  unitIds.reduce(
    (sum, unitId) =>
      sum +
      (slotIds?.length
        ? slotIds.reduce(
            (inner, slotId) => inner + slotUnitValue(counters, unitId, slotId),
            0,
          )
        : unitDayTotal(counters, unitId)),
    0,
  )

/**
 * A rule's conditions, filling one in from the flat fields a rule used to
 * carry. The only place that fallback lives, so nothing else has to know a
 * rule ever had exactly one condition.
 */
export function ruleClauses(rule: StreakRule): StreakClause[] {
  if (rule.clauses?.length) return rule.clauses
  return [
    {
      id: `${rule.id}-clause`,
      target: { kind: "unit", id: rule.unitId || "" },
      slotIds: rule.slotIds,
      op: rule.op || "atMost",
      value: rule.value ?? 0,
      weekdays: rule.weekdays,
    },
  ]
}

/**
 * A fresh condition. The defaults differ by measure and they have to: "at most
 * 0 minutes of lessons" is a legal sentence and nobody has ever meant it,
 * while "at most 0 times" is the commonest rule in the feature.
 */
export const newClause = (
  target: StreakTarget,
  measure: StreakMeasure = "count",
): StreakClause => ({
  id: makeId("clause"),
  target,
  op: measure === "time" ? "atLeast" : "atMost",
  value: measure === "time" ? 60 : 0,
})

/**
 * A rule's own fields, for a freshly added one. `EditableList` supplies the
 * name, colour and icon; everything here is the rule.
 *
 * **It starts open**, and it has to: the defaults here are a guess, and a rule
 * you cannot configure on the day you write it is not a rule, it is a
 * decoration. The clock starts at the first loosening instead, which is the
 * thing worth rationing — one a week, whenever you take it.
 *
 * That leaves delete-and-recreate as the way round, and it is left open on
 * purpose: it costs the streak, and the streak is the only thing anybody was
 * protecting. A lock that also had to survive a rewrite would be defending the
 * paperwork rather than the promise.
 */
export function newStreakRule(
  target: StreakTarget,
  measure: StreakMeasure,
  today: Date,
): Omit<StreakRule, "id" | "label" | "color" | "iconName"> {
  return {
    scope: "day",
    clauses: [newClause(target, measure)],
    freezesPerWeek: 1,
    freezeCap: 15,
    startedOn: toKey(today),
    lockedUntil: toKey(today),
  }
}

/* ---- Reading a rule against the data ------------------------------------ */

export type RuleState = "met" | "frozen" | "missed" | "pending" | "unjudged"

export interface ClauseReading {
  clause: StreakClause
  /** Whether this condition has anything to say about this period. */
  applies: boolean
  /** What it measured. */
  value: number
  /** How far over or short, in whole units. Zero when the condition held. */
  deficit: number
  /** A check marked "skip": a miss, but one you chose rather than suffered. */
  skipped: boolean
}

/**
 * How far a condition fell short, **in whole units of failure**.
 *
 * For a count that is the shortfall itself: one more slip is one more freeze,
 * which is the arithmetic the whole freeze economy runs on. Time has no such
 * unit — forty minutes short of two hours is one broken promise, not forty —
 * so a time condition costs exactly one however far off it was. The figure you
 * actually missed by is still reported; it is only the *price* that is flat.
 */
const deficitOf = (
  clause: StreakClause,
  value: number,
  measure: StreakMeasure,
  limit: number,
): number => {
  const short = clause.op === "atLeast" ? limit - value : value - limit
  if (short <= 0) return 0
  return measure === "time" ? 1 : short
}

/** Does this condition cover this weekday? No list means every one of them. */
export const clauseCoversDay = (clause: StreakClause, dayKey: DayKey): boolean =>
  !clause.weekdays?.length ||
  clause.weekdays.includes(fromKey(dayKey).getDay())

/**
 * One condition, on one day.
 *
 * A **check** reads as one for yes and nothing for no — including the `no` an
 * unrecorded past day resolves to, which is what makes the common case free.
 * `skip` is a deficit of one whichever way the comparison runs: it is not an
 * exemption, and everything else about the streaks in this app follows the
 * same rule, or marking the bad days ignored would be the easy way to fake
 * one. What it buys is honesty in the record, not leniency.
 *
 * A **tally** is its count, across the clause's slots or across the whole day
 * when it names none.
 */
export function readClauseDay(
  clause: StreakClause,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
): ClauseReading {
  const applies = clauseCoversDay(clause, dayKey)
  const base = { clause, applies }
  if (!applies) return { ...base, value: 0, deficit: 0, skipped: false }

  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)

  /* A **lone** check keeps its own reading, where `skip` is a miss you chose
     rather than suffered and is priced at one. That only means anything when
     the condition is about a single answer: across several checks, "at least
     two of these three" is a count, and opting out of one while meeting the
     number is not an escape from anything. So several checks fall through to
     the ordinary count below, where a `yes` is the one it already stores. */
  if (targets.length === 1 && info.check) {
    const state = checkState(day, targets[0].id || "")
    if (state === "skip")
      return { ...base, value: 0, deficit: 1, skipped: true }
    const value = state === "yes" ? 1 : 0
    return {
      ...base,
      value,
      deficit: deficitOf(clause, value, "count", clause.value),
      skipped: false,
    }
  }

  const value =
    info.measure === "time"
      ? minutesOn(day, ctx.slots, clause.slotIds, keepsAnyActivity(targets, ctx))
      : countOn(
          dayCounters(day || {}),
          clauseUnits(clause, ctx).map((u) => u.id),
          clause.slotIds,
        )

  return {
    ...base,
    value,
    deficit: deficitOf(clause, value, info.measure, clauseLimit(clause, ctx, dayKey)),
    skipped: false,
  }
}

/** Every condition, on one day. */
export function readDay(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
): ClauseReading[] {
  return ruleClauses(rule).map((clause) =>
    readClauseDay(clause, ctx, day, dayKey),
  )
}

/**
 * How far a period fell short, across every condition that applied to it.
 *
 * Summed rather than maxed: a day that broke two of your conditions cost you
 * twice, and a freeze that covered both for the price of one would make the
 * second condition free.
 */
export const totalDeficit = (readings: ClauseReading[]): number =>
  readings.reduce((sum, r) => sum + (r.applies ? r.deficit : 0), 0)

/**
 * Whether this rule has anything to say about this day — whether **any** of
 * its conditions covers it.
 *
 * A day no condition covers is not judged at all: it neither extends a streak
 * nor breaks one. That is what makes "no Pinterest on weekday mornings" a
 * usable half of a compound rule rather than a rule that fails every Sunday.
 */
export function judgesDay(rule: StreakRule, dayKey: DayKey): boolean {
  if (rule.scope !== "day") return false
  if (dayKey < rule.startedOn) return false
  return ruleClauses(rule).some((clause) => clauseCoversDay(clause, dayKey))
}

export const isFrozenFor = (day: Day | undefined, ruleId: string): boolean =>
  (day?.ruleFreezes || []).includes(ruleId)

/**
 * What a day is worth to a rule.
 *
 * Today is `pending` rather than `missed` while it falls short, the same
 * choice `dayState` makes for the main streak: falling behind at three in the
 * afternoon is not a failure yet. A freeze can still be spent on it, which is
 * what makes "I have already slipped and the day is not over" a state you can
 * act on.
 */
export function ruleDayState(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): RuleState {
  if (dayKey > todayKey || !judgesDay(rule, dayKey)) return "unjudged"
  if (isFrozenFor(day, rule.id)) return "frozen"
  const deficit = totalDeficit(readDay(rule, ctx, day, dayKey))
  if (deficit === 0) return "met"
  return dayKey === todayKey ? "pending" : "missed"
}

/**
 * A whole week, for a rule that judges weeks: each condition's days summed,
 * then each compared once.
 *
 * Per condition rather than per day, because "three trips to the gym a week"
 * is a statement about the week and cannot be read off any single day in it.
 */
export function readWeek(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): ClauseReading[] {
  const keys = weekDates(weekStart)
    .map(toKey)
    .filter((k) => k <= todayKey && k >= rule.startedOn)
  return ruleClauses(rule).map((clause) => {
    const measure = targetMeasure(clauseTarget(clause), ctx)
    const covered = keys.filter((k) => clauseCoversDay(clause, k))
    const value = covered.reduce(
      (sum, k) => sum + readClauseDay(clause, ctx, days[k], k).value,
      0,
    )
    return {
      clause,
      applies: covered.length > 0,
      value,
      deficit: covered.length
        ? deficitOf(clause, value, measure, weekLimit(clause, ctx, covered))
        : 0,
      skipped: false,
    }
  })
}

/**
 * A week's standing under a rule that judges weeks.
 *
 * The freeze lives on the week's Monday: a week has no row of its own, and its
 * first day is the one place both halves of the app can agree to look.
 */
export function ruleWeekState(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): RuleState {
  if (rule.scope !== "week") return "unjudged"
  const lastKey = toKey(addDays(weekStart, 6))
  // Whole weeks only. "Three trips to the gym a week" judged on the two days
  // that were left when the rule started is a rule nobody agreed to.
  if (toKey(weekStart) < rule.startedOn || toKey(weekStart) > todayKey)
    return "unjudged"
  if (isFrozenFor(days[toKey(weekStart)], rule.id)) return "frozen"
  const deficit = totalDeficit(readWeek(rule, ctx, days, weekStart, todayKey))
  if (deficit === 0) return "met"
  return lastKey >= todayKey ? "pending" : "missed"
}

/* ---- A week, read one day at a time -------------------------------------- */

/**
 * The day a week stopped being winnable — `spec 010`, part 2.
 *
 * A week has no verdict until it ends, which would keep a weekly rule out of
 * the day's verdict entirely. But something about it is true every day: **how
 * much is left against how many days are left.** That is a burn-down, and the
 * moment it crosses zero is a real event with a real date.
 *
 * **A lost week costs exactly one day, and it is the day it was lost on.** The
 * alternative — every day of the week turning red — would break a streak seven
 * times for one broken promise, and would do it retroactively to days on which
 * nothing was yet wrong. On the day the gym became unreachable you lost the
 * week; the Monday before it you had not.
 *
 * A count is read as happening **at most once a day**: three gym trips in one
 * afternoon is technically possible and is not what anybody means by "three
 * times a week". Time has no such ceiling, so a time condition can only be
 * lost once the week is over — you could always have done it all on Sunday.
 *
 * Returns null while the week is still winnable, or has already been won.
 */
export function clauseLostOn(
  clause: StreakClause,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  /** Already narrowed to the days this clause judges — see `coveredDays`. */
  covered: DayKey[],
  todayKey: DayKey,
): DayKey | null {
  if (!covered.length) return null
  const measure = targetMeasure(clauseTarget(clause), ctx)
  const limit = weekLimit(clause, ctx, covered)

  let value = 0
  for (const key of covered) {
    // Days that have not happened contribute nothing and settle nothing; the
    // walk stops there and the week stays open.
    if (key > todayKey) break
    value += readClauseDay(clause, ctx, days[key], key).value

    if (clause.op === "atMost") {
      // Already over. There is no doing less of something done.
      if (value > limit) return key
      continue
    }

    const need = limit - value
    if (need <= 0) return null
    // Days left to make it up in. Today counts as one of them, because it is
    // not over — which is why a week is never declared lost on a morning.
    const after = covered.filter((k) => k > key).length
    const room =
      measure === "time"
        ? after > 0 || key >= todayKey
          ? Infinity
          : 0
        : after + (key >= todayKey ? 1 : 0)
    if (need > room) return key
  }
  return null
}

/** The days of a week this clause actually judges. */
const coveredDays = (
  clause: StreakClause,
  rule: StreakRule,
  weekStart: Date,
): DayKey[] =>
  weekDates(weekStart)
    .map(toKey)
    .filter((k) => k >= rule.startedOn && clauseCoversDay(clause, k))

export function weekLostOn(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): DayKey | null {
  let earliest: DayKey | null = null
  for (const clause of ruleClauses(rule)) {
    const lost = clauseLostOn(
      clause,
      ctx,
      days,
      coveredDays(clause, rule, weekStart),
      todayKey,
    )
    if (lost && (!earliest || lost < earliest)) earliest = lost
  }
  return earliest
}

/* ---- Pace ---------------------------------------------------------------- */

/**
 * Where one day sits in the week's burn-down.
 *
 * `outside` is a day the clause does not judge — a Saturday under a weekday
 * condition. It keeps its column so the week still reads Monday to Sunday;
 * dropping it would shift every other day sideways, which is the one thing a
 * weekday strip must not do.
 */
export type PaceState = "ahead" | "behind" | "lost" | "future" | "outside"

export interface PaceDay {
  key: DayKey
  /** Everything counted up to and including this day. */
  cumulative: number
  /** What the bar draws: what is left to do, or what has been spent. */
  bar: number
  state: PaceState
}

export interface ClausePace {
  clause: StreakClause
  /** What is being counted, in words — the target's own name. */
  label: string
  measure: StreakMeasure
  op: StreakOp
  limit: number
  /** Where it stands right now. */
  value: number
  /** Judged days still to come, today included. */
  daysLeft: number
  lostOn: DayKey | null
  days: PaceDay[]
}

/**
 * A weekly rule's week, day by day — `spec 010`, part 2, the drawing half.
 *
 * `weekLostOn` already knew the day a week stopped being winnable, and that
 * one date is all the day's colour needs. It is not all a *person* needs: by
 * the time the answer is "lost", the week that could have been saved is over.
 * The useful question is asked on the Wednesday — how much is left, against
 * how many days are left — and this returns it for every day at once.
 *
 * **One reading per condition, never one per rule.** Two conditions in two
 * units have no shared axis, exactly as the chart found; a compound rule gets
 * two rows here rather than one meaningless one.
 *
 * **The two operators burn in opposite directions, and are drawn so.** Under
 * `atLeast` the bar is a debt you pay off and it should reach nothing by
 * Sunday. Under `atMost` it is a budget you spend and it should not fill.
 * Drawing both as one shape would put "good" at the top of the chart on one
 * rule and at the bottom on the next.
 */
export function weekPace(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): ClausePace[] {
  if (rule.scope !== "week") return []
  const all = weekDates(weekStart).map(toKey)

  return ruleClauses(rule).flatMap((clause) => {
    const covered = coveredDays(clause, rule, weekStart)
    if (!covered.length) return []

    const measure = targetMeasure(clauseTarget(clause), ctx)
    const limit = weekLimit(clause, ctx, covered)
    const lostOn = clauseLostOn(clause, ctx, days, covered, todayKey)

    let cumulative = 0
    let seen = 0
    const rows: PaceDay[] = all.map((key) => {
      if (!covered.includes(key))
        return { key, cumulative, bar: 0, state: "outside" as const }
      if (key > todayKey)
        return {
          key,
          cumulative,
          bar: clause.op === "atMost" ? cumulative : Math.max(0, limit - cumulative),
          state: "future" as const,
        }

      cumulative += readClauseDay(clause, ctx, days[key], key).value
      seen += 1

      const bar =
        clause.op === "atMost" ? cumulative : Math.max(0, limit - cumulative)

      // Lost stays lost: every day from the one it broke on wears the colour,
      // because the week is over as a question even though the days are not.
      if (lostOn && key >= lostOn)
        return { key, cumulative, bar, state: "lost" as const }

      // The even line — what you would have by now if you spread the week's
      // work across the days that judge it. Ahead of it is the only sense in
      // which a Wednesday can be "on track" for a thing due on Sunday.
      const pacing = (limit * seen) / covered.length
      const ahead =
        clause.op === "atMost" ? cumulative <= pacing : cumulative >= pacing
      return { key, cumulative, bar, state: ahead ? "ahead" : "behind" }
    })

    return [
      {
        clause,
        label: targetInfo(clauseTarget(clause), ctx).label,
        measure,
        op: clause.op,
        limit,
        value: cumulative,
        daysLeft: covered.filter((k) => k >= todayKey).length,
        lostOn,
        days: rows,
      },
    ]
  })
}

/**
 * What a weekly rule says about one **day** — which is what lets it vote on
 * the day's verdict alongside the daily rules.
 *
 * Every day of a week it is winning is `met`; the day it was lost on is
 * `missed`, or `frozen` when a freeze covers that week. Days of a week the
 * rule does not judge at all are `unjudged`, as ever.
 */
export function ruleWeekDayState(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  dayKey: DayKey,
  todayKey: DayKey,
): RuleState {
  if (rule.scope !== "week") return "unjudged"
  if (dayKey > todayKey || dayKey < rule.startedOn) return "unjudged"
  const weekStart = startOfWeek(fromKey(dayKey))
  // Whole weeks only, the same rule `ruleWeekState` follows: "three trips a
  // week" judged on the two days that were left when the rule started is a
  // rule nobody agreed to.
  if (toKey(weekStart) < rule.startedOn) return "unjudged"

  const lost = weekLostOn(rule, ctx, days, weekStart, todayKey)
  if (lost !== dayKey) return "met"
  return isFrozenFor(days[toKey(weekStart)], rule.id) ? "frozen" : "missed"
}

/* ---- The week's verdict -------------------------------------------------- */

/**
 * Whether a finished week was kept: every judged period in it met or frozen.
 *
 * **A week carried by freezes still counts.** Freezes are part of the rule you
 * wrote rather than a failure to keep it — a week you allowed yourself two of
 * and used both is a week you planned correctly. The main streak pays out the
 * same way.
 *
 * A week with nothing to judge — a weekday rule that started on the Thursday,
 * say — is not a kept week. There is no achievement in a week the rule never
 * touched, and rewarding one would pay for the gaps.
 */
export function weekKept(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): boolean {
  if (rule.scope === "week") {
    const state = ruleWeekState(rule, ctx, days, weekStart, todayKey)
    return state === "met" || state === "frozen"
  }
  let judged = 0
  for (const date of weekDates(weekStart)) {
    const key = toKey(date)
    const state = ruleDayState(rule, ctx, days[key], key, todayKey)
    if (state === "unjudged") continue
    judged += 1
    if (state === "missed") return false
  }
  return judged > 0
}

/* ---- Freezes ------------------------------------------------------------- */

/**
 * What a freeze on this day costs — the deficit, and never less than one.
 *
 * A day already frozen keeps its price even if the data behind it was later
 * logged up to green: a freeze spent stays spent, the same rule `days.frozen`
 * follows. Without the floor, fixing a frozen day would silently hand the
 * freeze back.
 */
export function freezeCost(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
): number {
  if (rule.scope === "week") return 1
  return Math.max(1, totalDeficit(readDay(rule, ctx, day, dayKey)))
}

export interface RuleFreezes {
  /** Granted this week and still unspent. Gone at the week's end. */
  weeklyLeft: number
  weeklyTotal: number
  /** Rewards from kept weeks. Carried over until spent. */
  banked: number
  cap: number
  /** Rewards the cap threw away. Shown, never silently discarded. */
  forfeited: number
}

/* ---- Everything the panel needs, in one pass ----------------------------- */

export interface RuleOpenWeek {
  weekStart: DayKey
  wouldKeep: boolean
  sealsOn: DayKey
}

export interface RuleStatus {
  rule: StreakRule
  /** Consecutive judged periods kept, most recent first. */
  current: number
  best: number
  freezes: RuleFreezes
  /** Verdicts that should exist but do not yet — write these, once. */
  pending: RuleVerdict[]
  /** Weeks not yet sealed, newest first. */
  open: RuleOpenWeek[]
}

const weekKeysFrom = (from: Date, today: Date): Date[] => {
  const out: Date[] = []
  for (let w = startOfWeek(from); w <= startOfWeek(today); w = addDays(w, 7))
    out.push(w)
  return out
}

/**
 * One rule, fully accounted: its streak, its two freeze pools, the verdicts
 * that are due to be written, and the weeks still in play.
 *
 * One pass because the numbers are entangled — what a week spent decides which
 * pool it came out of, which decides what is banked — and two functions
 * computing halves of that is two functions that can disagree.
 */
export function ruleStatus(
  rule: StreakRule,
  project: Project,
  today = new Date(),
): RuleStatus {
  const todayKey = toKey(today)
  const days = project.days
  const ctx = streakContext(project)
  const weeks = weekKeysFrom(fromKey(rule.startedOn), today)

  /* --- verdicts, sealed and due --- */
  const ledger = project.ruleVerdicts || {}
  const pending: RuleVerdict[] = []
  const open: RuleOpenWeek[] = []
  weeks.forEach((w) => {
    const weekKey = toKey(w)
    if (isSealable(w, today)) {
      if (ledger[`${rule.id}::${weekKey}`]) return
      pending.push({
        ruleId: rule.id,
        weekKey,
        kept: weekKept(rule, ctx, days, w, todayKey),
        sealedAt: new Date().toISOString(),
      })
      return
    }
    open.push({
      weekStart: weekKey,
      wouldKeep: weekKept(rule, ctx, days, w, todayKey),
      // The day after the last editable day of that week.
      sealsOn: toKey(addDays(w, 6 + EDIT_HORIZON_DAYS + 1)),
    })
  })

  const earned = [
    ...Object.values(ledger).filter((v) => v.ruleId === rule.id),
    ...pending,
  ].filter((v) => v.kept).length

  /* --- what each week spent, and out of which pool --- */
  let bankedUsed = 0
  let spentThisWeek = 0
  const thisWeekKey = toKey(startOfWeek(today))
  weeks.forEach((w) => {
    const spent = weekDates(w).reduce((sum, date) => {
      const key = toKey(date)
      const day = days[key]
      if (!isFrozenFor(day, rule.id)) return sum
      return sum + freezeCost(rule, ctx, day, key)
    }, 0)
    // The weekly allowance goes first: it is the one that expires, so
    // spending it last would burn a banked reward and let a grant evaporate.
    bankedUsed += Math.max(0, spent - rule.freezesPerWeek)
    if (toKey(w) === thisWeekKey) spentThisWeek = spent
  })

  const rawBanked = earned - bankedUsed
  const freezes: RuleFreezes = {
    weeklyTotal: rule.freezesPerWeek,
    weeklyLeft: Math.max(0, rule.freezesPerWeek - spentThisWeek),
    banked: Math.max(0, Math.min(rawBanked, rule.freezeCap)),
    cap: rule.freezeCap,
    forfeited: Math.max(0, rawBanked - rule.freezeCap),
  }

  /* --- the streak itself --- */
  const states: RuleState[] =
    rule.scope === "week"
      ? weeks.map((w) => ruleWeekState(rule, ctx, days, w, todayKey))
      : weeks
          .flatMap(weekDates)
          .map(toKey)
          .filter((k) => k >= rule.startedOn && k <= todayKey)
          .map((k) => ruleDayState(rule, ctx, days[k], k, todayKey))

  let best = 0
  let run = 0
  states.forEach((s) => {
    if (s === "unjudged" || s === "pending") return
    if (s === "missed") run = 0
    else run += 1
    if (run > best) best = run
  })
  // The tail of the same walk: whatever run was still going at the end.
  return { rule, current: run, best, freezes, pending, open }
}

/**
 * Whether a freeze can go on this day, what it would cost, and what there is
 * to pay with.
 *
 * The window is today and yesterday, the same one the log itself is written
 * in — widened to "any day of this week is" for a rule that judges weeks.
 */
export function freezeOffer(
  rule: StreakRule,
  project: Project,
  dayKey: DayKey,
  todayKey: DayKey,
  status: RuleStatus,
): { ok: boolean; cost: number; available: number; key: DayKey } {
  const day = project.days[dayKey]
  const ctx = streakContext(project)
  const available = status.freezes.weeklyLeft + status.freezes.banked
  const weekStart = startOfWeek(fromKey(dayKey))
  const week = rule.scope === "week"
  const state = week
    ? ruleWeekState(rule, ctx, project.days, weekStart, todayKey)
    : ruleDayState(rule, ctx, day, dayKey, todayKey)
  if (state !== "missed" && state !== "pending")
    return { ok: false, cost: 0, available, key: dayKey }
  // A day is freezable while it is writable. A *week* is freezable while any
  // of its days is — otherwise a rule about a week could only ever be frozen
  // on a Sunday or a Monday, which is not a window, it is an accident of
  // which day the horizon happens to land on.
  const open = week
    ? weekDates(weekStart).some((d) => isEditableDay(toKey(d), todayKey))
    : isEditableDay(dayKey, todayKey)
  if (!open) return { ok: false, cost: 0, available, key: dayKey }
  const cost = freezeCost(rule, ctx, day, dayKey)
  // Where the freeze is actually written. A week has no row of its own, so it
  // goes on the Monday — and the caller must not have to remember that.
  const key = week ? toKey(weekStart) : dayKey
  return { ok: available >= cost, cost, available, key }
}

/**
 * The rules whose limit comes from the project's daily goal.
 *
 * Lowering that goal lowers those rules **without touching them**, which is a
 * loosening that never passes through `ruleEdit` at all. `termsOf` folds the
 * goals in so an edit to the *rule* is judged correctly; this is the other
 * half, and without it the lock has a door in the side of it.
 */
export const goalReaders = (rules: StreakRule[]): StreakRule[] =>
  rules.filter((r) => ruleClauses(r).some((c) => c.useDailyGoal))

export interface GoalCutVerdict {
  /** Rules that would be loosened by the cut. */
  affected: StreakRule[]
  /** Any of them still inside its own lock — then the cut waits. */
  blockedUntil: DayKey | null
  /** The clock is clear; only a written reason is left. */
  needsReason: boolean
  allowed: boolean
}

/**
 * Whether the daily goal may be lowered, and what it costs the rules that read
 * it — the same three answers `ruleEdit` gives, for the same reasons.
 */
export function goalCutEdit(
  rules: StreakRule[],
  reason: string,
  today = new Date(),
): GoalCutVerdict {
  const todayKey = toKey(today)
  const affected = goalReaders(rules)
  if (!affected.length)
    return { affected, blockedUntil: null, needsReason: false, allowed: true }

  // The latest lock among them decides: a cut loosens all of them at once, so
  // it can only happen when every one of them is open to it.
  const locked = affected
    .filter((r) => todayKey !== r.startedOn && todayKey < r.lockedUntil)
    .map((r) => r.lockedUntil)
    .sort()
  if (locked.length)
    return {
      affected,
      blockedUntil: locked[locked.length - 1],
      needsReason: false,
      allowed: false,
    }
  if (!reason.trim())
    return { affected, blockedUntil: null, needsReason: true, allowed: false }
  return { affected, blockedUntil: null, needsReason: false, allowed: true }
}

/** Those rules after the cut: locked again, with the reason on the record. */
export const afterGoalCut = (
  rules: StreakRule[],
  reason: string,
  today = new Date(),
): StreakRule[] => {
  const affected = new Set(goalReaders(rules).map((r) => r.id))
  const at = toKey(today)
  return rules.map((r) =>
    affected.has(r.id)
      ? {
          ...r,
          lockedUntil: lockFrom(today),
          looseningLog: [
            ...(r.looseningLog || []),
            { at, reason: `Daily goal lowered — ${reason.trim()}` },
          ],
        }
      : r,
  )
}

/* ---- Saying it back ------------------------------------------------------ */

const listDays = (weekdays: number[]) =>
  weekdays
    .slice()
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
    .map((wd) => WEEKDAY_LABELS[wd])
    .join(", ")

/**
 * One condition in words.
 *
 * Worth a function rather than a template at each call site: the whole point
 * of the sentence is that it is the same sentence in the form and in the
 * panel, or checking one against the other tells you nothing.
 */
export function clauseSentence(
  clause: StreakClause,
  ctx: StreakContext,
  scope: StreakRule["scope"] = "day",
): string {
  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)
  const named = targetsLabel(targets, ctx)
  const when =
    scope === "day" && clause.weekdays?.length
      ? ` on ${listDays(clause.weekdays)}`
      : ""

  // Only a lone check reads as an answer; several of them are a count, which
  // is exactly how `readClauseDay` treats them.
  if (targets.length === 1 && info.check)
    return `${info.qualified} must be ${
      clause.op === "atLeast" ? "yes" : "no"
    }${when}`

  const where = clause.slotIds?.length
    ? ` in ${clause.slotIds
        .map(
          (id) => ctx.slots.find((s) => s.id === id)?.label || "a removed slot",
        )
        .join(", ")}`
    : ""
  // Minutes are printed as hours and minutes, like every other duration in
  // the app: "at least 2h 30m", never "at least 150".
  const amount = clause.useDailyGoal
    ? scope === "week"
      ? "the week's goal"
      : "the day's goal"
    : info.measure === "time"
      ? fmtHours(clause.value)
      : `${clause.value} ${clause.value === 1 ? "time" : "times"}`
  return `${named}${where} ${
    clause.op === "atLeast" ? "at least" : "at most"
  } ${amount}${when}`
}

/** The whole rule in one line — the scope, then every condition joined by "and". */
export function ruleSentence(rule: StreakRule, ctx: StreakContext): string {
  const when = rule.scope === "week" ? "Every week" : "Every day"
  const parts = ruleClauses(rule).map((clause) =>
    clauseSentence(clause, ctx, rule.scope),
  )
  return `${when}: ${parts.join(", and ")}.`
}

/* ---- The lock ------------------------------------------------------------ */

/** The weekdays a clause covers. No list means all seven. */
const weekdaysOf = (clause: StreakClause): Set<number> =>
  new Set(clause.weekdays?.length ? clause.weekdays : WEEKDAY_ORDER)

/** The slots a clause counts. No list means the whole day, which is every slot. */
const slotsOf = (clause: StreakClause, slots: Slot[]): Set<string> =>
  new Set(clause.slotIds?.length ? clause.slotIds : slots.map((s) => s.id))

const covers = <T,>(bigger: Set<T>, smaller: Set<T>): boolean =>
  [...smaller].every((x) => bigger.has(x))

/**
 * The fields the lock protects. Label, icon, colour and note are not terms.
 *
 * The daily goal is folded in whenever a condition takes its limit from it,
 * because then lowering the goal lowers the rule — a change to the terms made
 * without touching the rule. `spec 010` records the remaining half of this:
 * the goal editor itself has to refuse a cut while such a rule is locked, or
 * the back door is merely narrower rather than shut.
 */
export const termsOf = (rule: StreakRule, ctx: StreakContext) => {
  const clauses = ruleClauses(rule)
  return JSON.stringify({
    scope: rule.scope,
    clauses: clauses.map((clause) => ({
      ...clause,
      // Normalised, so a rule being written through for the first time — flat
      // fields becoming a target — does not read as an edit to its terms.
      unitId: undefined,
      target: clauseTarget(clause),
    })),
    freezesPerWeek: rule.freezesPerWeek,
    freezeCap: rule.freezeCap,
    goals: clauses.some((c) => c.useDailyGoal) ? ctx.dailyGoals : null,
  })
}

export const termsChanged = (
  a: StreakRule,
  b: StreakRule,
  ctx: StreakContext,
): boolean => termsOf(a, ctx) !== termsOf(b, ctx)

/**
 * Can it be proved that this condition cannot be easier to keep than that one?
 *
 * The two slot rows point in opposite directions for the same edit, and that
 * is not a mistake: under `atMost` a slot is a place you can be caught, so
 * adding one narrows the ways through; under `atLeast` a slot is a place the
 * count can come from, so adding one widens them.
 */
/**
 * Two targets naming the same thing, measured the same way.
 *
 * Compared field by field rather than resolved: a category whose measure was
 * never stored and one where it was set to the same value are treated as
 * different, which locks the edit. That is the safe direction — the whole test
 * is one-sided, and "not proven" is always allowed to be wrong.
 */
const sameTarget = (a: StreakTarget, b: StreakTarget): boolean =>
  a.kind === b.kind &&
  (a.id || "") === (b.id || "") &&
  (a.measure || "") === (b.measure || "")

function clauseNarrows(
  prev: StreakClause,
  next: StreakClause,
  slots: Slot[],
): boolean {
  if (!sameTarget(clauseTarget(prev), clauseTarget(next))) return false
  if (prev.op !== next.op) return false
  // Switching a limit to or from the daily goal swaps one number for seven.
  // Not comparable, therefore not provable, therefore it waits.
  if (!!prev.useDailyGoal !== !!next.useDailyGoal) return false
  // Both read the same goal, so the limit is unchanged by construction and
  // only the other dimensions are left to compare.
  if (
    !prev.useDailyGoal &&
    (prev.op === "atLeast" ? next.value < prev.value : next.value > prev.value)
  )
    return false
  // More days covered is harder; dropping one is a day that stops being asked
  // about at all.
  if (!covers(weekdaysOf(next), weekdaysOf(prev))) return false
  const ps = slotsOf(prev, slots)
  const ns = slotsOf(next, slots)
  return prev.op === "atMost" ? covers(ns, ps) : covers(ps, ns)
}

/**
 * Can it be proved that `next` cannot be easier to keep than `prev`?
 *
 * **One-sided on purpose.** A false here means "not proven", not "looser" —
 * inverting the comparison, swapping the counter and switching between judging
 * a day and judging a week are all genuinely incomparable, and all of them
 * land here as false and wait. Nothing has to decide what they were.
 *
 * With several conditions the test is the same argument one level up. Every
 * condition that was there must still be there and no easier, since a day
 * passing under the new rule then satisfies each new condition, hence each old
 * one, hence passed under the old rule. **Conditions that were only added are
 * free**: a further thing to keep can only ever cost you, which is why
 * building a compound rule out of a simple one never waits.
 *
 * Every dimension must be no-easier. One easier dimension is enough to make
 * the whole edit wait — they are not a currency you can trade between.
 */
export function isNarrowing(
  prev: StreakRule,
  next: StreakRule,
  ctx: StreakContext,
): boolean {
  const slots = ctx.slots
  if (prev.scope !== next.scope) return false
  if (next.freezesPerWeek > prev.freezesPerWeek) return false
  if (next.freezeCap > prev.freezeCap) return false
  const after = ruleClauses(next)
  // Matched by id, so reordering the list is not an edit and a rewritten
  // condition is not mistaken for a dropped one plus a new one.
  return ruleClauses(prev).every((before) => {
    const counterpart = after.find((c) => c.id === before.id)
    return !!counterpart && clauseNarrows(before, counterpart, slots)
  })
}

export interface RuleEdit {
  /** Do the terms differ at all? A cosmetic edit is never blocked. */
  changed: boolean
  /** Proved to be no easier — allowed whatever the clock says. */
  narrowing: boolean
  /** Still the day it was written: anything goes and nothing starts the clock. */
  settingUp: boolean
  /**
   * A loosening the clock and the reason both permit, waiting on the second
   * person. The change is sent rather than applied — see `lib/supervisor`.
   */
  needsApproval: boolean
  /**
   * A loosening the clock permits, waiting only on a written reason.
   *
   * Separate from `allowed` because the two refusals are completely different
   * problems: one you fix by typing, the other by waiting a week, and telling
   * someone to wait when they only had to explain themselves is telling them
   * the wrong thing.
   */
  needsReason: boolean
  allowed: boolean
  /** The rule as it should be stored, with the clock moved if it had to be. */
  next: StreakRule
}

/**
 * What an edit is, and what it costs.
 *
 * **Narrowing does not reset the clock; loosening does.** The lock exists to
 * stop you buying your way out of a bad week, and raising the bar never does
 * that — charging a week of flexibility for raising it would only discourage
 * raising it. Nor is it a way in: to end up anywhere easier than you started
 * you still need a loosening, and that is still gated on the clock the last
 * loosening set.
 */
export function ruleEdit(
  prev: StreakRule,
  draft: StreakRule,
  ctx: StreakContext,
  today = new Date(),
  reason = "",
  supervised = false,
): RuleEdit {
  const todayKey = toKey(today)
  const changed = termsChanged(prev, draft, ctx)
  const narrowing = isNarrowing(prev, draft, ctx)
  // **The day you write a rule is yours to get it right on.** Setting one up
  // takes several changes — pick the counter, pick the test, pick the number,
  // pick the allowance — and most of them are incomparable to the defaults,
  // so without this the lock closes on the first click and the rule you are
  // left with is the one the app guessed. Nothing here is at risk: the rule
  // has judged nothing yet, so there is no verdict a kinder version could
  // rescue.
  const settingUp = todayKey === prev.startedOn
  const base = {
    changed,
    narrowing,
    settingUp,
    needsReason: false,
    needsApproval: false,
  }
  if (!changed) return { ...base, narrowing: true, allowed: true, next: draft }
  if (narrowing) return { ...base, allowed: true, next: draft }
  if (settingUp) return { ...base, allowed: true, next: draft }
  const clockOpen = todayKey >= prev.lockedUntil
  const written = reason.trim()
  if (!clockOpen) return { ...base, allowed: false, next: prev }
  // The clock has run out; the only thing left is to say why. Written in the
  // same operation as the new lock date, so a reason cannot go missing from a
  // loosening that happened.
  if (!written) return { ...base, needsReason: true, allowed: false, next: prev }
  // With a supervisor the clock is only the first gate. The change is not
  // refused — it is sent, and `allowed` stays false because nothing may be
  // written into the rule until somebody else has said yes.
  if (supervised)
    return { ...base, needsApproval: true, allowed: false, next: prev }
  return {
    ...base,
    allowed: true,
    next: {
      ...draft,
      lockedUntil: lockFrom(today),
      looseningLog: [
        ...(prev.looseningLog || []),
        { at: todayKey, reason: written },
      ],
    },
  }
}
