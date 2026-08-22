/* ---------------------------------------------------------------
   Custom streaks — `spec 009`, part 2.

   A rule is a sentence: *judge every [day / week], keeping [this counter] in
   [these slots] [at least / at most] [n] on [these weekdays]* — **and as many
   more conditions as the promise needs.** One shape covers every rule the
   feature was designed against, which is the test that it is the right shape.

   Four ideas do all the work here.

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
  CounterUnit,
  Day,
  DayKey,
  Project,
  RuleVerdict,
  Slot,
  StreakClause,
  StreakRule,
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
import { makeId } from "./id"
import { EDIT_HORIZON_DAYS, isEditableDay, isSealable } from "./freezes"

/** How long a loosening waits. A week, so a bad Tuesday cannot rewrite Tuesday. */
export const LOCK_DAYS = 7

/** The date a rule edited today unlocks on. */
export const lockFrom = (today: Date): DayKey =>
  toKey(addDays(today, LOCK_DAYS))

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
      unitId: rule.unitId || "",
      slotIds: rule.slotIds,
      op: rule.op || "atMost",
      value: rule.value ?? 0,
      weekdays: rule.weekdays,
    },
  ]
}

export const newClause = (unitId: string): StreakClause => ({
  id: makeId("clause"),
  unitId,
  op: "atMost",
  value: 0,
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
  unitId: string,
  today: Date,
): Omit<StreakRule, "id" | "label" | "color" | "iconName"> {
  return {
    scope: "day",
    clauses: [newClause(unitId)],
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

const deficitOf = (clause: StreakClause, value: number): number =>
  clause.op === "atLeast"
    ? Math.max(0, clause.value - value)
    : Math.max(0, value - clause.value)

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
  unit: CounterUnit | undefined,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): ClauseReading {
  const applies = clauseCoversDay(clause, dayKey)
  const base = { clause, applies }
  if (!applies) return { ...base, value: 0, deficit: 0, skipped: false }

  if (unit && isCheck(unit)) {
    const state = checkState(day, unit.id, dayKey, todayKey)
    if (state === "skip")
      return { ...base, value: 0, deficit: 1, skipped: true }
    const value = state === "yes" ? 1 : 0
    return { ...base, value, deficit: deficitOf(clause, value), skipped: false }
  }

  const counters = dayCounters(day || {})
  const value = clause.slotIds?.length
    ? clause.slotIds.reduce(
        (sum, slotId) => sum + slotUnitValue(counters, clause.unitId, slotId),
        0,
      )
    : unitDayTotal(counters, clause.unitId)
  return { ...base, value, deficit: deficitOf(clause, value), skipped: false }
}

const unitFor = (units: CounterUnit[], clause: StreakClause) =>
  units.find((u) => u.id === clause.unitId)

/** Every condition, on one day. */
export function readDay(
  rule: StreakRule,
  units: CounterUnit[],
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): ClauseReading[] {
  return ruleClauses(rule).map((clause) =>
    readClauseDay(clause, unitFor(units, clause), day, dayKey, todayKey),
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
  units: CounterUnit[],
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): RuleState {
  if (dayKey > todayKey || !judgesDay(rule, dayKey)) return "unjudged"
  if (isFrozenFor(day, rule.id)) return "frozen"
  const deficit = totalDeficit(readDay(rule, units, day, dayKey, todayKey))
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
  units: CounterUnit[],
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): ClauseReading[] {
  const keys = weekDates(weekStart)
    .map(toKey)
    .filter((k) => k <= todayKey && k >= rule.startedOn)
  return ruleClauses(rule).map((clause) => {
    const unit = unitFor(units, clause)
    const covered = keys.filter((k) => clauseCoversDay(clause, k))
    const value = covered.reduce(
      (sum, k) =>
        sum + readClauseDay(clause, unit, days[k], k, todayKey).value,
      0,
    )
    return {
      clause,
      applies: covered.length > 0,
      value,
      deficit: covered.length ? deficitOf(clause, value) : 0,
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
  units: CounterUnit[],
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
  const deficit = totalDeficit(readWeek(rule, units, days, weekStart, todayKey))
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
  units: CounterUnit[],
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): boolean {
  if (rule.scope === "week") {
    const state = ruleWeekState(rule, units, days, weekStart, todayKey)
    return state === "met" || state === "frozen"
  }
  let judged = 0
  for (const date of weekDates(weekStart)) {
    const key = toKey(date)
    const state = ruleDayState(rule, units, days[key], key, todayKey)
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
  units: CounterUnit[],
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): number {
  if (rule.scope === "week") return 1
  return Math.max(1, totalDeficit(readDay(rule, units, day, dayKey, todayKey)))
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
  const units = project.counterUnits || []
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
        kept: weekKept(rule, units, days, w, todayKey),
        sealedAt: new Date().toISOString(),
      })
      return
    }
    open.push({
      weekStart: weekKey,
      wouldKeep: weekKept(rule, units, days, w, todayKey),
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
      return sum + freezeCost(rule, units, day, key, todayKey)
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
      ? weeks.map((w) => ruleWeekState(rule, units, days, w, todayKey))
      : weeks
          .flatMap(weekDates)
          .map(toKey)
          .filter((k) => k >= rule.startedOn && k <= todayKey)
          .map((k) => ruleDayState(rule, units, days[k], k, todayKey))

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
  const units = project.counterUnits || []
  const available = status.freezes.weeklyLeft + status.freezes.banked
  const weekStart = startOfWeek(fromKey(dayKey))
  const week = rule.scope === "week"
  const state = week
    ? ruleWeekState(rule, units, project.days, weekStart, todayKey)
    : ruleDayState(rule, units, day, dayKey, todayKey)
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
  const cost = freezeCost(rule, units, day, dayKey, todayKey)
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
  units: CounterUnit[],
  slots: Slot[],
  scope: StreakRule["scope"] = "day",
): string {
  const unit = unitFor(units, clause)
  const name = unit?.label || "a removed counter"
  const when =
    scope === "day" && clause.weekdays?.length
      ? ` on ${listDays(clause.weekdays)}`
      : ""

  if (unit && isCheck(unit))
    return `${name} must be ${clause.op === "atLeast" ? "yes" : "no"}${when}`

  const where = clause.slotIds?.length
    ? ` in ${clause.slotIds
        .map((id) => slots.find((s) => s.id === id)?.label || "a removed slot")
        .join(", ")}`
    : ""
  const times = clause.value === 1 ? "time" : "times"
  return `${name}${where} ${
    clause.op === "atLeast" ? "at least" : "at most"
  } ${clause.value} ${times}${when}`
}

/** The whole rule in one line — the scope, then every condition joined by "and". */
export function ruleSentence(
  rule: StreakRule,
  units: CounterUnit[],
  slots: Slot[],
): string {
  const when = rule.scope === "week" ? "Every week" : "Every day"
  const parts = ruleClauses(rule).map((clause) =>
    clauseSentence(clause, units, slots, rule.scope),
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
    clauses: ruleClauses(rule),
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
function clauseNarrows(
  prev: StreakClause,
  next: StreakClause,
  slots: Slot[],
): boolean {
  if (prev.unitId !== next.unitId) return false
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
