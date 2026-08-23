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
import { checkState, isCheck } from "./checks"
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
}

export const streakContext = (project: Project): StreakContext => ({
  units: project.counterUnits || [],
  activities: project.activities || [],
  slots: project.slots || [],
  categories: project.settings.categories || [],
  tags: project.settings.tags || [],
})

/**
 * What a condition measures. The only place that knows a condition used to be
 * able to name a counter unit and nothing else.
 */
export const clauseTarget = (clause: StreakClause): StreakTarget =>
  clause.target ?? { kind: "unit", id: clause.unitId || "" }

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

/** The units a target adds up. Empty for anything that measures time. */
const memberUnits = (
  target: StreakTarget,
  ctx: StreakContext,
): CounterUnit[] => {
  if (target.kind === "unit") return ctx.units.filter((u) => u.id === target.id)
  if (target.kind === "tag")
    return ctx.units.filter((u) => (u.tagIds || []).includes(target.id || ""))
  if (target.kind === "category")
    return ctx.units.filter((u) => u.categoryId === target.id)
  return []
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
): number => {
  const short =
    clause.op === "atLeast" ? clause.value - value : value - clause.value
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
  todayKey: DayKey,
): ClauseReading {
  const applies = clauseCoversDay(clause, dayKey)
  const base = { clause, applies }
  if (!applies) return { ...base, value: 0, deficit: 0, skipped: false }

  const target = clauseTarget(clause)
  const info = targetInfo(target, ctx)

  if (info.check) {
    const state = checkState(day, target.id || "", dayKey, todayKey)
    if (state === "skip")
      return { ...base, value: 0, deficit: 1, skipped: true }
    const value = state === "yes" ? 1 : 0
    return {
      ...base,
      value,
      deficit: deficitOf(clause, value, "count"),
      skipped: false,
    }
  }

  const value =
    info.measure === "time"
      ? minutesOn(day, ctx.slots, clause.slotIds, keepsActivity(target, ctx))
      : countOn(
          dayCounters(day || {}),
          memberUnits(target, ctx).map((u) => u.id),
          clause.slotIds,
        )

  return {
    ...base,
    value,
    deficit: deficitOf(clause, value, info.measure),
    skipped: false,
  }
}

/** Every condition, on one day. */
export function readDay(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): ClauseReading[] {
  return ruleClauses(rule).map((clause) =>
    readClauseDay(clause, ctx, day, dayKey, todayKey),
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
  const deficit = totalDeficit(readDay(rule, ctx, day, dayKey, todayKey))
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
      (sum, k) => sum + readClauseDay(clause, ctx, days[k], k, todayKey).value,
      0,
    )
    return {
      clause,
      applies: covered.length > 0,
      value,
      deficit: covered.length ? deficitOf(clause, value, measure) : 0,
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
  todayKey: DayKey,
): number {
  if (rule.scope === "week") return 1
  return Math.max(1, totalDeficit(readDay(rule, ctx, day, dayKey, todayKey)))
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
      return sum + freezeCost(rule, ctx, day, key, todayKey)
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
  const cost = freezeCost(rule, ctx, day, dayKey, todayKey)
  // Where the freeze is actually written. A week has no row of its own, so it
  // goes on the Monday — and the caller must not have to remember that.
  const key = week ? toKey(weekStart) : dayKey
  return { ok: available >= cost, cost, available, key }
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
  const info = targetInfo(clauseTarget(clause), ctx)
  const when =
    scope === "day" && clause.weekdays?.length
      ? ` on ${listDays(clause.weekdays)}`
      : ""

  if (info.check)
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
  const amount =
    info.measure === "time"
      ? fmtHours(clause.value)
      : `${clause.value} ${clause.value === 1 ? "time" : "times"}`
  return `${info.qualified}${where} ${
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

/** The fields the lock protects. Label, icon, colour and note are not terms. */
export const termsOf = (rule: StreakRule) =>
  JSON.stringify({
    scope: rule.scope,
    clauses: ruleClauses(rule).map((clause) => ({
      ...clause,
      // Normalised, so a rule being written through for the first time — flat
      // fields becoming a target — does not read as an edit to its terms.
      unitId: undefined,
      target: clauseTarget(clause),
    })),
    freezesPerWeek: rule.freezesPerWeek,
    freezeCap: rule.freezeCap,
  })

export const termsChanged = (a: StreakRule, b: StreakRule): boolean =>
  termsOf(a) !== termsOf(b)

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
  if (prev.op === "atLeast" ? next.value < prev.value : next.value > prev.value)
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
  slots: Slot[],
): boolean {
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
  slots: Slot[],
  today = new Date(),
): RuleEdit {
  const todayKey = toKey(today)
  const changed = termsChanged(prev, draft)
  const narrowing = isNarrowing(prev, draft, slots)
  // **The day you write a rule is yours to get it right on.** Setting one up
  // takes several changes — pick the counter, pick the test, pick the number,
  // pick the allowance — and most of them are incomparable to the defaults,
  // so without this the lock closes on the first click and the rule you are
  // left with is the one the app guessed. Nothing here is at risk: the rule
  // has judged nothing yet, so there is no verdict a kinder version could
  // rescue.
  const settingUp = todayKey === prev.startedOn
  const base = { changed, narrowing, settingUp }
  if (!changed) return { ...base, narrowing: true, allowed: true, next: draft }
  if (narrowing) return { ...base, allowed: true, next: draft }
  if (settingUp) return { ...base, allowed: true, next: draft }
  const allowed = todayKey >= prev.lockedUntil
  return {
    ...base,
    allowed,
    next: allowed ? { ...draft, lockedUntil: lockFrom(today) } : prev,
  }
}
