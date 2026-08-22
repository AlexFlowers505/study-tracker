/* ---------------------------------------------------------------
   Custom streaks — `spec 009`, part 2.

   A rule is a sentence: *judge every [day / week / these weekdays], keeping
   [a counter] in [these slots] [at least / at most] [n].* One shape covers
   every rule the feature was designed against, which is the test that it is
   the right shape.

   Three ideas do all the work here.

   **Failure has a size.** Not "the day broke" but *by how much* — the deficit.
   A freeze pays for one unit of it, and a period is frozen only if the whole
   deficit can be paid. Two youtube slips in one evening is a deficit of two,
   one freeze is not enough, nothing is spent, and the streak breaks. That
   falls out of the arithmetic rather than being a special case, and partial
   spending is refused on purpose: a day that breaks anyway should not also
   cost you the freeze.

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
import { EDIT_HORIZON_DAYS, isEditableDay, isSealable } from "./freezes"

/** How long a loosening waits. A week, so a bad Tuesday cannot rewrite Tuesday. */
export const LOCK_DAYS = 7

/** The date a rule edited today unlocks on. */
export const lockFrom = (today: Date): DayKey =>
  toKey(addDays(today, LOCK_DAYS))

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
    unitId,
    op: "atMost",
    value: 0,
    freezesPerWeek: 1,
    freezeCap: 15,
    startedOn: toKey(today),
    lockedUntil: toKey(today),
  }
}

/* ---- Reading a rule against the data ------------------------------------ */

export type RuleState = "met" | "frozen" | "missed" | "pending" | "unjudged"

export interface RuleReading {
  /** What the rule measured. */
  value: number
  /** How far over or short, in whole units. Zero when the rule was kept. */
  deficit: number
  /** A check marked "skip": a miss, but one you chose rather than suffered. */
  skipped: boolean
}

const deficitOf = (rule: StreakRule, value: number): number =>
  rule.op === "atLeast"
    ? Math.max(0, rule.value - value)
    : Math.max(0, value - rule.value)

/**
 * One day, measured.
 *
 * A **check** reads as one for yes and nothing for no — including the `no` an
 * unrecorded past day resolves to, which is what makes the common case free.
 * `skip` is a deficit of one whichever way the comparison runs: it is not an
 * exemption, and everything else about the streaks in this app follows the
 * same rule, or marking the bad days ignored would be the easy way to fake
 * one. What it buys is honesty in the record, not leniency.
 *
 * A **tally** is its count, across the rule's slots or across the whole day
 * when the rule names none.
 */
export function readDay(
  rule: StreakRule,
  unit: CounterUnit | undefined,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): RuleReading {
  if (unit && isCheck(unit)) {
    const state = checkState(day, unit.id, dayKey, todayKey)
    if (state === "skip") return { value: 0, deficit: 1, skipped: true }
    const value = state === "yes" ? 1 : 0
    return { value, deficit: deficitOf(rule, value), skipped: false }
  }
  const counters = dayCounters(day || {})
  const value = rule.slotIds?.length
    ? rule.slotIds.reduce(
        (sum, slotId) => sum + slotUnitValue(counters, rule.unitId, slotId),
        0,
      )
    : unitDayTotal(counters, rule.unitId)
  return { value, deficit: deficitOf(rule, value), skipped: false }
}

/**
 * Whether this rule has anything to say about this day.
 *
 * A weekday the rule leaves out is the one honest "does not apply" the feature
 * has, and it is honest because it was declared in advance: Saturday is not a
 * gym day because you said so last Tuesday, not because Saturday went badly.
 */
export function judgesDay(rule: StreakRule, dayKey: DayKey): boolean {
  if (rule.scope !== "day") return false
  if (dayKey < rule.startedOn) return false
  if (!rule.weekdays?.length) return true
  return rule.weekdays.includes(fromKey(dayKey).getDay())
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
  unit: CounterUnit | undefined,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): RuleState {
  if (dayKey > todayKey || !judgesDay(rule, dayKey)) return "unjudged"
  if (isFrozenFor(day, rule.id)) return "frozen"
  const { deficit } = readDay(rule, unit, day, dayKey, todayKey)
  if (deficit === 0) return "met"
  return dayKey === todayKey ? "pending" : "missed"
}

/** A whole week, for a rule that judges weeks. Its days summed, then compared once. */
export function readWeek(
  rule: StreakRule,
  unit: CounterUnit | undefined,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): RuleReading {
  const value = weekDates(weekStart)
    .map(toKey)
    .filter((k) => k <= todayKey && k >= rule.startedOn)
    .reduce(
      (sum, k) => sum + readDay(rule, unit, days[k], k, todayKey).value,
      0,
    )
  return { value, deficit: deficitOf(rule, value), skipped: false }
}

/**
 * A week's standing under a rule that judges weeks.
 *
 * The freeze lives on the week's Monday: a week has no row of its own, and its
 * first day is the one place both halves of the app can agree to look.
 */
export function ruleWeekState(
  rule: StreakRule,
  unit: CounterUnit | undefined,
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
  const { deficit } = readWeek(rule, unit, days, weekStart, todayKey)
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
  unit: CounterUnit | undefined,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): boolean {
  if (rule.scope === "week") {
    const state = ruleWeekState(rule, unit, days, weekStart, todayKey)
    return state === "met" || state === "frozen"
  }
  let judged = 0
  for (const date of weekDates(weekStart)) {
    const key = toKey(date)
    const state = ruleDayState(rule, unit, days[key], key, todayKey)
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
  unit: CounterUnit | undefined,
  day: Day | undefined,
  dayKey: DayKey,
  todayKey: DayKey,
): number {
  if (rule.scope === "week") return 1
  return Math.max(1, readDay(rule, unit, day, dayKey, todayKey).deficit)
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
  unit: CounterUnit | undefined
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
  const unit = (project.counterUnits || []).find((u) => u.id === rule.unitId)
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
        kept: weekKept(rule, unit, days, w, todayKey),
        sealedAt: new Date().toISOString(),
      })
      return
    }
    open.push({
      weekStart: weekKey,
      wouldKeep: weekKept(rule, unit, days, w, todayKey),
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
      return sum + freezeCost(rule, unit, day, key, todayKey)
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
      ? weeks.map((w) => ruleWeekState(rule, unit, days, w, todayKey))
      : weeks
          .flatMap(weekDates)
          .map(toKey)
          .filter((k) => k >= rule.startedOn && k <= todayKey)
          .map((k) => ruleDayState(rule, unit, days[k], k, todayKey))

  let best = 0
  let run = 0
  states.forEach((s) => {
    if (s === "unjudged" || s === "pending") return
    if (s === "missed") run = 0
    else run += 1
    if (run > best) best = run
  })
  // The tail of the same walk: whatever run was still going at the end.
  return { rule, unit, current: run, best, freezes, pending, open }
}

/**
 * Whether a freeze can go on this day, what it would cost, and what there is
 * to pay with.
 *
 * The window is today and yesterday, the same one the log itself is written
 * in — widened to "any day of this week is" for a rule that judges weeks. A weekly allowance spent on any still-open day was the alternative and
 * was dropped: two windows have to be explained separately every time either
 * appears, and "you can freeze it until Tuesday but only log it until
 * tomorrow" is not a sentence anybody should have to hold. So the allowance is
 * weekly in how it is granted and daily in how it is spent.
 */
export function freezeOffer(
  rule: StreakRule,
  project: Project,
  dayKey: DayKey,
  todayKey: DayKey,
  status: RuleStatus,
): { ok: boolean; cost: number; available: number; key: DayKey } {
  const day = project.days[dayKey]
  const available = status.freezes.weeklyLeft + status.freezes.banked
  const weekStart = startOfWeek(fromKey(dayKey))
  const week = rule.scope === "week"
  const state = week
    ? ruleWeekState(rule, status.unit, project.days, weekStart, todayKey)
    : ruleDayState(rule, status.unit, day, dayKey, todayKey)
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
  const cost = freezeCost(rule, status.unit, day, dayKey, todayKey)
  // Where the freeze is actually written. A week has no row of its own, so it
  // goes on the Monday — and the caller must not have to remember that.
  const key = week ? toKey(weekStart) : dayKey
  return { ok: available >= cost, cost, available, key }
}

/* ---- Saying it back ------------------------------------------------------ */

/**
 * The rule in words, as the form writes it and the panel reads it back.
 *
 * Worth a function rather than a template at each call site: the whole point
 * of the sentence is that it is the same sentence everywhere, or checking one
 * against the other tells you nothing.
 */
export function ruleSentence(
  rule: StreakRule,
  unit: CounterUnit | undefined,
  slots: Slot[],
): string {
  const name = unit?.label || "a removed counter"
  const when =
    rule.scope === "week"
      ? "Every week"
      : rule.weekdays?.length
        ? `On ${rule.weekdays
            .slice()
            .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
            .map((wd) => WEEKDAY_LABELS[wd])
            .join(", ")}`
        : "Every day"

  if (unit && isCheck(unit))
    return `${when}: ${name} must be ${rule.op === "atLeast" ? "yes" : "no"}.`

  const where = rule.slotIds?.length
    ? ` in ${rule.slotIds
        .map((id) => slots.find((s) => s.id === id)?.label || "a removed slot")
        .join(", ")}`
    : ""
  const times = rule.value === 1 ? "time" : "times"
  return `${when}: ${name}${where} ${
    rule.op === "atLeast" ? "at least" : "at most"
  } ${rule.value} ${times}.`
}

/* ---- The lock ------------------------------------------------------------ */

/** The weekdays a rule judges. No list means all seven. */
const weekdaysOf = (rule: StreakRule): Set<number> =>
  new Set(rule.weekdays?.length ? rule.weekdays : WEEKDAY_ORDER)

/** The slots a rule counts. No list means the whole day, which is every slot. */
const slotsOf = (rule: StreakRule, slots: Slot[]): Set<string> =>
  new Set(rule.slotIds?.length ? rule.slotIds : slots.map((s) => s.id))

const covers = <T,>(bigger: Set<T>, smaller: Set<T>): boolean =>
  [...smaller].every((x) => bigger.has(x))

/** The fields the lock protects. Label, icon, colour and note are not terms. */
export const TERMS = [
  "scope",
  "weekdays",
  "unitId",
  "slotIds",
  "op",
  "value",
  "freezesPerWeek",
  "freezeCap",
] as const

export const termsChanged = (a: StreakRule, b: StreakRule): boolean =>
  TERMS.some((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))

/**
 * Can it be proved that `next` cannot be easier to keep than `prev`?
 *
 * **One-sided on purpose.** A false here means "not proven", not "looser" —
 * inverting the comparison, swapping the counter and switching between judging
 * a day and judging a week are all genuinely incomparable, and all of them
 * land here as false and wait. Nothing has to decide what they were.
 *
 * The two slot rows point in opposite directions for the same edit, and that
 * is not a mistake: under `atMost` a slot is a place you can be caught, so
 * adding one narrows the ways through; under `atLeast` a slot is a place the
 * count can come from, so adding one widens them.
 *
 * Every dimension must be no-easier. One easier dimension is enough to make
 * the whole edit wait — they are not a currency you can trade between.
 */
export function isNarrowing(
  prev: StreakRule,
  next: StreakRule,
  slots: Slot[],
): boolean {
  if (prev.unitId !== next.unitId) return false
  if (prev.scope !== next.scope) return false
  if (prev.op !== next.op) return false
  if (prev.op === "atLeast" ? next.value < prev.value : next.value > prev.value)
    return false
  // More judged days is harder; dropping one is a day that stops being asked
  // about at all.
  if (!covers(weekdaysOf(next), weekdaysOf(prev))) return false
  const ps = slotsOf(prev, slots)
  const ns = slotsOf(next, slots)
  if (prev.op === "atMost" ? !covers(ns, ps) : !covers(ps, ns)) return false
  if (next.freezesPerWeek > prev.freezesPerWeek) return false
  if (next.freezeCap > prev.freezeCap) return false
  return true
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
