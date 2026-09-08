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
  RuleFreeze,
  Activity,
  Category,
  CheckState,
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
  TimeWindow,
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
import {
  CHECK_CHOICES,
  CHECK_LABELS,
  checkState,
  counterKind,
  isCheck,
} from "./checks"
import { dayCounters, slotUnitValue, unitDayTotal } from "./counters"
import { entryActivity } from "./entries"
import { makeId } from "./id"
import { pluralOf, t } from "./i18n"
import { fmtHours, minutesToTime, timeToMinutes } from "./time"
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
   * the benchmark reads back. Empty when nothing is nominated, which
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
 * What a condition asks for: a floor, a ceiling, or both.
 *
 * **The one place that knows a condition used to carry an operator and a
 * single number.** `atLeast n` was a floor, `atMost n` a ceiling, and neither
 * could say the other at the same time — so "between two and four hours a day"
 * had no way of being written. Nothing else may read `op` or `value`.
 */
export interface ClauseBounds {
  min?: number
  max?: number
}

/**
 * What this condition is held to on a given **weekday**.
 *
 * Every question about a condition's numbers is really a question about a
 * weekday, and working in weekdays rather than dates is what lets the lock and
 * the benchmark ask without inventing a date first.
 */
export const figuresPerDay = (clause: StreakClause): boolean =>
  !!clause.days &&
  WEEKDAY_ORDER.some((wd) => {
    const entry = clause.days?.[wd]
    return !!entry && (entry.min !== undefined || entry.max !== undefined)
  })

/**
 * The same question about a **named slot's** figures.
 *
 * `days` carries three unrelated per-day answers, and each of them has to be
 * asked about separately or one silently speaks for another — which is the
 * whole reason `figuresPerDay` exists. A map that states which slots count on
 * a Tuesday says nothing about what the Evening is allowed, and a map that
 * states what the Evening is allowed on a Tuesday says nothing about the
 * condition's own figure.
 */
export const slotFiguresPerDay = (clause: StreakClause): boolean =>
  !!clause.days &&
  WEEKDAY_ORDER.some((wd) => {
    const own = clause.days?.[wd]?.slots
    return !!own && Object.keys(own).length > 0
  })

/**
 * The same question about the **windows** — `spec 023`.
 *
 * A fourth independent per-day answer, and the third time this note has had to
 * be written: `days` is one map carrying unrelated things, and each of them
 * must be asked about on its own or a map written for one blanks another. A
 * map saying which slots Tuesday counts says nothing about when Tuesday had to
 * start.
 */
export const windowsPerDay = (clause: StreakClause): boolean =>
  !!clause.days &&
  WEEKDAY_ORDER.some((wd) => {
    const own = clause.days?.[wd]
    return !!own && (hasWindow(own.startWindow) || hasWindow(own.endWindow))
  })

/** Does this window wall anything in at all? */
export const hasWindow = (w: TimeWindow | undefined): boolean =>
  !!w && (w.from !== undefined || w.to !== undefined)

/**
 * When this condition's work had to begin and end on a given weekday.
 *
 * Shaped exactly like `boundsOnWeekday`, and for the same reasons: the
 * per-day map wins when some day in it states a window, and otherwise the
 * shared pair stands. A weekday the map does not mention at all is a weekday
 * the condition does not judge, so it asks nothing.
 */
export const windowsOnWeekday = (
  clause: StreakClause,
  weekday: number,
): { start: TimeWindow; end: TimeWindow } => {
  if (clause.days && windowsPerDay(clause)) {
    const own = clause.days[weekday]
    return { start: own?.startWindow ?? {}, end: own?.endWindow ?? {} }
  }
  if (clause.days && !clause.days[weekday]) return { start: {}, end: {} }
  return { start: clause.startWindow ?? {}, end: clause.endWindow ?? {} }
}

export const boundsOnWeekday = (
  clause: StreakClause,
  ctx: StreakContext,
  weekday: number,
): ClauseBounds => {
  /* Per-day numbers are the explicit version and win over everything: writing
     them out is exactly the act of saying the flat pair was not enough.

     **But only when there are any.** `days` carries three different per-day
     answers now — the figure, which slots count, and what a named slot owes —
     and a map holding nothing but the last two used to blank the figure
     entirely: asking for individual slots silently deleted the two hours a
     day the rule was about. So the map governs the figure only when some day
     in it actually states one, and otherwise the shared pair stands. A day
     deliberately left blank while its siblings carry figures still asks
     nothing, which is the meaning that had to survive. */
  if (clause.days && figuresPerDay(clause)) {
    const own = clause.days[weekday]
    return own ? { min: own.min, max: own.max } : {}
  }
  if (clause.days && !clause.days[weekday]) return {}
  /* **A condition still pointing at the daily goal.** Nothing can create one
     any more — the switch is gone from the form and the goal is gone from
     Setup — and `migrations/019` rewrites the ones that exist into explicit
     figures. This branch is what makes that migration's timing harmless: drop
     it and an unmigrated condition falls through to `min: 0`, which every day
     clears, so a rule would quietly stop judging and its red days would turn
     green. Failing that way round is much worse than carrying a dead branch
     until the migration has been everywhere. */
  if (clause.useDailyGoal) return { min: ctx.dailyGoals[weekday] || 0 }
  if (clause.min !== undefined || clause.max !== undefined)
    return { min: clause.min, max: clause.max }
  // Written before the pair existed: one bound, whichever the operator named.
  if (clause.op === "atMost") return { max: clause.value ?? 0 }
  if (clause.op === "atLeast" || clause.value !== undefined)
    return { min: clause.value ?? 0 }
  /* **Nothing asked reads as nothing**, not as `min: 0`.
     That last line used to be `return { min: clause.value ?? 0 }`, which
     invented a floor of nought for a condition carrying no bound and no
     operator at all — the very failure the comment above warns about, written
     into the fallback itself. It made a bound-less condition look constrained
     to anything checking, so `clauseAsksNothing` could not see it. */
  return {}
}

/**
 * Which slots a weekday counts in: the condition's shared list, unless that
 * weekday overrode it.
 *
 * `undefined` means every slot, exactly as an empty `slotIds` does — the two
 * spellings of "no restriction" collapse here so nothing downstream has to
 * know there were two.
 */
export const slotIdsOnWeekday = (
  clause: StreakClause,
  weekday: number,
): string[] | undefined => {
  const own = clause.days?.[weekday]?.slotIds
  if (own?.length) return own
  return clause.slotIds?.length ? clause.slotIds : undefined
}

/**
 * The slot requirements in force on a weekday: the condition's shared ones,
 * unless that weekday overrode them.
 */
export const slotBoundsOnWeekday = (
  clause: StreakClause,
  weekday: number,
): Record<string, ClauseBounds> =>
  clause.days?.[weekday]?.slots ?? clause.slots ?? {}

/** The same, for a date. */
export const clauseBounds = (
  clause: StreakClause,
  ctx: StreakContext,
  dayKey: DayKey,
): ClauseBounds => boundsOnWeekday(clause, ctx, fromKey(dayKey).getDay())

/**
 * Which weekdays a condition judges at all.
 *
 * With per-day numbers the keys *are* the answer — a weekday nobody wrote a
 * figure for is a weekday nothing is owed on, which is the same statement.
 */
export const clauseWeekdays = (clause: StreakClause): number[] =>
  clause.days
    ? WEEKDAY_ORDER.filter((wd) => clause.days![wd] !== undefined)
    : /* **A check's accepted answers carry its weekdays too.** The map holds
         one entry per day it asks about, so a weekday left out of it is one
         the condition does not judge — exactly as a weekday left out of
         `days` is. Without this the form drew two controls for one question:
         a grid whose empty row said `not judged`, which was a lie, and a
         separate weekday row that was the only thing actually deciding it. */
      clause.allow
      ? WEEKDAY_ORDER.filter((wd) => (clause.allow![wd] ?? []).length > 0)
      : clause.weekdays?.length
        ? clause.weekdays
        : [...WEEKDAY_ORDER]

/** The bounds a week asks for: each present side summed over its days. */
export const weekBounds = (
  clause: StreakClause,
  ctx: StreakContext,
  keys: DayKey[],
): ClauseBounds => {
  /* **A flat bound is the week's own figure, and must not be summed.**

     This function summed unconditionally, which multiplied whatever you typed
     by the number of days in the week: `at least 3 a week` asked for 21 and
     `at most 3 a week` allowed 21, so every weekly count rule was either
     unachievable or unbreakable. *Three gym trips a week* — the example this
     whole shape was designed around — needed twenty-one.

     The form labels that field `Per week`, and it means it. Summing is right
     for the *other* shape: writing out a figure per weekday is exactly the act
     of saying each day has its own, and then the week is their total. So the
     two are told apart by which the condition actually carries.

     **`figuresPerDay`, not the mere presence of `days`.** That guard was
     written when the map held nothing but figures, and it has not been true
     for some time: `days` now carries which slots a weekday counts in and what
     a named slot owes there as well, so the weekday picker and the per-weekday
     slot grid both write a map with no figure in it. `boundsOnWeekday` learned
     that distinction when it was introduced — this function did not, and went
     on multiplying by seven the moment a weekly rule was told which weekdays
     it judged. *At most three Pinterest a week, none in the evening* then
     allowed twenty-one, which is a rule that cannot be broken by anything a
     person could do in a week: a ceiling that never speaks is worse than no
     rule at all, because you believe it is watching. */
  if (!figuresPerDay(clause) && !clause.useDailyGoal)
    /* **A weekday the condition actually judges**, not any weekday at all.
       It used to be `0` under a comment saying the weekday is not read when
       the bound is flat — true only while `!clause.days` guaranteed there was
       no map to read. `boundsOnWeekday` answers `{}` for a weekday missing
       from the map, so a weekly rule told to judge Mon–Fri asked Sunday what
       it was held to, got *nothing*, and lost its ceiling outright. */
    return boundsOnWeekday(clause, ctx, clauseWeekdays(clause)[0] ?? 0)

  const each = keys.map((k) => clauseBounds(clause, ctx, k))
  const sum = (pick: (b: ClauseBounds) => number | undefined) =>
    each.some((b) => pick(b) !== undefined)
      ? each.reduce((total, b) => total + (pick(b) ?? 0), 0)
      : undefined
  return { min: sum((b) => b.min), max: sum((b) => b.max) }
}

/**
 * The same question for a named slot: what that slot is allowed across the
 * week. Per-weekday slot figures sum; a flat one is the week's.
 */
export const weekSlotBounds = (
  clause: StreakClause,
  keys: DayKey[],
): Record<string, ClauseBounds> => {
  /* `slotFiguresPerDay` for exactly the reason `weekBounds` uses
     `figuresPerDay`: a `days` map with no slot figures in it is not a
     statement that each weekday has its own, so the shared pair is the week's
     and summing it multiplies it by seven. It hid behind the commonest rider
     there is — seven noughts add up to a nought — and surfaced the moment
     anybody wrote *at most one in the evening a week*. */
  if (!slotFiguresPerDay(clause)) return clause.slots ?? {}
  const out: Record<string, ClauseBounds> = {}
  keys.forEach((key) => {
    const weekday = fromKey(key).getDay()
    Object.entries(slotBoundsOnWeekday(clause, weekday)).forEach(
      ([slotId, bounds]) => {
        const at = out[slotId] ?? {}
        if (bounds.min !== undefined) at.min = (at.min ?? 0) + bounds.min
        if (bounds.max !== undefined) at.max = (at.max ?? 0) + bounds.max
        out[slotId] = at
      },
    )
  })
  return out
}

/** The same, summed over every day of a week the condition covers. */

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
  if (target.kind !== "category" && target.kind !== "tag") return "count"
  if (target.measure) return target.measure
  /* **A tag reads like a category now, and for the same reason** — `spec 019`.
     With activities tagged, a tag can hold things that record time and things
     that record a count, so it stores its measure explicitly: filing one more
     counter under it must never change what a rule written months ago is
     measuring. The fallback is what every existing tag rule means — counts,
     if it reaches any counters at all. */
  const holds =
    target.kind === "category"
      ? ctx.units.some((u) => u.categoryId === target.id)
      : ctx.units.some((u) => (u.tagIds || []).includes(target.id || ""))
  return holds ? "count" : "time"
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

  if (target.kind === "time") return plain(t("Logged time"))

  if (target.kind === "activity") {
    const activity = byId(ctx.activities, target.id)
    return plain(activity?.label || t("a removed activity"), activity)
  }

  if (target.kind === "category") {
    const category = byId(ctx.categories, target.id)
    const label = category?.label || t("a removed category")
    return {
      ...plain(label, category),
      qualified: t("{name} (category)", { name: label }),
    }
  }

  if (target.kind === "tag") {
    const tag = byId(ctx.tags, target.id)
    const label = tag?.label || t("a removed tag")
    return { ...plain(label, tag), qualified: t("{name} (tag)", { name: label }) }
  }

  const unit = byId(ctx.units, target.id)
  return {
    ...plain(unit?.label || t("a removed counter"), unit),
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
/**
 * **A name or a figure, marked as one.**
 *
 * These sentences are read back to check them against what you meant, and at
 * one weight `Wake up in time and Go to bed in time must each be yes` is a
 * wall. The quotes go in the string rather than into markup because the same
 * sentence is handed to tooltips, to the supervisor's plain-text summary and
 * to the change log, none of which can carry markup — and a bare string with
 * quotes in it still separates a three-word counter name from the words
 * around it. `ui/Sentence` gives the same spans weight where it can.
 */
/** «раз» declines: 1 раз, 2 раза, 5 раз. */
const nDaysWord = (n: number) =>
  pluralOf(n, ["day", "days"], ["день", "дня", "дней"])

const nTimes = (n: number) =>
  pluralOf(n, ["time", "times"], ["раз", "раза", "раз"]).replace(
    /^-?\d+\s/,
    "",
  )

export const q = (text: string | number): string =>
  `“${text}”`

export function targetsLabel(
  targets: StreakTarget[],
  ctx: StreakContext,
  /**
   * `or` for a count — the condition adds them up, so any of them can supply
   * the number. `and` where each one is asserted separately, which is what
   * a set of checks against an accepted answer is. Getting this backwards
   * describes a promise nobody made.
   */
  join: "or" | "and" = "or",
): string {
  const names = targets.map((target) => q(targetInfo(target, ctx).qualified))
  if (names.length === 1) return names[0]
  if (names.length > 3)
    return t(join === "and" ? "all of {n} things" : "any of {n} things", {
      n: q(names.length),
    })
  return t("{list} {join} {last}", {
    list: names.slice(0, -1).join(", "),
    join: t(join === "and" ? "join:and" : "join:or"),
    last: names.at(-1) ?? "",
  })
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
/**
 * The units a set of targets adds up, without duplicates.
 *
 * Split out from `clauseUnits` so anything holding targets can ask — an
 * achievement names them too, and `spec 014` gave it the same picker, which
 * has to resolve a shelf into its contents the same way.
 */
export const targetsUnits = (
  targets: StreakTarget[],
  ctx: StreakContext,
): CounterUnit[] => {
  const seen = new Set<string>()
  const out: CounterUnit[] = []
  targets.forEach((target) => {
    memberUnits(target, ctx).forEach((unit) => {
      if (seen.has(unit.id)) return
      seen.add(unit.id)
      out.push(unit)
    })
  })
  return out
}

/** The same, for a condition. */
export const clauseUnits = (
  clause: StreakClause,
  ctx: StreakContext,
): CounterUnit[] => targetsUnits(clauseTargets(clause), ctx)

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
  // A tag reaches activities too since `spec 019`, so it needs the same branch
  // its sibling has rather than falling through to "everything".
  if (target.kind === "tag") {
    const ids = new Set(
      ctx.activities
        .filter((a) => (a.tagIds || []).includes(target.id || ""))
        .map((a) => a.id),
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

/**
 * **The two ends of a day's work**, over the same entries `minutesOn` adds up.
 *
 * `first` is the earliest start among them and `last` the latest end, both in
 * minutes from this day's midnight. Only entries that carry the time in
 * question contribute: one with no start says nothing about when the day
 * began, and guessing from its neighbours would be inventing data.
 *
 * **`last` may run past 1440, and has to.** An entry whose end is before its
 * own start ran into the next day, so 23:30–00:30 finished at 1470 rather
 * than at 30 — and read the other way it would be the *earliest* finish on the
 * day, which turns *finish by six* into a promise a midnight session keeps.
 *
 * Sleep is deliberately absent: it is measured on the rotated 18:00 clock,
 * where "earlier" is a different word, and a window on that frame is its own
 * piece of thinking. Callers gate on the target rather than this returning
 * something misleading.
 */
export interface DayEdges {
  first?: number
  last?: number
}

const edgesIn = (
  day: Day | undefined,
  slots: Slot[],
  slotIds: string[] | undefined,
  keep: (activityId: string) => boolean,
): DayEdges => {
  const cells = day?.cells
  if (!cells) return {}
  const ids = slotIds?.length ? slotIds : slots.map((slot) => slot.id)
  let first: number | undefined
  let last: number | undefined
  ids.forEach((slotId) => {
    ;(cells[slotId] || []).forEach((entry) => {
      if (!keep(String(entryActivity(entry)))) return
      if (entry.start) {
        const at = timeToMinutes(entry.start)
        if (first === undefined || at < first) first = at
      }
      if (entry.end) {
        const raw = timeToMinutes(entry.end)
        // Past midnight: the session belongs to this day and finished after it.
        const at =
          entry.start && raw < timeToMinutes(entry.start) ? raw + 1440 : raw
        if (last === undefined || at > last) last = at
      }
    })
  })
  return { first, last }
}

/**
 * The day's edges as this condition sees them — the entries it counts, in the
 * slots that weekday collects from.
 *
 * Nothing for a target with no clock behind it: a tally is a number of
 * occurrences and sleep is on another frame. Both simply have no beginning
 * this can read, and returning `{}` is what makes every caller's window hold
 * rather than break.
 */
export const edgesOn = (
  clause: StreakClause,
  ctx: StreakContext,
  day: Day | undefined,
  slotIds: string[] | undefined,
): DayEdges => {
  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)
  if (info.measure !== "time") return {}
  return edgesIn(day, ctx.slots, slotIds, keepsAnyActivity(targets, ctx))
}

/**
 * Is a moment outside its window?
 *
 * **A moment that never happened is outside nothing.** A day with no counted
 * work has no beginning to be late, and calling that a break would make every
 * empty day fail a rule about when to start — which is not what the rule says
 * and not what anybody means by it. The floor is what makes you turn up; this
 * only says when.
 */
/**
 * A moment from `DayEdges` as a clock face.
 *
 * `last` can run past midnight, so 1470 has to read as `00:30` and say which
 * day it is on — otherwise a session that finished at half past midnight
 * reports a time nobody's clock has ever shown.
 */
export const atClock = (minutes: number): string =>
  minutes >= 1440
    ? `${minutesToTime(minutes - 1440)}${t("frag:+1d")}`
    : minutesToTime(minutes)

export const outsideWindow = (
  at: number | undefined,
  window: TimeWindow,
): boolean => {
  if (at === undefined) return false
  if (window.from !== undefined && at < timeToMinutes(window.from)) return true
  if (window.to !== undefined && at > timeToMinutes(window.to)) return true
  return false
}

/**
 * What a condition's windows say about one day: which of the two broke, and
 * whether the break is already spent.
 *
 * **Only a missed *finish no earlier than* is still open.** Starting too early
 * cannot be unstarted, starting too late cannot be made earlier, and finishing
 * too late is done — all three are spent the moment they happen, the same way
 * a breached ceiling is. Being asked to work until five is the one that the
 * rest of the day can still put right, so it settles when the day does.
 */
export const windowBreaks = (
  clause: StreakClause,
  ctx: StreakContext,
  day: Day | undefined,
  weekday: number,
  slotIds: string[] | undefined,
): { start: boolean; end: boolean; spent: boolean } => {
  const windows = windowsOnWeekday(clause, weekday)
  if (!hasWindow(windows.start) && !hasWindow(windows.end))
    return { start: false, end: false, spent: false }
  const edges = edgesOn(clause, ctx, day, slotIds)
  const start = outsideWindow(edges.first, windows.start)
  const end = outsideWindow(edges.last, windows.end)
  const owedEnd =
    end &&
    windows.end.from !== undefined &&
    (edges.last ?? 0) < timeToMinutes(windows.end.from)
  return { start, end, spent: (start || end) && !owedEnd }
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
): StreakClause =>
  measure === "time"
    ? { id: makeId("clause"), targets: [target], min: 60 }
    : { id: makeId("clause"), targets: [target], max: 0 }

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

/**
 * What a period is worth to a rule.
 *
 * **`watching` is a state, not an absence** — `spec 018`. A weekly rule
 * written on a Wednesday cannot win or lose the week it landed in: the floor
 * was never agreed to. But it is *there*, and `unjudged` would drop it out of
 * `dayReport.readings` entirely, so the ring would gain a segment out of
 * nowhere on the day a ceiling broke — which reads as a rendering fault rather
 * than as a slip. Drawn, never tallied.
 */
export type RuleState =
  | "met"
  | "frozen"
  | "missed"
  | "pending"
  | "unjudged"
  | "watching"

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

/** Does this condition cover this weekday? No list means every one of them. */
/** A date to describe a condition against, where any date would do. */
const describingKey = (): DayKey => toKey(new Date())

export const clauseCoversDay = (clause: StreakClause, dayKey: DayKey): boolean =>
  clauseWeekdays(clause).includes(fromKey(dayKey).getDay())

/**
 * **What a condition counts on one day**, over any set of slots.
 *
 * Hoisted out of `readClauseDay` because the week needs the same arithmetic:
 * a slot's weekly total is its daily totals added up, and two ways of
 * measuring the same thing is how the day and the week come to disagree.
 */
export const measuredOn = (
  clause: StreakClause,
  ctx: StreakContext,
  day: Day | undefined,
  slotIds: string[] | undefined,
): number => {
  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)
  return info.measure === "time"
    ? minutesOn(day, ctx.slots, slotIds, keepsAnyActivity(targets, ctx))
    : countOn(
        dayCounters(day || {}),
        clauseUnits(clause, ctx).map((u) => u.id),
        slotIds,
      )
}

/**
 * How far a figure falls outside a pair of bounds. Nought when it is inside.
 *
 * With both bounds only one can be broken at a time, since a floor above its
 * own ceiling is not a condition anybody can write, so the two are taken at
 * their worst rather than added.
 *
 * **This is a shortfall, not a price.** Flattening it into whole units of
 * failure happens at the end, once the day's own bound and every slot rider
 * have been added together: a count costs what it actually fell short by —
 * one more slip is one more freeze, which is the arithmetic the freeze economy
 * runs on — while time has no such unit, so forty minutes short of two hours
 * is one broken promise and not forty. Both scopes flatten the same way, which
 * is what stops a day and a week disagreeing about what a miss costs.
 */
const shortOf = (v: number, b: ClauseBounds) =>
  Math.max(
    b.min === undefined ? 0 : b.min - v,
    b.max === undefined ? 0 : v - b.max,
    0,
  )

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
  if (info.check) {
    /* **The day names which answers it will take.** A check is not a number,
       so a floor and a ceiling say nothing useful about one; what a day asks
       is which of the three answers is acceptable today. An unanswered check
       satisfies nothing — that is the reminder, and a weekday you did not want
       to be asked about is one you left out of the map.

       **Every named check is judged, not just the first.** This used to be
       gated on there being exactly one, on the reasoning that several checks
       are a count — "at least two of these three". That reading is still here,
       below, for a condition carrying a floor or a ceiling. But the form draws
       the answers grid the moment the *first* target is a check, whatever the
       rest are, and writing in it clears the bounds; so a condition naming two
       checks was drawn as an assertion, stored as one, and then read as a
       count with no bounds left to compare against. A shortfall against
       neither bound is nought, so the condition judged nothing and every day
       passed —
       unanswered, answered `no`, answered anything.

       Judged separately and the deficits added, for the reason every other
       compound thing here adds: two promises broken on one day cost two, and
       a freeze covering both for the price of one would make the second
       free. */
    const allowed = clause.allow?.[fromKey(dayKey).getDay()]
    if (allowed) {
      let deficit = 0
      let yeses = 0
      let skipped = false
      for (const target of targets) {
        const state = checkState(day, target.id || "")
        if (state === "yes") yeses += 1
        if (state === "skip") skipped = true
        if (!state || !allowed.includes(state)) deficit += 1
      }
      return { ...base, value: yeses, deficit, skipped }
    }
  }

  if (targets.length === 1 && info.check) {
    const state = checkState(day, targets[0].id || "")

    /* Written before that existed: a floor of one means yes, a ceiling of
       nothing means no, and a skip is a miss you chose rather than suffered.

       **Read as the binary it is, not as arithmetic.** A day can answer a
       check once, so the only readings a bound has here are *must be yes* and
       *must not be*, and the deficit is one or nothing. Handing the figure to
       the shortfall arithmetic instead priced a miss at whatever it happened to
       say — and the numbers cannot all be trusted, because a condition that
       once measured time and was switched onto a check kept its minutes. That
       is the bug that asked for 61 freezes to cover two unanswered checks:
       60 of them were an hour, still sitting in `min` from when the same
       condition was about lessons.

       Fixed in the reader rather than by rewriting the rules, since the
       arithmetic was never right for a check even when the figure was: `at
       least 2` on a day that can only reach 1 is not a promise anyone can
       keep, and no stored number makes it one. */
    if (state === "skip")
      return { ...base, value: 0, deficit: 1, skipped: true }
    const value = state === "yes" ? 1 : 0
    const { min, max } = clauseBounds(clause, ctx, dayKey)
    const wants =
      min !== undefined && min >= 1
        ? 1
        : max !== undefined && max <= 0
          ? 0
          : undefined
    return {
      ...base,
      value,
      deficit: wants === undefined || value === wants ? 0 : 1,
      skipped: false,
    }
  }

  const measured = (slotIds: string[] | undefined) =>
    measuredOn(clause, ctx, day, slotIds)

  /* **The weekday's own slots, not the condition's.** A condition can say
     *lessons in the morning on a working day, whenever you like at the
     weekend*, and reading the shared list here would have measured Saturday
     against Monday's restriction — silently, and in the direction that breaks
     a day you kept. */
  const dayWeekday = fromKey(dayKey).getDay()
  const value = measured(slotIdsOnWeekday(clause, dayWeekday))

  /* The day's own bound, plus any bound on a named slot. Both apply, which is
     the whole point of the pair: *two hours on Monday, of which at least one
     in the morning, and the rest wherever* is a single promise the old model
     could not state.

     The shortfalls are added and **then** flattened, rather than flattened
     one at a time. A time condition still costs exactly one freeze however
     many of its parts broke — it is one broken promise — while a count
     condition costs what it actually fell short by, which is the arithmetic
     the freeze economy already runs on. */
  const weekday = dayWeekday
  const slotRules = slotBoundsOnWeekday(clause, weekday)

  let short = shortOf(value, boundsOnWeekday(clause, ctx, weekday))
  Object.entries(slotRules).forEach(([slotId, bounds]) => {
    short += shortOf(measured([slotId]), bounds)
  })

  /* **And when it happened** — `spec 023`. A window is not a shortfall in any
     unit, so it contributes a flat one and lets the flattening below do the
     rest: a time condition still costs exactly one however many of its parts
     broke, which is what keeps a rule that gained a window from silently
     getting dearer to freeze. `edgesOn` returns nothing for a target with no
     clock, so a count condition is untouched whatever it happens to store. */
  const broke = windowBreaks(
    clause,
    ctx,
    day,
    weekday,
    slotIdsOnWeekday(clause, weekday),
  )
  if (broke.start) short += 1
  if (broke.end) short += 1

  return {
    ...base,
    value,
    deficit: short <= 0 ? 0 : info.measure === "time" ? 1 : short,
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

/** Every freeze bought against one rule on one day, in either shape. */
const freezesFor = (day: Day | undefined, ruleId: string) =>
  (day?.ruleFreezes || []).filter((f) =>
    typeof f === "string" ? f === ruleId : f.ruleId === ruleId,
  )

/**
 * The old shape: a bare id, meaning *this rule, entirely*.
 *
 * Read exactly as it was written and never rewritten — see `Day.ruleFreezes`
 * for why there is no migration.
 */
const wholeRuleFrozen = (day: Day | undefined, ruleId: string): boolean =>
  freezesFor(day, ruleId).some(
    (f) =>
      typeof f === "string" ||
      /* **A weekly freeze bought before the week was itemised.**
       *
       * `spec 017` sold a week as one flat violation with no site on it, so it
       * stored no `clauseId`, no `targetId` and no `slotId` — key `"||"`.
       * `spec 017`'s successor itemises, and its keys carry the clause, so the
       * two never match: a week somebody had paid for went back to broken and
       * the freeze was simply gone. A purchase must not stop covering what it
       * was bought against, and what this one was bought against was *the
       * week*, because that was the only thing on sale. So it reads exactly
       * like the bare id above — the whole rule, entirely.
       *
       * Nothing new can be written in this shape: every offer now carries at
       * least a `clauseId`. */
      (!f.clauseId && !f.targetId && !f.slotId),
  )

/** The violations already paid for, by key. */
export const frozenKeys = (
  day: Day | undefined,
  ruleId: string,
): Set<string> =>
  new Set(
    freezesFor(day, ruleId)
      .filter((f): f is RuleFreeze => typeof f !== "string")
      .map((f) => violationKey(f)),
  )

/**
 * The same, carrying **what each one was bought for**.
 *
 * A violation can grow after it has been paid for: a ceiling is settled the
 * moment it is crossed — there is no doing less of something already done —
 * but there is nothing to stop you doing *more* of it before the period
 * closes. On a day that is one afternoon of exposure. On a **week** it is six
 * further days, and it would have turned "freeze the Monday, then binge until
 * Sunday" into a free week: the very failure this whole change is about,
 * wearing a different coat.
 *
 * So coverage is a comparison, not a lookup. The stamped price still stands —
 * a purchase is never repriced, and `freezeSpendOn` still reads the stored
 * figure — but a violation that has since grown past what was paid is simply
 * not the violation that was bought.
 */
const frozenCosts = (
  day: Day | undefined,
  ruleId: string,
): Map<string, number> => {
  const out = new Map<string, number>()
  freezesFor(day, ruleId)
    .filter((f): f is RuleFreeze => typeof f !== "string")
    .forEach((f) => {
      const key = violationKey(f)
      out.set(key, Math.max(out.get(key) ?? 0, f.cost))
    })
  return out
}

/**
 * **What a day's freezes actually cost**, out of the ledger rather than the
 * data — `spec 017`, part 7.
 *
 * A week that spent three has spent three forever, whatever later happens to
 * the days behind it. Only a legacy entry is still recomputed, because there
 * is no recorded figure for it; the population is small, its days are long
 * outside the writing window, and new purchases never drift.
 */
export const freezeSpendOn = (
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
): number =>
  freezesFor(day, rule.id).reduce(
    (sum, f) =>
      sum +
      (typeof f === "string"
        ? Math.max(1, totalDeficit(readDay(rule, ctx, day, dayKey)))
        : f.cost),
    0,
  )

/**
 * Whether every violation on this period is paid for.
 *
 * **Only a fully covered period turns colour.** Half a freeze saves nothing,
 * and a cell reading *partly saved* is the same mistake as *four of five
 * almost counts* — `spec 010`, Decision 1. The receipt lives in the strip's
 * own popover instead.
 */
export function isFrozenFor(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  /**
   * A weekly rule's violations live in its week, not in the Monday its
   * receipts are filed on, so that scope has to be handed the days to read.
   *
   * Optional because the day scope never needs it, and absent it a weekly
   * rule itemises an empty week and reads as **not** frozen. That is the safe
   * direction on purpose: a period wrongly left unfrozen breaks and is
   * visible, where one wrongly turned blue is a miss you never find out about.
   */
  weekDays?: Record<DayKey, Day>,
  todayKey?: DayKey,
): boolean {
  if (wholeRuleFrozen(day, rule.id)) return true
  const paid = frozenCosts(day, rule.id)
  if (!paid.size) return false
  const owed =
    rule.scope === "week"
      ? weekViolationsOn(
          rule,
          ctx,
          weekDays ?? {},
          startOfWeek(fromKey(dayKey)),
          todayKey ?? dayKey,
        )
      : violationsOn(rule, ctx, day, dayKey)
  return (
    owed.length > 0 &&
    owed.every((v) => (paid.get(violationKey(v)) ?? 0) >= v.cost)
  )
}

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
  const deficit = totalDeficit(readDay(rule, ctx, day, dayKey))
  if (deficit === 0) return "met"
  /* Asked **after** the deficit, not before: a day whose data was later logged
     up to green is kept on its own merits, and the freeze that was bought for
     it stays bought — spent, recorded, and paying for nothing. That is what
     "never refunded" means when you look at it from this side. */
  if (isFrozenFor(rule, ctx, day, dayKey)) return "frozen"
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

    /* **A week of checks is counted per answer, not summed.**
       `{ yes: { min: 6 }, no: { max: 0 } }` is *six good days, no bad ones,
       and the seventh may be skipped* — three requirements about three
       different answers, which no single total can hold. A state left out is
       unconstrained, which is what "skipped: any" means.

       The deficit adds the shortfalls: falling two `yes` short and taking one
       `no` you swore off is two problems, and pricing it as one would make the
       second free. */
    if (clause.states) {
      const tally: Record<string, number> = { yes: 0, no: 0, skip: 0 }
      /* **Every check the condition names**, not just the first. Two checks
         and `at least 12 yes a week` is a total across both — the same reading
         the day-scope count path gives "Wake up or Go to bed at least 2
         times" — and counting one of them made the week look half as good as
         it was, in the direction that costs you freezes. */
      const targets = clauseTargets(clause)
      covered.forEach((k) => {
        targets.forEach((target) => {
          const state = checkState(days[k], target.id || "")
          if (state) tally[state] += 1
        })
      })
      const short = CHECK_CHOICES.reduce((sum, answer) => {
        const bound = clause.states?.[answer]
        if (!bound) return sum
        const had = tally[answer]
        return (
          sum +
          Math.max(
            bound.min === undefined ? 0 : bound.min - had,
            bound.max === undefined ? 0 : had - bound.max,
            0,
          )
        )
      }, 0)
      return {
        clause,
        applies: covered.length > 0,
        // The headline figure is the yes count: it is what the chart plots and
        // what nearly every rule of this shape is actually about.
        value: tally.yes,
        deficit: covered.length ? short : 0,
        skipped: false,
      }
    }

    const value = covered.reduce(
      (sum, k) => sum + readClauseDay(clause, ctx, days[k], k).value,
      0,
    )

    /* **A weekly rule can still carry day-shaped accepted answers**, and then
       it means what it says: every day of the week must be one of them. That
       happens whenever a rule is switched from judging days to judging weeks —
       `allow` stays on the condition, `CheckWeekFields` writes `states`
       instead, and the bounds were cleared long ago. Summed against
       `weekBounds` that came to no bounds at all, so the condition judged
       nothing and every week passed. Sum the days' own deficits instead. */
    if (clause.allow && !clause.states)
      return {
        clause,
        applies: covered.length > 0,
        value,
        deficit: covered.reduce(
          (sum, k) => sum + readClauseDay(clause, ctx, days[k], k).deficit,
          0,
        ),
        skipped: false,
      }

    /* **The week reads slot bounds too.** It used to take only each day's
       *value* from `readClauseDay` and throw the deficit away, recomputing
       from `weekBounds` alone — so `at most 3 a week, and none in the evening`
       enforced the three and never the evening, and *never after dark* was
       a promise only a rule judging days could make.

       Measured across the week rather than day by day, because after the fix
       above every figure in a weekly condition is the week's: one shape for
       the whole clause, not a weekly total sitting on top of daily slots. */
    const slotRules = weekSlotBounds(clause, covered)
    let short = covered.length
      ? shortOf(value, weekBounds(clause, ctx, covered))
      : 0
    if (covered.length)
      Object.entries(slotRules).forEach(([slotId, bounds]) => {
        const inSlot = covered.reduce(
          (sum, k) => sum + measuredOn(clause, ctx, days[k], [slotId]),
          0,
        )
        short += shortOf(inSlot, bounds)
      })

    return {
      clause,
      applies: covered.length > 0,
      value,
      // A time condition costs one freeze however many of its parts broke;
      // a count costs what it actually fell short by. Same rule as the day.
      deficit: short <= 0 ? 0 : measure === "time" ? 1 : short,
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
  if (
    isFrozenFor(rule, ctx, days[toKey(weekStart)], toKey(weekStart), days, todayKey)
  )
    return "frozen"
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
  /**
   * **Ceilings only** — for a week the rule never agreed to (`spec 018`).
   *
   * A weekly rule written on a Wednesday did not sign up for that week's
   * floor: *three gym trips a week*, judged over the four days that were left,
   * is a rule nobody wrote. It did sign up for its ceiling, and a ceiling
   * knows nothing about how much week there was — *none at night* is broken
   * the moment one lands there, and no amount of missing Monday takes it back.
   */
  mode: "all" | "ceilings" = "all",
): DayKey | null {
  if (!covered.length) return null
  const measure = targetMeasure(clauseTarget(clause), ctx)
  const { min, max } = weekBounds(clause, ctx, covered)

  /* Slot ceilings lose a week exactly as the clause's own does, and for the
     same reason: *none in the evening* is broken the moment one lands there,
     and nothing done later in the week takes it back. Only the ceilings — a
     slot floor is still reachable until the week runs out, which the walk
     below already handles for the clause as a whole. */
  const slotCeilings = Object.entries(weekSlotBounds(clause, covered)).filter(
    ([, b]) => b.max !== undefined,
  )
  const inSlot: Record<string, number> = {}

  let value = 0
  let floorSettled = min === undefined || mode === "ceilings"
  for (const key of covered) {
    // Days that have not happened contribute nothing and settle nothing; the
    // walk stops there and the week stays open.
    if (key > todayKey) break
    value += readClauseDay(clause, ctx, days[key], key).value

    // A ceiling loses the moment it is crossed: there is no doing less of
    // something already done. It is checked first because it is the only one
    // that can lose a week nothing else has any quarrel with.
    if (max !== undefined && value > max) return key

    for (const [slotId, bounds] of slotCeilings) {
      inSlot[slotId] =
        (inSlot[slotId] ?? 0) + measuredOn(clause, ctx, days[key], [slotId])
      if (inSlot[slotId] > bounds.max!) return key
    }

    if (floorSettled) continue

    const need = min! - value
    if (need <= 0) {
      floorSettled = true
      continue
    }
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
export const coveredDays = (
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
  /** `"ceilings"` for a partial first week — see `clauseLostOn`. */
  mode: "all" | "ceilings" = "all",
): DayKey | null {
  let earliest: DayKey | null = null
  for (const clause of ruleClauses(rule)) {
    const lost = clauseLostOn(
      clause,
      ctx,
      days,
      coveredDays(clause, rule, weekStart),
      todayKey,
      mode,
    )
    if (lost && (!earliest || lost < earliest)) earliest = lost
  }
  return earliest
}

/**
 * Whether a rule's verdict on this day may be **counted**.
 *
 * False for exactly one thing: a weekly rule inside the partial week it was
 * written in. Such a day can still be *drawn* — a broken ceiling goes red, and
 * everything else is `watching` — but it may not move the composite, the
 * streak or the balance, because the week it belongs to was never one you
 * agreed to. `spec 018`.
 */
export const countsOn = (rule: StreakRule, dayKey: DayKey): boolean =>
  rule.scope !== "week" ||
  toKey(startOfWeek(fromKey(dayKey))) >= rule.startedOn

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
  /**
   * Which bound this row is about.
   *
   * A condition with both gets **two rows**, because they burn in opposite
   * directions: the floor is a debt that should reach nothing by Sunday, the
   * ceiling a budget that should not fill. One chart cannot be both, and
   * forcing it would put "good" at the top for one half and the bottom for
   * the other.
   */
  side: "min" | "max"
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
 * **The two bounds burn in opposite directions, and are drawn so.** A floor is
 * a debt you pay off and it should reach nothing by Sunday; a ceiling is a
 * budget you spend and it should not fill. A condition carrying both therefore
 * gets **two rows**, not one compromise between them.
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
    const bounds = weekBounds(clause, ctx, covered)
    const lostOn = clauseLostOn(clause, ctx, days, covered, todayKey)
    const label = targetsLabel(clauseTargets(clause), ctx)

    /* Every day's running total, walked once and shared by both rows: the
       figures are the same reading whichever bound is being drawn against. */
    const totals: { key: DayKey; cumulative: number; seen: number }[] = []
    let cumulative = 0
    let seen = 0
    all.forEach((key) => {
      if (covered.includes(key) && key <= todayKey) {
        cumulative += readClauseDay(clause, ctx, days[key], key).value
        seen += 1
      }
      totals.push({ key, cumulative, seen })
    })
    const finalTotal = cumulative

    const rowsFor = (side: "min" | "max", limit: number): ClausePace => ({
      clause,
      label,
      measure,
      side,
      limit,
      value: finalTotal,
      daysLeft: covered.filter((k) => k >= todayKey).length,
      lostOn,
      days: totals.map(({ key, cumulative: value, seen: n }) => {
        const bar = side === "max" ? value : Math.max(0, limit - value)
        if (!covered.includes(key))
          return { key, cumulative: value, bar: 0, state: "outside" as const }
        if (key > todayKey)
          return { key, cumulative: value, bar, state: "future" as const }
        // Lost stays lost: every day from the one it broke on wears the
        // colour, because the week is over as a question even though the days
        // are not.
        if (lostOn && key >= lostOn)
          return { key, cumulative: value, bar, state: "lost" as const }
        // The even line — what you would have by now if you spread the week's
        // work across the days that judge it. Ahead of it is the only sense in
        // which a Wednesday can be "on track" for a thing due on Sunday.
        const pacing = (limit * n) / covered.length
        const ahead = side === "max" ? value <= pacing : value >= pacing
        const state: PaceState = ahead ? "ahead" : "behind"
        return { key, cumulative: value, bar, state }
      }),
    })

    const out: ClausePace[] = []
    if (bounds.min !== undefined) out.push(rowsFor("min", bounds.min))
    if (bounds.max !== undefined) out.push(rowsFor("max", bounds.max))
    return out
  })
}

/**
 * **How much of a weekly rule's floor is done as of one day** — `spec 018`.
 *
 * A fraction for the ring to fill an arc with, or null when there is nothing
 * to fill. Null in two cases, and the second is the interesting one:
 *
 * - the rule judges days, so its arc is a verdict rather than a burn-down;
 * - **it carries no floor.** A ceiling has no progress, it has *headroom*, and
 *   headroom drawn as fill would render *I have not spent it yet* as *I have
 *   already done it* — which is the exact congratulation this exists to
 *   remove. A ceiling keeps a solid arc: whole while it holds, red when it
 *   breaks.
 *
 * **The worst condition decides**, never an average: two conditions in two
 * units share no axis, and the rule's verdict is already *the weakest link*,
 * so the arc agrees with it rather than inventing a second opinion.
 *
 * Its own walk rather than `weekPace`, which builds a row per condition per
 * bound over the whole week. This is called once per day per rule across a
 * month of cards.
 */
export function weekFloorPace(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  dayKey: DayKey,
  todayKey: DayKey,
): number | null {
  if (rule.scope !== "week" || dayKey > todayKey) return null
  const weekStart = startOfWeek(fromKey(dayKey))
  let worst: number | null = null
  for (const clause of ruleClauses(rule)) {
    const covered = coveredDays(clause, rule, weekStart)
    if (!covered.length) continue
    const { min } = weekBounds(clause, ctx, covered)
    // A floor of nought is satisfied by every week there has ever been, and is
    // no more a requirement here than it is anywhere else in this file.
    if (min === undefined || min <= 0) continue
    let value = 0
    for (const key of covered) {
      if (key > dayKey) break
      value += readClauseDay(clause, ctx, days[key], key).value
    }
    const done = Math.max(0, Math.min(1, value / min))
    if (worst === null || done < worst) worst = done
  }
  return worst
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

  /* **The partial first week speaks about its ceilings and nothing else** —
     `spec 018`. The whole-weeks gate used to return `unjudged` here, which
     made a weekly rule written on any day but a Monday completely silent for
     up to six days: no arc, no alarm, no explanation. Its argument was sound
     and it was an argument about *floors* — "three trips a week" judged over
     the four days that were left is a rule nobody wrote. It says nothing
     about a ceiling, which is broken the moment one lands in the wrong slot.

     So the week keeps no verdict of its own (`ruleWeekState` still returns
     `unjudged`, and `countsOn` keeps this day out of every tally), and a
     broken ceiling is still drawn and still warned about. */
  if (toKey(weekStart) < rule.startedOn) {
    const broke = weekLostOn(rule, ctx, days, weekStart, todayKey, "ceilings")
    return broke === dayKey ? "missed" : "watching"
  }

  const lost = weekLostOn(rule, ctx, days, weekStart, todayKey)
  if (lost !== dayKey) return "met"
  return isFrozenFor(
    rule,
    ctx,
    days[toKey(weekStart)],
    toKey(weekStart),
    days,
    todayKey,
  )
    ? "frozen"
    : "missed"
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

/* ---- What broke, one named site at a time — `spec 017` -------------------

   A freeze used to be a list of **rule ids** with its price recomputed on
   every read, so it was not a purchase at all: it was a property the current
   data happened to have. Every one of the three complaints was that single
   fact seen from a different side — a price that changed after you paid it, a
   freeze taken by an edit rather than a decision, and a freeze that came back.

   Buying one has to be buying *something*, and this is the something.

   **A violation is one named site that broke.** Not "the rule failed" and not
   "one unit of deficit" — the first is too coarse to choose between (freeze
   the wake-up, not the go-to-bed) and the second is too fine to be a choice at
   all (three Pinterests over a ceiling of nought would be three separate
   purchases of the same thing).

   | condition | violations | each costs |
   | --- | --- | --- |
   | checks with `allow` | one per target | 1 |
   | a count | one per broken bound — its own, and each slot rider | what that site fell short by |
   | time | **one for the whole condition**, however many sites broke | 1 |
   | a lone check with legacy bounds | one | 1 |

   **No rule gets cheaper or dearer.** Add them up and you get exactly what
   `totalDeficit` says. Time stays one broken promise — *forty minutes short of
   two hours is one, not forty* — and a count still costs what it actually
   missed by. The only new thing is that it can be bought in pieces.

   It lives here rather than in a module of its own because `ruleDayState`
   needs it to decide whether a day is frozen, and everything it reads —
   `measuredOn`, `boundsOnWeekday`, `clauseTargets` — is in this file. A
   separate module would import all of that and be imported back, which is a
   cycle for the sake of a filename.
--------------------------------------------------------------- */


/** One named site of a rule that broke on one period. */
export interface Violation {
  /** The condition it belongs to. Absent means the whole week — see below. */
  clauseId?: string
  /** The check that failed. Never set together with `slotId`. */
  targetId?: string
  /** The slot rider that broke. Absent means the condition's own bound. */
  slotId?: string
  /** Units of failure at this site, and what a freeze on it costs. */
  cost: number
  /**
   * **Whether it can be frozen at all** — `spec 017`, part 2.
   *
   * A violation may be frozen only when it is already lost: irreversibly
   * broken, or out of reach before midnight. An *unanswered* check is not
   * lost, it is an errand, and billing for one is what made a noon with
   * `wake up = no` and `go to bed` unanswered cost two freezes rather than
   * one. `spec 016` gave the app the word for the difference; this is where it
   * pays.
   */
  settled: boolean
  /** What it says on the offer, already quoted for `Sentence`. */
  line: string
}

/**
 * A violation's identity, stable across edits that do not rewrite it.
 *
 * Matched by ids rather than by position, exactly as the lock matches
 * conditions: reordering is not an edit, and a rewritten condition is a
 * different site rather than a moved one.
 */
export const violationKey = (v: {
  clauseId?: string
  targetId?: string
  slotId?: string
}): string => `${v.clauseId ?? ""}|${v.targetId ?? ""}|${v.slotId ?? ""}`

/** The same shortfall as above, taking the two sides loose. */
const shortBy = (v: number, min?: number, max?: number) =>
  shortOf(v, { min, max })

const slotLabel = (ctx: StreakContext, slotId: string) =>
  ctx.slots.find((s) => s.id === slotId)?.label || "a removed slot"

/**
 * Every violation on one day, itemised.
 *
 * `minutesLeft` is what the clock still allows: **nought for a day that is
 * over**, which is what makes every violation on it settled. Only the floors
 * read it — a breached ceiling and a wrong answer are settled at any hour.
 */
export function violationsOn(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  minutesLeft = 0,
): Violation[] {
  if (rule.scope === "week") return []
  const out: Violation[] = []
  const weekday = fromKey(dayKey).getDay()

  for (const clause of ruleClauses(rule)) {
    if (!clauseCoversDay(clause, dayKey)) continue
    const targets = clauseTargets(clause)
    const info = targetInfo(targets[0], ctx)
    const named = targetsLabel(targets, ctx)
    const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))

    /* A check is answered or it is not, and the two failures are different
       things: one is spent the moment it is written, the other is an errand
       with the rest of the day to run in. */
    if (info.check && clause.allow) {
      const allowed = clause.allow[weekday] ?? []
      for (const target of targets) {
        const state = checkState(day, target.id || "")
        if (state && allowed.includes(state)) continue
        const label = q(targetInfo(target, ctx).label)
        out.push({
          clauseId: clause.id,
          targetId: target.id,
          cost: 1,
          /* Answered wrongly is spent the moment it is written. **No answer
             is an errand until the day runs out, and settled the moment it
             does** — a check nobody answered on a day that is over is not
             waiting for anything, and leaving it unsettled meant yesterday
             could no longer be frozen at all. */
          settled: !!state || minutesLeft <= 0,
          line: t("{label} is {answer}", {
            label,
            answer: q(
              state
                ? t(`answer:${CHECK_LABELS[state].toLowerCase()}`)
                : t("not answered"),
            ),
          }),
        })
      }
      continue
    }

    // Written before accepted answers existed: a floor of one means yes.
    if (targets.length === 1 && info.check) {
      const state = checkState(day, targets[0].id || "")
      const { min, max } = clauseBounds(clause, ctx, dayKey)
      const wants =
        min !== undefined && min >= 1 ? 1 : max !== undefined && max <= 0 ? 0 : undefined
      const value = state === "yes" ? 1 : 0
      const broken = state === "skip" || (wants !== undefined && value !== wants)
      if (broken)
        out.push({
          clauseId: clause.id,
          cost: 1,
          settled: !!state || minutesLeft <= 0,
          line: t("{label} is {answer}", {
            label: q(targetInfo(targets[0], ctx).label),
            answer: q(
              state
                ? t(`answer:${CHECK_LABELS[state].toLowerCase()}`)
                : t("not answered"),
            ),
          }),
        })
      continue
    }

    const counted = slotIdsOnWeekday(clause, weekday)
    const value = measuredOn(clause, ctx, day, counted)
    const bounds = boundsOnWeekday(clause, ctx, weekday)
    const slotRules = slotBoundsOnWeekday(clause, weekday)

    /* **A time condition is one violation however many of its parts broke.**
       It is one broken promise, which is the rule the whole freeze economy has
       always priced time by; splitting it here would quietly multiply what a
       bad Tuesday costs. */
    if (info.measure === "time") {
      let short = shortBy(value, bounds.min, bounds.max)
      Object.entries(slotRules).forEach(([slotId, b]) => {
        short += shortBy(measuredOn(clause, ctx, day, [slotId]), b.min, b.max)
      })
      /* **A broken window is part of the same violation** — `spec 023`. It has
         to be counted here as well as in `readClauseDay`, and for a harder
         reason than tidiness: the items priced here must add back up to
         `totalDeficit`, or a day can be missed with nothing on offer to freeze
         it. A window that broke while the figure held is exactly that day, and
         it would have been unfreezable. */
      const broke = windowBreaks(clause, ctx, day, weekday, counted)
      if (broke.start) short += 1
      if (broke.end) short += 1
      if (short <= 0) continue
      const over = bounds.max !== undefined && value > bounds.max
      const need = bounds.min === undefined ? 0 : bounds.min - value
      const windows = windowsOnWeekday(clause, weekday)
      const edges = edgesOn(clause, ctx, day, counted)
      const said = (
        at: number | undefined,
        window: TimeWindow,
        early: string,
        late: string,
      ) =>
        at !== undefined && window.from !== undefined && at < timeToMinutes(window.from)
          ? t(early, { named, at: q(atClock(at)), bound: q(window.from) })
          : t(late, { named, at: q(atClock(at ?? 0)), bound: q(window.to ?? "") })
      out.push({
        clauseId: clause.id,
        cost: 1,
        /* A ceiling is spent at any hour; a floor only once the clock has
           ruled it out. A window is spent the moment it breaks except for the
           one that asks you to carry on working — see `windowBreaks`. */
        settled: over || broke.spent || need > minutesLeft,
        /* The window is what the line says when the window is what broke:
           `“Lessons” 2h of 2h` on a day whose only fault was starting at seven
           is a sentence that reads as a bug. */
        line: broke.start
          ? said(
              edges.first,
              windows.start,
              "{named} began at {at}, no earlier than {bound}",
              "{named} began at {at}, no later than {bound}",
            )
          : broke.end
            ? said(
                edges.last,
                windows.end,
                "{named} finished at {at}, no earlier than {bound}",
                "{named} finished at {at}, no later than {bound}",
              )
            : over
              ? t("{named} {value} against at most {bound}", {
                  named,
                  value: q(fmt(value)),
                  bound: q(fmt(bounds.max ?? 0)),
                })
              : t("{named} {value} of {bound}", {
                  named,
                  value: q(fmt(value)),
                  bound: q(fmt(bounds.min ?? 0)),
                }),
      })
      continue
    }

    const own = shortBy(value, bounds.min, bounds.max)
    if (own > 0) {
      const over = bounds.max !== undefined && value > bounds.max
      out.push({
        clauseId: clause.id,
        cost: own,
        // A count has no rate, so a floor short of it is only settled once the
        // day itself is over — which is what `minutesLeft` of nought says.
        settled: over || minutesLeft <= 0,
        line: over
          ? t("{named} {value} against at most {bound}", {
              named,
              value: q(value),
              bound: q(bounds.max ?? 0),
            })
          : t("{named} {value} of {bound}", {
              named,
              value: q(value),
              bound: q(bounds.min ?? 0),
            }),
      })
    }

    Object.entries(slotRules).forEach(([slotId, b]) => {
      const inSlot = measuredOn(clause, ctx, day, [slotId])
      const short = shortBy(inSlot, b.min, b.max)
      if (short <= 0) return
      const over = b.max !== undefined && inSlot > b.max
      const where = t("frag: in {slot}", { slot: q(slotLabel(ctx, slotId)) })
      out.push({
        clauseId: clause.id,
        slotId,
        cost: short,
        settled: over || minutesLeft <= 0,
        line: over
          ? t("{named} {value}{where} against at most {bound}", {
              named,
              value: q(inSlot),
              where,
              bound: q(b.max ?? 0),
            })
          : t("{named} {value}{where} of {bound}", {
              named,
              value: q(inSlot),
              where,
              bound: q(b.min ?? 0),
            }),
      })
    })
  }
  return out
}

/**
 * Every violation on one week, itemised — the week-scope sibling of
 * `violationsOn`.
 *
 * **This reverses `spec 017`, part 5**, which made a week one flat violation
 * costing one freeze. The argument then was that itemising would raise a
 * compound weekly rule from one freeze to several, a tightening nobody asked
 * for. What that missed is that the week was already *the* cheap period: a day
 * rule pays what it fell short by, so four slips cost four — and the identical
 * promise written weekly cost one, however far past the line you went. *At
 * most three Pinterest a week* broken by seventeen was a single freeze. A
 * price that does not move with the failure is not a price, and the whole
 * freeze economy is built on the idea that it is.
 *
 * So the same three rules the day already follows: a **count** costs what it
 * actually fell short by, a **time** condition costs one however many of its
 * parts broke — one broken promise, not forty minutes' worth — and a **check**
 * splits, per accepted answer where the week counts them and per named check
 * where it asserts them. The items add back up to `totalDeficit(readWeek())`,
 * so the streak itself is unchanged: only the buying is.
 *
 * `settled` is the week's version of the clock. A breached ceiling and an
 * answer already written are spent at any hour; a floor is an errand until the
 * week is out of days.
 */
export function weekViolationsOn(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): Violation[] {
  if (rule.scope !== "week") return []
  const out: Violation[] = []
  const weekOver = toKey(addDays(weekStart, 6)) < todayKey

  /* The same days `readWeek` reads, and read the same way — the two have to
     agree to the unit, or a freeze buys something the verdict does not sell. */
  const keys = weekDates(weekStart)
    .map(toKey)
    .filter((k) => k <= todayKey && k >= rule.startedOn)

  for (const clause of ruleClauses(rule)) {
    const covered = keys.filter((k) => clauseCoversDay(clause, k))
    if (!covered.length) continue
    const targets = clauseTargets(clause)
    const info = targetInfo(targets[0], ctx)
    const named = targetsLabel(targets, ctx)
    const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))

    /* **A week of checks counted per answer.** `{ yes: { min: 6 }, no:
       { max: 0 } }` is two different promises about two different answers, so
       it is two sites. The synthetic `targetId` is what keeps their keys
       apart; a colon cannot appear in a generated id (`makeId`), so it can
       never collide with a real target. */
    if (clause.states) {
      const tally: Record<string, number> = { yes: 0, no: 0, skip: 0 }
      covered.forEach((k) =>
        targets.forEach((t) => {
          const state = checkState(days[k], t.id || "")
          if (state) tally[state] += 1
        }),
      )
      CHECK_CHOICES.forEach((answer) => {
        const bound = clause.states?.[answer]
        if (!bound) return
        const had = tally[answer]
        const over = bound.max !== undefined && had > bound.max
        const short = Math.max(
          bound.min === undefined ? 0 : bound.min - had,
          bound.max === undefined ? 0 : had - bound.max,
          0,
        )
        if (short <= 0) return
        const word = q(CHECK_LABELS[answer].toLowerCase())
        out.push({
          clauseId: clause.id,
          targetId: `answer:${answer}`,
          cost: short,
          settled: over || weekOver,
          line: over
            ? t("{named} {word} {value} against at most {bound}", {
                named,
                word,
                value: q(had),
                bound: q(bound.max ?? 0),
              })
            : t("{named} {word} {value} of {bound}", {
                named,
                word,
                value: q(had),
                bound: q(bound.min ?? 0),
              }),
        })
      })
      continue
    }

    /* **Day-shaped accepted answers on a weekly rule** — what switching a rule
       from days to weeks leaves behind, and it means what it says: every day
       must be an accepted answer. One site per check, priced by how many days
       were not, which is exactly what `readWeek` sums. Not one site per day:
       `violationKey` has three segments and no room for a date, and giving it
       one would change every key in storage and orphan every freeze already
       bought. */
    if (clause.allow) {
      for (const target of targets) {
        let bad = 0
        covered.forEach((k) => {
          const allowed = clause.allow?.[fromKey(k).getDay()]
          if (!allowed) return
          const state = checkState(days[k], target.id || "")
          if (!state || !allowed.includes(state)) bad += 1
        })
        if (!bad) continue
        out.push({
          clauseId: clause.id,
          targetId: target.id,
          cost: bad,
          settled: weekOver,
          line: t("{label} not accepted on {days}", {
            label: q(targetInfo(target, ctx).label),
            days: q(nDaysWord(bad)),
          }),
        })
      }
      continue
    }

    const value = covered.reduce(
      (sum, k) => sum + readClauseDay(clause, ctx, days[k], k).value,
      0,
    )
    const bounds = weekBounds(clause, ctx, covered)
    const slotRules = weekSlotBounds(clause, covered)
    const inSlot = (slotId: string) =>
      covered.reduce(
        (sum, k) => sum + measuredOn(clause, ctx, days[k], [slotId]),
        0,
      )

    // One violation however many of its parts broke, exactly as the day does.
    if (info.measure === "time") {
      let short = shortOf(value, bounds)
      Object.entries(slotRules).forEach(([slotId, b]) => {
        short += shortOf(inSlot(slotId), b)
      })
      if (short <= 0) continue
      const over = bounds.max !== undefined && value > bounds.max
      out.push({
        clauseId: clause.id,
        cost: 1,
        settled: over || weekOver,
        line: over
          ? t("{named} {value} against at most {bound}", {
              named,
              value: q(fmt(value)),
              bound: q(fmt(bounds.max ?? 0)),
            })
          : t("{named} {value} of {bound}", {
              named,
              value: q(fmt(value)),
              bound: q(fmt(bounds.min ?? 0)),
            }),
      })
      continue
    }

    const own = shortOf(value, bounds)
    if (own > 0) {
      const over = bounds.max !== undefined && value > bounds.max
      out.push({
        clauseId: clause.id,
        cost: own,
        settled: over || weekOver,
        line: over
          ? t("{named} {value} against at most {bound}", {
              named,
              value: q(value),
              bound: q(bounds.max ?? 0),
            })
          : t("{named} {value} of {bound}", {
              named,
              value: q(value),
              bound: q(bounds.min ?? 0),
            }),
      })
    }

    Object.entries(slotRules).forEach(([slotId, b]) => {
      const had = inSlot(slotId)
      const short = shortOf(had, b)
      if (short <= 0) return
      const over = b.max !== undefined && had > b.max
      const where = t("frag: in {slot}", { slot: q(slotLabel(ctx, slotId)) })
      out.push({
        clauseId: clause.id,
        slotId,
        cost: short,
        settled: over || weekOver,
        line: over
          ? t("{named} {value}{where} against at most {bound}", {
              named,
              value: q(had),
              where,
              bound: q(b.max ?? 0),
            })
          : t("{named} {value}{where} of {bound}", {
              named,
              value: q(had),
              where,
              bound: q(b.min ?? 0),
            }),
      })
    })
  }
  return out
}

/** What every violation on a period adds up to — today's `freezeCost`. */
export const violationsCost = (list: Violation[]): number =>
  list.reduce((sum, v) => sum + v.cost, 0)

/** Only what may actually be bought: what is already lost. */
export const freezable = (list: Violation[]): Violation[] =>
  list.filter((v) => v.settled)

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
  /* **A week stays one, and that is not a leftover.** This prices only the
     *legacy* shape — a bare rule id, meaning "this rule, entirely" — and every
     one of those was bought back when a week did cost exactly one.
     `weekViolationsOn` prices what is bought from now on. Making this follow
     it would retroactively charge old purchases under a rule they were not
     made under, which is the one thing a stamped price exists to prevent. */
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
    const spent = weekDates(w).reduce(
      (sum, date) => sum + freezeSpendOn(rule, ctx, days[toKey(date)], toKey(date)),
      0,
    )
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
          /* **Today is not a day you kept** — `spec 018`. `ruleDayState`
             returns `met` for today the moment the deficit is nought, so a
             rule written this morning with nothing logged against it read
             `1`: credited with a day that is not over. `keptDays` has always
             declined to count today and `keptBreakdown` was fixed to agree;
             this was the last of the three still disagreeing. A rule shows
             `0` on the day you write it, which is correct and is also the
             honest starting point for a number whose job is to be frightening
             to lose. */
          .filter((k) => k >= rule.startedOn && k < todayKey)
          .map((k) => ruleDayState(rule, ctx, days[k], k, todayKey))

  let best = 0
  let run = 0
  states.forEach((s) => {
    if (s === "unjudged" || s === "pending" || s === "watching") return
    if (s === "missed") run = 0
    else run += 1
    if (run > best) best = run
  })
  // The tail of the same walk: whatever run was still going at the end.
  return { rule, current: run, best, freezes, pending, open }
}

/**
 * **What can be frozen on this period, one violation at a time** — `spec 017`.
 *
 * It used to be one offer for the whole rule at the whole day's price, which
 * is why noon with `wake up = no` and `go to bed` unanswered presented a bill
 * for two: an unanswered check is in deficit, so it was charged for. It is not
 * a broken promise, it is an **errand**, and `spec 016` gave the app the word
 * for the difference.
 *
 * So only what is already lost is offered — `Violation.settled` — and each is
 * bought on its own. **The automatic second charge stops being expressible**,
 * because there is no longer a moment at which the app decides for you.
 *
 * Yesterday needs no rule of its own: the day is over, so everything on it is
 * settled and all of it is offered.
 */
export interface FreezeOffer {
  /** Stable across edits that do not rewrite the site — see `violationKey`. */
  key: string
  violation: Violation
  cost: number
  available: number
  /** Whether it can be afforded **on its own**: you buy them one at a time. */
  ok: boolean
  /** Already paid for. Still listed, so nobody pays for it twice. */
  frozen: boolean
  /** Where the record goes. A weekly rule's freeze lives on the Monday. */
  dayKey: DayKey
}

export function freezeOffers(
  rule: StreakRule,
  project: Project,
  dayKey: DayKey,
  todayKey: DayKey,
  status: RuleStatus,
  /** Minutes left in the day, when `dayKey` is today. Nought otherwise. */
  minutesLeft = 0,
): FreezeOffer[] {
  const ctx = streakContext(project)
  const available = status.freezes.weeklyLeft + status.freezes.banked
  const weekStart = startOfWeek(fromKey(dayKey))
  const week = rule.scope === "week"

  const state = week
    ? ruleWeekState(rule, ctx, project.days, weekStart, todayKey)
    : ruleDayState(rule, ctx, project.days[dayKey], dayKey, todayKey)
  if (state !== "missed" && state !== "pending" && state !== "frozen") return []

  /* A day is freezable while it is writable. A *week* is freezable while any
     of its days is — otherwise a rule about a week could only ever be frozen
     on a Sunday or a Monday, which is not a window, it is an accident of
     which day the horizon happens to land on. */
  const open = week
    ? weekDates(weekStart).some((d) => isEditableDay(toKey(d), todayKey))
    : isEditableDay(dayKey, todayKey)
  if (!open) return []

  const key = week ? toKey(weekStart) : dayKey
  const day = project.days[key]
  const paid = frozenKeys(day, rule.id)
  // A rule frozen the old way is frozen entirely; there is nothing to itemise.
  if (freezeSpendOn(rule, ctx, day, key) > 0 && !paid.size) return []

  const owed = week
    ? weekViolationsOn(rule, ctx, project.days, weekStart, todayKey)
    : violationsOn(rule, ctx, project.days[dayKey], dayKey, minutesLeft)

  return owed
    .filter((v) => v.settled || paid.has(violationKey(v)))
    .map((v) => ({
      key: violationKey(v),
      violation: v,
      cost: v.cost,
      available,
      ok: available >= v.cost,
      frozen: paid.has(violationKey(v)),
      dayKey: key,
    }))
}

/* ---- Saying it back ------------------------------------------------------ */

export const listDays = (weekdays: number[]) =>
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
      ? t("frag: on {days}", { days: listDays(clause.weekdays) })
      : ""

  /* A set of checks against accepted answers reads as an assertion about
     each — `and`, not `or` — and that is exactly how `readClauseDay` judges
     them. A check condition carrying a floor or a ceiling instead is a count,
     and falls through to the ordinary path below. */
  if (info.check && clause.states) {
    /* A week of checks, counted per answer, and it reads the same whether the
       condition names one check or three — `readWeek` tallies them all into
       one total, so a sentence gated on there being exactly one described a
       rule the reader was not applying. */
    const parts = CHECK_CHOICES.flatMap((answer) => {
      const b = clause.states?.[answer]
      if (!b || (b.min === undefined && b.max === undefined)) return []
      const label = t(`answer:${CHECK_LABELS[answer].toLowerCase()}`)
      if (b.min !== undefined && b.max !== undefined)
        return [
          t("{range} {answer}", {
            range: q(`${b.min}–${b.max}`),
            answer: label,
          }),
        ]
      return [
        b.max !== undefined
          ? t("at most {n} {answer}", { n: q(b.max), answer: label })
          : t("at least {n} {answer}", { n: q(b.min ?? 0), answer: label }),
      ]
    })
    return parts.length
      ? t("{named}: {parts} a week", {
          named: targetsLabel(targets, ctx, "and"),
          parts: parts.join(", "),
        })
      : t("{named} — nothing asked", {
          named: targetsLabel(targets, ctx, "and"),
        })
  }

  if (info.check && clause.allow && targets.length > 1) {
    const answers = clause.allow[clauseWeekdays(clause)[0]] ?? []
    const said = answers.length
      ? answers
          .map((a) => q(t(`answer:${CHECK_LABELS[a].toLowerCase()}`)))
          .join(t(" or "))
      : t("nothing")
    return t("{named} must each be {said}{when}", {
      named: targetsLabel(targets, ctx, "and"),
      said,
      when,
    })
  }

  // Only a lone check reads as an answer; several of them are a count, which
  // is exactly how `readClauseDay` treats them.
  if (targets.length === 1 && info.check) {
    /* A week of checks, counted per answer. Only the constrained answers are
       named — a state left out is unconstrained, and listing "skipped: any"
       would be spending a clause on saying nothing. */
    if (clause.states) {
      const parts = CHECK_CHOICES.flatMap((answer) => {
        const b = clause.states?.[answer]
        if (!b || (b.min === undefined && b.max === undefined)) return []
        const label = t(`answer:${CHECK_LABELS[answer].toLowerCase()}`)
        if (b.min !== undefined && b.max !== undefined)
          return [
            t("{range} {answer}", {
              range: q(`${b.min}–${b.max}`),
              answer: label,
            }),
          ]
        return [
          b.max !== undefined
            ? t("at most {n} {answer}", { n: q(b.max), answer: label })
            : t("at least {n} {answer}", { n: q(b.min ?? 0), answer: label }),
        ]
      })
      return parts.length
        ? t("{named}: {parts} a week", {
            named: q(info.qualified),
            parts: parts.join(", "),
          })
        : t("{named} — nothing asked", { named: q(info.qualified) })
    }

    /* Judged by the day, with each weekday naming the answers it takes.
       Grouped by that set, so "yes on Mon–Fri, yes or skipped at the weekend"
       reads as two requirements rather than as seven. */
    if (clause.allow) {
      const groups: { answers: CheckState[]; days: number[] }[] = []
      clauseWeekdays(clause).forEach((weekday) => {
        const answers = clause.allow?.[weekday] ?? []
        const key = [...answers].sort().join("|")
        const found = groups.find(
          (g) => [...g.answers].sort().join("|") === key,
        )
        if (found) found.days.push(weekday)
        else groups.push({ answers, days: [weekday] })
      })
      const said = (answers: CheckState[]) =>
        answers.length
          ? answers
              .map((a) => q(t(`answer:${CHECK_LABELS[a].toLowerCase()}`)))
              .join(t(" or "))
          : t("nothing")
      if (groups.length === 1)
        return t("{named} must be {said}{when}", {
          named: q(info.qualified),
          said: said(groups[0].answers),
          when,
        })
      return t("{named} must be {parts}", {
        named: q(info.qualified),
        parts: groups
          .map((g) =>
            t("{said} on {days}", {
              said: said(g.answers),
              days: listDays(g.days),
            }),
          )
          .join(", "),
      })
    }

    return t("{named} must be {said}{when}", {
      named: q(info.qualified),
      said: q(
        t(
          clauseBounds(clause, ctx, describingKey()).min !== undefined
            ? "answer:yes"
            : "answer:no",
        ),
      ),
      when,
    })
  }

  const slotName = (id: string) =>
    q(ctx.slots.find((s) => s.id === id)?.label || t("a removed slot"))
  const whereOf = (ids: string[] | undefined) =>
    ids?.length
      ? t("frag: in {slots}", { slots: ids.map(slotName).join(", ") })
      : ""
  // Minutes are printed as hours and minutes, like every other duration in
  // the app: "at least 2h 30m", never "at least 150".
  const amount = (n: number) =>
    info.measure === "time"
      ? q(fmtHours(n))
      : t("{n} {times}", {
          n: q(n),
          times: nTimes(n),
        })

  // Both bounds read as a range, because "at least 2h and at most 4h" is one
  // requirement said twice and nobody talks that way.
  const said = (b: ClauseBounds) =>
    b.min !== undefined && b.max !== undefined
      ? t("between {a} and {b}", { a: amount(b.min), b: amount(b.max) })
      : b.max !== undefined
        ? t("at most {a}", { a: amount(b.max) })
        : b.min !== undefined
          ? t("at least {a}", { a: amount(b.min) })
          : ""

  /* Per-day numbers are grouped by what they ask for, so "3h on Mon, Tue,
     Wed, Fri, Sat, Sun and 1h 30m on Thu" reads as two requirements rather
     than as seven. Grouping is what makes the readback checkable: the point of
     a sentence is that you can hold it against what you meant, and seven
     clauses of arithmetic cannot be held against anything. */
  /* A bound on a named slot rides on the end, because it is a rider: the
     day's own figure is the promise, and "of which at least an hour in the
     morning" qualifies it. Read the other way round it sounds like two
     separate rules, which is exactly what it is not. */
  const riderOf = (weekday: number) => {
    const rules = Object.entries(slotBoundsOnWeekday(clause, weekday)).filter(
      ([, b]) => b.min !== undefined || b.max !== undefined,
    )
    return {
      any: rules.length > 0,
      text: rules.length
        ? t("frag:, of which {list}", {
            list: rules
              .map(([slotId, b]) =>
                t("{said} in {slot}", {
                  said: said(b),
                  slot: slotName(slotId),
                }),
              )
              .join(t(" and ")),
          })
        : "",
    }
  }

  /* **The windows read as clauses of their own**, after the figure and after
     any slot rider — *“Lessons” at least “2h”, of which “1h” in “Morning”,
     starting between “09:00” and “10:00”*. Last because they qualify the
     whole of it, and in words rather than as a range of numbers because a
     time of day is not a quantity: `between “09:00” and “10:00”` is a
     stretch of clock, and `at least “09:00”` is not a sentence. */
  const windowText = (weekday: number) => {
    const { start, end } = windowsOnWeekday(clause, weekday)
    const said = (w: TimeWindow, both: string, early: string, late: string) =>
      w.from !== undefined && w.to !== undefined
        ? t(both, { a: q(w.from), b: q(w.to) })
        : w.from !== undefined
          ? t(early, { a: q(w.from) })
          : w.to !== undefined
            ? t(late, { a: q(w.to) })
            : ""
    /* Each fragment carries its own comma, the way every other `frag:` in
       this file does — the key's fallback *is* the English, so a caller that
       adds punctuation of its own doubles whatever the fragment already had.
       That is exactly what happened here: `“Lessons” at least “2h”,
       starting by “10:00”` came out with two spaces after the comma. */
    return [
      said(
        start,
        "frag:, starting between {a} and {b}",
        "frag:, starting no earlier than {a}",
        "frag:, starting by {a}",
      ),
      said(
        end,
        "frag:, finishing between {a} and {b}",
        "frag:, finishing no earlier than {a}",
        "frag:, finishing by {a}",
      ),
    ].join("")
  }

  /* **Grouped by everything a weekday asks, not only by its figure.** Where
     the figure is collected, what any named slot owes and when the day had to
     start are all per-weekday now, so a group keyed on the bounds alone would
     print Monday's slots over Saturday's numbers — the readback quietly
     describing a rule nobody wrote. */
  const judged = clauseWeekdays(clause)
  const groups: {
    bounds: ClauseBounds
    where: string
    rider: string
    window: string
    days: number[]
  }[] = []
  judged.forEach((weekday) => {
    const bounds = boundsOnWeekday(clause, ctx, weekday)
    const where = whereOf(slotIdsOnWeekday(clause, weekday))
    const rider = riderOf(weekday).text
    const window = windowText(weekday)
    const found = groups.find(
      (g) =>
        g.bounds.min === bounds.min &&
        g.bounds.max === bounds.max &&
        g.where === where &&
        g.rider === rider &&
        g.window === window,
    )
    if (found) found.days.push(weekday)
    else groups.push({ bounds, where, rider, window, days: [weekday] })
  })

  /* When every day says the same thing about slots — which is every rule that
     has not asked for per-day ones — the slots are said once, before and after
     the figure, exactly as they always were. The sentence for an ordinary rule
     is unchanged to the character. */
  const oneWhere = groups.every((g) => g.where === groups[0]?.where)
  const oneRider = groups.every((g) => g.rider === groups[0]?.rider)
  const oneWindow = groups.every((g) => g.window === groups[0]?.window)
  const where = oneWhere ? (groups[0]?.where ?? whereOf(clause.slotIds)) : ""
  const rider = oneRider ? (groups[0]?.rider ?? "") : ""
  const window = oneWindow ? (groups[0]?.window ?? "") : ""
  const slotRules = judged.length ? riderOf(judged[0]).any : false

  // One group is the ordinary case and keeps the ordinary sentence, with the
  // weekday suffix `when` already carries. Several always name their own days,
  // since that is the only thing separating them.
  /* **A condition with no day figure at all.** `said` returns nothing for it,
     so the sentence would read `Youtube  ` — or, worse, `Youtube <the
     warning>, of which at most 0 times in Morning`, which contradicts itself
     in one line. If a named slot carries the whole requirement, that rider is
     the sentence; if nothing does, say so plainly. New ones are refused at
     the door (`clauseAsksNothing`), so this is for the ones already stored. */
  const anyDayBound = groups.some(
    (g) => g.bounds.min !== undefined || g.bounds.max !== undefined,
  )
  /* A condition may carry **nothing but a window** — *begin by ten*, with no
     figure at all — and that is a promise, so it gets a sentence rather than
     the warning. `clauseAsksNothing` knows the same thing one gate earlier. */
  if (!anyDayBound && window)
    return `${named}${where}${window.replace(/^, /, " ")}${when}`
  if (!anyDayBound)
    return slotRules
      ? `${named}${where}${rider.replace(t("frag:, of which {list}", { list: "" }), " ")}${when}`
      : t("{named}{where} — nothing asked, so this condition judges nothing", {
          named,
          where,
        })

  // One group is the ordinary case and keeps the ordinary sentence, with the
  // weekday suffix `when` already carries. Several always name their own days,
  // since that is the only thing separating them.
  if (groups.length === 1)
    return `${named}${where} ${said(groups[0].bounds)}${rider}${window}${when}`

  /* Several groups. Whatever they agree on has already been lifted out into
     `where` and `rider`; whatever they do not, each group says for itself,
     because that is the only thing separating them. */
  return `${named}${where} ${groups
    .map((g) =>
      t("{said}{where}{rider}{window} on {days}", {
        said: said(g.bounds),
        where: oneWhere ? "" : g.where,
        rider: oneRider ? "" : g.rider,
        window: oneWindow ? "" : g.window,
        days: listDays(g.days),
      }),
    )
    .join(", ")}${rider}${window}`
}



/**
 * **What a condition did on one day, in words.**
 *
 * The third and fourth places to need this wrote it out again, and the fourth
 * one drifted: the streak panel's tooltip read `Go to bed in time 1 (skipped)`
 * on a day where *go to bed* was the half that went right — it named the first
 * target whatever had happened, printed `ClauseReading.value` raw (a yes count,
 * which means nothing to a reader), and pinned `skipped` — now "any of them
 * was" — to whichever name it had chosen. So the readout lives here, once, and
 * both the risk lines and the panel ask it.
 *
 * `failing` is the difference between the two callers. A warning says what
 * went wrong and nothing else; a tooltip on a day you are inspecting says what
 * happened, kept or not. Same sentence, two lengths.
 */
export function clauseReadoutParts(
  reading: ClauseReading,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  mode: "failing" | "all" = "all",
): string[] {
  const clause = reading.clause
  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)

  if (info.check) {
    /* A check written before accepted answers existed carries a bound instead,
       and `readClauseDay` reads it as the binary it is — a floor of one means
       yes, a ceiling of nought means no. Deriving the same set here is what
       lets the callers stop carrying their own legacy branch. */
    const legacy = clauseBounds(clause, ctx, dayKey)
    const allowed: CheckState[] =
      clause.allow?.[fromKey(dayKey).getDay()] ??
      (legacy.min !== undefined && legacy.min >= 1 ? ["yes"] : ["no"])
    const said = (state: CheckState | null) =>
      t("is {answer}", {
        answer: q(
          state === null
            ? t("not answered")
            : t(`answer:${CHECK_LABELS[state].toLowerCase()}`),
        ),
      })
    /* Named one by one, because each is asserted one by one — a set of checks
       has no combined figure to report and never had.

       **The loop variable was `t`.** Harmless until this file gained a
       translator by that name, at which point the parameter would shadow it
       inside its own body. Renamed rather than worked around. */
    return targets
      .filter((target) => {
        if (mode === "all") return true
        const state = checkState(day, target.id || "")
        return !state || !allowed.includes(state)
      })
      .map(
        (target) =>
          `${q(targetInfo(target, ctx).label)} ${said(
            checkState(day, target.id || ""),
          )}`,
      )
  }

  /* Everything else is a figure, and the figure is the whole set's — the
     targets are summed, so naming one of them and printing the total would be
     a number attached to the wrong thing. */
  const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))
  const named = targetsLabel(targets, ctx)
  const { max } = clauseBounds(clause, ctx, dayKey)

  /* **A ceiling reports what is left, not just what is spent.** `2` on its own
     is a number; `2 of 3` is the thing you actually want to know, and the
     arithmetic that matters — how many more before this day is gone — was
     nowhere on the page. Only for a ceiling: a floor's own figure is already
     in the sentence above the strip, and repeating it in every cell would say
     the same thing forty times. */
  if (mode === "all")
    return [
      max !== undefined
        ? t("{named} {value} of {max}", {
            named,
            value: q(fmt(reading.value)),
            max: q(fmt(max)),
          })
        : `${named} ${q(fmt(reading.value))}`,
    ]

  /* **Name the bound that actually broke, and where.**
   *
   * This reported the clause's own day bound whatever had gone wrong, which is
   * a description of a rule nobody wrote the moment a slot rider is the thing
   * at fault: `at most 3, of which none in the evening` with one slip in the
   * evening printed `“--Pinterest” “1” against at least “0”` — the wrong
   * comparison, the wrong direction and no mention of the evening. The day's
   * figure was one, comfortably under its ceiling of three, so the `over` test
   * said no and the fallback invented a floor.
   *
   * A line each, because both can break at once and they are two separate
   * facts about the day.
   */
  const said = (v: number, b: ClauseBounds, where: string): string | null => {
    if (b.max !== undefined && v > b.max)
      return t("{named} {value}{where} against at most {bound}", {
        named,
        value: q(fmt(v)),
        where,
        bound: q(fmt(b.max)),
      })
    if (b.min !== undefined && v < b.min)
      return t("{named} {value}{where} against at least {bound}", {
        named,
        value: q(fmt(v)),
        where,
        bound: q(fmt(b.min)),
      })
    return null
  }

  const parts: string[] = []
  const own = said(reading.value, clauseBounds(clause, ctx, dayKey), "")
  if (own) parts.push(own)

  Object.entries(slotBoundsOnWeekday(clause, fromKey(dayKey).getDay())).forEach(
    ([slotId, bounds]) => {
      const label = ctx.slots.find((sl) => sl.id === slotId)?.label
      const line = said(
        measuredOn(clause, ctx, day, [slotId]),
        bounds,
        t("frag: in {slot}", { slot: q(label || t("a removed slot")) }),
      )
      if (line) parts.push(line)
    },
  )

  // A deficit with nothing named is a shape this has not met; say the figure
  // rather than nothing at all.
  return parts.length ? parts : [`${named} ${q(fmt(reading.value))}`]
}

/**
 * **The same, for a rule that judges weeks** — `spec 018`.
 *
 * `clauseReadoutParts` above is a *day* function: it compares against
 * `clauseBounds` and measures slots on one day. It was being handed week
 * readings anyway, keyed on today — so the week's figure was tested against
 * the day's bounds and the slots were measured on the one day with nothing in
 * it. Nothing ever matched, and every weekly line fell through to the
 * last-resort branch and printed a bare number:
 *
 *     “Pinterest” “1”
 *
 * The sentence it should have printed was already reachable — the same
 * function keyed on the day the slip actually happened says
 * `“Pinterest” “1” in “Night” against at most “0”`. But keying it on
 * `weekLostOn`'s day is only right for a ceiling: a week short of a **floor**
 * has no day of loss until it ends, so the sentence would be about one day
 * where the fact is about seven. Hence a sibling that is week-shaped
 * throughout, and a day function that can no longer be called with a week.
 */
export function clauseWeekReadoutParts(
  reading: ClauseReading,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  /** The days of the week this clause judges — see `coveredDays`. */
  covered: DayKey[],
  mode: "failing" | "all" = "all",
): string[] {
  const clause = reading.clause
  const targets = clauseTargets(clause)
  const info = targetInfo(targets[0], ctx)

  /* A week of checks counted per answer: `{ yes: { min: 6 }, no: { max: 0 } }`
     is three requirements about three different answers, and no single total
     holds them. Each is named in its own words. */
  if (clause.states) {
    const tally: Record<string, number> = { yes: 0, no: 0, skip: 0 }
    covered.forEach((k) =>
      targets.forEach((target) => {
        const state = checkState(days[k], target.id || "")
        if (state) tally[state] += 1
      }),
    )
    const named = targetsLabel(targets, ctx)
    return CHECK_CHOICES.flatMap((answer) => {
      const bound = clause.states?.[answer]
      if (!bound) return []
      const had = tally[answer]
      const word = q(t(`answer:${CHECK_LABELS[answer].toLowerCase()}`))
      if (bound.max !== undefined && had > bound.max)
        return [
          t("{named} {word} {value} against at most {bound}", {
            named,
            word,
            value: q(had),
            bound: q(bound.max),
          }),
        ]
      if (bound.min !== undefined && had < bound.min)
        return [
          t("{named} {word} {value} against at least {bound}", {
            named,
            word,
            value: q(had),
            bound: q(bound.min),
          }),
        ]
      return mode === "failing"
        ? []
        : [
            t("{named} {word} {value} of {bound}", {
              named,
              word,
              value: q(had),
              bound: q(bound.min ?? bound.max ?? 0),
            }),
          ]
    })
  }

  /* A weekly rule still carrying day-shaped accepted answers means what it
     says: every day of the week must be one of them. Reported as the number of
     days that were not, per check — the week has no single figure for it. */
  if (clause.allow) {
    return targets.flatMap((target) => {
      const bad = covered.filter((k) => {
        const allowed = clause.allow?.[fromKey(k).getDay()] ?? []
        const state = checkState(days[k], target.id || "")
        return !state || !allowed.includes(state)
      }).length
      const label = q(targetInfo(target, ctx).label)
      if (bad > 0)
        return [
          t("{label} unanswered or refused on {bad} of {all} days", {
            label,
            bad: q(bad),
            all: q(covered.length),
          }),
        ]
      return mode === "failing"
        ? []
        : [
            t("{label} kept on all {all} days", {
              label,
              all: q(covered.length),
            }),
          ]
    })
  }

  const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))
  const named = targetsLabel(targets, ctx)
  const bounds = weekBounds(clause, ctx, covered)

  if (mode === "all")
    return [
      bounds.max !== undefined || bounds.min !== undefined
        ? t("{named} {value} of {bound} this week", {
            named,
            value: q(fmt(reading.value)),
            bound: q(fmt((bounds.max ?? bounds.min) as number)),
          })
        : t("{named} {value} this week", {
            named,
            value: q(fmt(reading.value)),
          }),
    ]

  const said = (v: number, b: ClauseBounds, where: string): string | null => {
    if (b.max !== undefined && v > b.max)
      return t("{named} {value}{where} against at most {bound}", {
        named,
        value: q(fmt(v)),
        where,
        bound: q(fmt(b.max)),
      })
    if (b.min !== undefined && v < b.min)
      return t("{named} {value}{where} against at least {bound}", {
        named,
        value: q(fmt(v)),
        where,
        bound: q(fmt(b.min)),
      })
    return null
  }

  const parts: string[] = []
  const own = said(reading.value, bounds, t("frag: this week"))
  if (own) parts.push(own)

  // Measured across the whole week, which is the half that was wrong: the day
  // function looked at one day's slots and found them empty.
  Object.entries(weekSlotBounds(clause, covered)).forEach(([slotId, b]) => {
    const label = ctx.slots.find((sl) => sl.id === slotId)?.label
    const inSlot = covered.reduce(
      (sum, k) => sum + measuredOn(clause, ctx, days[k], [slotId]),
      0,
    )
    const line = said(
      inSlot,
      b,
      t("frag: in {slot} this week", { slot: q(label || t("a removed slot")) }),
    )
    if (line) parts.push(line)
  })

  return parts.length
    ? parts
    : [
        t("{named} {value} this week", {
          named,
          value: q(fmt(reading.value)),
        }),
      ]
}

/**
 * The same, as one string.
 *
 * **The parts are the real shape** — a condition asserting two checks has two
 * things to say and always did; joining them was the renderer's convenience,
 * and it cost the reader a line they had to parse a separator out of. Callers
 * that can lay out lines take the parts; callers that need one string say so
 * here, and choose their own separator: a tooltip joins with a newline and
 * asks `Tip` for `multiline`, a plain-text log joins with a dot.
 */
export const clauseReadout = (
  reading: ClauseReading,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  mode: "failing" | "all" = "all",
  join = " · ",
): string => clauseReadoutParts(reading, ctx, day, dayKey, mode).join(join)

/** The whole rule in one line — the scope, then every condition joined by "and". */
export function ruleSentence(rule: StreakRule, ctx: StreakContext): string {
  const when = rule.scope === "week" ? "Every week" : "Every day"
  const parts = ruleClauses(rule).map((clause) =>
    clauseSentence(clause, ctx, rule.scope),
  )
  return `${when}: ${parts.join(", and ")}.`
}

/* ---- The lock ------------------------------------------------------------ */

/**
 * The slots a clause counts **on one weekday**. No list means the whole day,
 * which is every slot.
 *
 * Per weekday since `DayRequirement.slotIds` exists: a condition that counts
 * only the morning on Monday and the whole of Saturday has two answers, and
 * one set could only ever be right about one of them.
 */
const slotsOf = (
  clause: StreakClause,
  slots: Slot[],
  weekday: number,
): Set<string> => {
  const ids = slotIdsOnWeekday(clause, weekday)
  return new Set(ids?.length ? ids : slots.map((s) => s.id))
}

const covers = <T,>(bigger: Set<T>, smaller: Set<T>): boolean =>
  [...smaller].every((x) => bigger.has(x))

/**
 * The fields the lock protects. Label, icon, colour and note are not terms.
 *
 * Every term now lives on the condition. It did not always: a condition could
 * point at the project's daily goal, so lowering that goal in a tab the lock
 * never sees lowered the rule too. `migrations/019` wrote those figures into
 * the conditions that were reading them, which is what closed the door rather
 * than narrowing it.
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
    // Folded in only while a condition can still point at the goal. Nothing
    // can create one, and `019` rewrites the ones that exist — but until it
    // has, such a rule's terms really do live partly in `settings`.
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
/**
 * A target as one comparable string.
 *
 * `memberKind` is in the key even though the old `sameTarget` ignored it:
 * narrowing a category from every counter to only its tallies changes what is
 * being counted, and a lock that cannot see that is a lock with a door in it.
 * Being stricter is always safe here — the worst an extra field costs is an
 * edit that waits a week when it need not have.
 */
const targetKey = (t: StreakTarget): string =>
  `${t.kind}|${t.id || ""}|${t.measure || ""}|${t.memberKind || ""}`

function clauseNarrows(
  prev: StreakClause,
  next: StreakClause,
  ctx: StreakContext,
  slots: Slot[],
): boolean {
  /* **Weekday by weekday**, since a condition can now ask a different thing
     on each. For every weekday the old rule judged:

     - it must still be judged — dropping one is a day that stops being asked
       about, which is unambiguously easier;
     - its floor must not fall and its ceiling must not rise. Absent is a floor
       of nothing and a ceiling of everything, so *adding* a bound is
       automatically no-easier, which is right: one more thing to keep can only
       cost you.

     Weekdays the old rule did not judge are skipped entirely. Gaining one is
     more to keep, and that never waits. */
  const wasJudged = new Set(clauseWeekdays(prev))
  const isJudged = new Set(clauseWeekdays(next))
  for (const weekday of wasJudged) {
    if (!isJudged.has(weekday)) return false
    /* A check's weekday asks which answers it takes, and **fewer accepted
       answers is harder**. Dropping the field entirely is not comparable to
       keeping it — one is a set and the other is a number — so it waits. */
    const wasAllow = prev.allow?.[weekday]
    const nowAllow = next.allow?.[weekday]
    if (!!wasAllow !== !!nowAllow) return false
    if (wasAllow && nowAllow) {
      if (!nowAllow.every((a) => wasAllow.includes(a))) return false
      continue
    }
    const a = boundsOnWeekday(prev, ctx, weekday)
    const b = boundsOnWeekday(next, ctx, weekday)
    if ((b.min ?? 0) < (a.min ?? 0)) return false
    if ((b.max ?? Infinity) > (a.max ?? Infinity)) return false

    /* **The riders, which the lock could not see at all.** A floor on a named
       slot is a term like any other — *of which at least an hour in the
       morning* is half of what some rules ask — and lowering it, raising its
       ceiling or deleting it outright landed at once, because nothing below
       this point compared anything but the shared slot list. Dropping one is
       unambiguously easier, so it waits; adding one is one more thing to keep
       and never does. */
    const wasRiders = slotBoundsOnWeekday(prev, weekday)
    const nowRiders = slotBoundsOnWeekday(next, weekday)
    for (const [slotId, was] of Object.entries(wasRiders)) {
      const now = nowRiders[slotId]
      if (!now) return false
      if ((now.min ?? 0) < (was.min ?? 0)) return false
      if ((now.max ?? Infinity) > (was.max ?? Infinity)) return false
    }

    /* **The windows, walls rather than figures, and the same argument.**
       Absent is a wall at nowhere: no `from` is *any time you like, however
       early*, so moving one later can only cost you and moving it earlier
       cannot. The pair reads in opposite directions for the same reason a
       floor and a ceiling do, and adding a window where there was none is one
       more thing to keep, which never waits. */
    const wasWin = windowsOnWeekday(prev, weekday)
    const nowWin = windowsOnWeekday(next, weekday)
    const at = (time: string | undefined, absent: number) =>
      time === undefined ? absent : timeToMinutes(time)
    for (const side of ["start", "end"] as const) {
      const was = wasWin[side]
      const now = nowWin[side]
      if (at(now.from, -Infinity) < at(was.from, -Infinity)) return false
      if (at(now.to, Infinity) > at(was.to, Infinity)) return false
    }
  }

  /* A week counted per answer: each constrained state compared in its own
     direction, and a constraint that was there must still be there. */
  if (!!prev.states !== !!next.states) return false
  if (prev.states && next.states) {
    for (const answer of CHECK_CHOICES) {
      const a = prev.states[answer]
      const b = next.states[answer]
      if (a && !b) return false
      if (!a || !b) continue
      if ((b.min ?? 0) < (a.min ?? 0)) return false
      if ((b.max ?? Infinity) > (a.max ?? Infinity)) return false
    }
  }

  const anyBound = (clause: StreakClause, pick: "min" | "max") =>
    clauseWeekdays(clause).some(
      (wd) => boundsOnWeekday(clause, ctx, wd)[pick] !== undefined,
    ) ||
    CHECK_CHOICES.some((answer) => clause.states?.[answer]?.[pick] !== undefined)
  const hasFloor = anyBound(prev, "min") || anyBound(next, "min")
  const hasCeiling = anyBound(prev, "max") || anyBound(next, "max")

  /* **The targets, as a set.**
   *
   * This was `sameTarget(clauseTarget(prev), clauseTarget(next))` — the first
   * target of each, from when a condition could name only one. A condition can
   * name several now, and everything below this line compares bounds and
   * answers, which know nothing about targets. So swapping the *second* check
   * of a two-check condition left the first untouched, the test said "same
   * target", and an edit that replaced one promise with an easier one landed
   * at once. Dropping the second was worse: unambiguously easier, and equally
   * invisible.
   *
   * The direction is the same argument the slots make below, because it is the
   * same argument. Under an assertion — a set of checks against accepted
   * answers — each target is judged separately and the deficits add, so one
   * more target is one more thing to keep. Under a **floor** the targets are
   * summed, so one more is one more place the number can come from, which is
   * easier. Under a **ceiling** one more is one more way to be caught.
   * Carrying both pulls in both directions at once, so any change waits. */
  const pt = new Set(clauseTargets(prev).map(targetKey))
  const nt = new Set(clauseTargets(next).map(targetKey))
  const asserted = !!prev.allow || !!next.allow
  const targetsOk = asserted
    ? covers(nt, pt)
    : hasFloor && hasCeiling
      ? covers(nt, pt) && covers(pt, nt)
      : hasCeiling
        ? covers(nt, pt)
        : covers(pt, nt)
  if (!targetsOk) return false

  /* The slot rows point in opposite directions for the same edit, and that is
     not a mistake: under a ceiling a slot is a place you can be caught, so
     adding one narrows the ways through; under a floor a slot is a place the
     count can come from, so adding one widens them.

     A condition carrying **both** is pulled both ways at once, so any change
     to its slots is incomparable and waits. That is the one-sided test doing
     exactly what it is for. */
  /* Weekday by weekday, like the bounds above: every day the old rule judged
     has to survive the same test, and one day going the wrong way is enough
     to make the whole edit wait. */
  for (const weekday of wasJudged) {
    const ps = slotsOf(prev, slots, weekday)
    const ns = slotsOf(next, slots, weekday)
    const ok =
      hasFloor && hasCeiling
        ? covers(ns, ps) && covers(ps, ns)
        : hasCeiling
          ? covers(ns, ps)
          : covers(ps, ns)
    if (!ok) return false
  }
  return true
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
    return !!counterpart && clauseNarrows(before, counterpart, ctx, slots)
  })
}

/**
 * **Does this condition ask anything at all?**
 *
 * A condition with no floor, no ceiling and no accepted answer is satisfied by
 * every day there has ever been. It is not an error the arithmetic can see —
 * a shortfall against neither bound is nought, correctly — but a rule holding
 * one has quietly stopped being a rule, and its red days turn green without
 * anything appearing to have changed. That is the one failure this codebase is
 * built to refuse, so it is refused at the door instead of being read
 * charitably later.
 *
 * Reachable two ways, both of them ordinary: clearing both bounds with the
 * crosses beside them, and — before the reader was fixed — writing accepted
 * answers into a condition naming several checks, which cleared the bounds and
 * then went unread.
 */
export const clauseAsksNothing = (
  clause: StreakClause,
  ctx: StreakContext,
): boolean => {
  // No weekday judged is the same nothing said a different way: an `allow` map
  // emptied on every day, or a `days` map with no entries left in it.
  const days = clauseWeekdays(clause)
  if (!days.length) return true

  const info = targetInfo(clauseTarget(clause), ctx)
  if (info.check) {
    if (clause.states)
      return !CHECK_CHOICES.some((answer) => {
        const bound = clause.states?.[answer]
        return !!bound && (bound.min !== undefined || bound.max !== undefined)
      })
    // A weekday is in `days` only when it accepts an answer, so an `allow` map
    // that survived the check above is asking for something.
    if (clause.allow) return false
  }

  /* **A floor of nought asks nothing**, and it is not the same as no floor at
     all — you have to type it. `at least 0 times` is satisfied by every day
     there has ever been, exactly like the absent bound above, and the only
     difference is that this one looks deliberate. A ceiling of nought is the
     opposite and the commonest rule in the app: *never*. */
  const asks = (b: ClauseBounds) =>
    b.max !== undefined || (b.min !== undefined && b.min > 0)

  /* **A window asks something even with no figure beside it** — `spec 023`.
     *Begin by ten* is a real promise and a condition may carry nothing else;
     without this line the form would refuse to save one. A window with
     neither wall is the nothing this gate is for, which is what `hasWindow`
     answers. */
  return !days.some((weekday) => {
    const windows = windowsOnWeekday(clause, weekday)
    return (
      asks(boundsOnWeekday(clause, ctx, weekday)) ||
      Object.values(slotBoundsOnWeekday(clause, weekday)).some(asks) ||
      hasWindow(windows.start) ||
      hasWindow(windows.end)
    )
  })
}

/**
 * A condition **no period could ever satisfy**, said in words — or null.
 *
 * The sibling of `clauseAsksNothing` at the other end of the same axis. That
 * one refuses a condition every day clears; this refuses one no day can. Both
 * are rules that have stopped judging, and both fail silently: a condition
 * asking for twenty hours in the morning and twenty in the evening is not an
 * arithmetic error, it is a deficit of forty hours every single day, and what
 * you get is a streak that resets every morning with nothing to show why.
 *
 * Three ways in, all of them reachable by ordinary editing:
 *
 * - **A floor above its own ceiling.** Now that a condition carries both, `at
 *   least 3h and at most 1h` is two fields a scroll wheel apart.
 * - **Slot floors that add up past the day's ceiling** — or past the day
 *   itself. The riders are a separate control from the day's own pair and
 *   nothing was comparing them.
 * - **A rider on a slot the condition does not count.** `slotIds` says where
 *   the figure is counted at all, so a floor on a slot outside that set is a
 *   requirement measured against something the condition has excluded.
 *
 * Checks are exempt: three accepted answers have no arithmetic to contradict,
 * and a check that accepts nothing is already `clauseAsksNothing`.
 */
export const clauseImpossible = (
  clause: StreakClause,
  ctx: StreakContext,
  byWeek = false,
): string | null => {
  const info = targetInfo(clauseTarget(clause), ctx)
  if (info.check) return null

  const named = targetsLabel(clauseTargets(clause), ctx)
  const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))
  /* What there physically is. A count has no such ceiling — there is no upper
     limit on how many times a thing can be tallied — so the sanity check is
     only ever about time. */
  const room = info.measure === "time" ? (byWeek ? 7 : 1) * 24 * 60 : Infinity

  const fault = (
    bounds: ClauseBounds,
    slots: Record<string, ClauseBounds>,
    counted: Set<string> | null,
    when: string,
  ): string | null => {
    if (
      bounds.min !== undefined &&
      bounds.max !== undefined &&
      bounds.min > bounds.max
    )
      return `${named} asks for at least ${q(fmt(bounds.min))}${when} and at most ${q(fmt(bounds.max))}`

    let floor = 0
    for (const [slotId, b] of Object.entries(slots)) {
      const label = ctx.slots.find((x) => x.id === slotId)?.label
      const slot = q(label ?? "a slot that no longer exists")
      if (counted && !counted.has(slotId))
        return `${named} carries a figure on ${slot}, which it does not count`
      if (b.min !== undefined && b.max !== undefined && b.min > b.max)
        return `${named} asks for at least ${q(fmt(b.min))} and at most ${q(fmt(b.max))} in ${slot}`
      if (b.min !== undefined) floor += b.min
    }
    if (bounds.max !== undefined && floor > bounds.max)
      return `${named} asks for ${q(fmt(floor))} across its slots${when} but allows at most ${q(fmt(bounds.max))} altogether`
    if (floor > room)
      return `${named} asks for ${q(fmt(floor))} across its slots${when}, which is longer than ${byWeek ? "a week" : "a day"}`
    return null
  }

  const countedOn = (weekday: number) => {
    const ids = slotIdsOnWeekday(clause, weekday)
    return ids?.length ? new Set(ids) : null
  }

  /* **Two more ways in, both a scroll wheel apart** — `spec 023`.
     A window whose walls have crossed lets nothing through, and a rule that
     must begin after it has finished is the same fault told across the pair.
     Named with the figures, like every other message here: *impossible*
     without the arithmetic is a form refusing to save and not saying why. */
  const windowFault = (weekday: number, when: string): string | null => {
    const { start, end } = windowsOnWeekday(clause, weekday)
    for (const [window, what] of [
      [start, t("begin")],
      [end, t("finish")],
    ] as const) {
      if (
        window.from !== undefined &&
        window.to !== undefined &&
        timeToMinutes(window.from) > timeToMinutes(window.to)
      )
        return t("{named} must {what} no earlier than {a} and no later than {b}{when}", {
          named,
          what,
          a: q(window.from),
          b: q(window.to),
          when,
        })
    }
    if (
      start.from !== undefined &&
      end.to !== undefined &&
      timeToMinutes(start.from) >= timeToMinutes(end.to)
    )
      return t("{named} must begin no earlier than {a} and finish by {b}{when}", {
        named,
        a: q(start.from),
        b: q(end.to),
        when,
      })
    return null
  }

  if (byWeek)
    return fault(
      boundsOnWeekday(clause, ctx, 0),
      clause.slots ?? {},
      countedOn(0),
      " a week",
    )

  for (const weekday of clauseWeekdays(clause)) {
    const when = ` on ${q(WEEKDAY_LABELS[weekday])}`
    const bad =
      fault(
        boundsOnWeekday(clause, ctx, weekday),
        slotBoundsOnWeekday(clause, weekday),
        countedOn(weekday),
        when,
      ) ?? windowFault(weekday, when)
    if (bad) return bad
  }
  return null
}

/**
 * **Deleting is the largest loosening there is, and now costs the same.**
 *
 * It used to be free, and `CLAUDE.md` said so in as many words: *that leaves
 * delete-and-recreate open, deliberately: it costs the streak, which is the
 * only thing anybody was protecting.* That was true while a rule was only a
 * promise about days. It stopped being true the moment the rule was the thing
 * being protected — a rule you can drop on a bad evening is a rule with a
 * week-long clock on lowering its bar and no clock at all on removing the bar
 * entirely, which is the lock defending the paperwork rather than the promise.
 *
 * So a removal walks the same gates a loosening does, in the same order and
 * for the same reasons:
 *
 * - **The grace day is still yours.** A thing you wrote this morning has
 *   judged nothing and protects nothing, so dropping it costs nothing.
 * - **Then the clock**, which is the one the last loosening set. Nothing you
 *   can do about it but wait.
 * - **Then the reason**, on the record rather than in a log that can fail.
 * - **Then the supervisor**, if there is one. The change is not refused, it is
 *   sent, and nothing happens until somebody else agrees.
 */
export interface RemovalGate {
  /** Nothing is at risk yet, so nothing is asked. */
  free: boolean
  /** The clock has not run out; this is the day it does. */
  waitsUntil: DayKey | null
  /** The clock is clear and only a written reason is missing. */
  needsReason: boolean
  /** Clear and explained, and now waiting on somebody else. */
  needsApproval: boolean
  allowed: boolean
}

export function removalGate(
  /** The day it was written, and the day its lock lifts. */
  item: { createdOn: DayKey; lockedUntil: DayKey },
  today: Date,
  reason: string,
  supervised: boolean,
): RemovalGate {
  const todayKey = toKey(today)
  const base = {
    free: false,
    waitsUntil: null,
    needsReason: false,
    needsApproval: false,
  }
  if (todayKey <= item.createdOn)
    return { ...base, free: true, allowed: true }
  if (todayKey < item.lockedUntil)
    return { ...base, waitsUntil: item.lockedUntil, allowed: false }
  if (!reason.trim()) return { ...base, needsReason: true, allowed: false }
  if (supervised) return { ...base, needsApproval: true, allowed: false }
  return { ...base, allowed: true }
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
  /**
   * A condition that asks nothing, named. Refused whatever the clock says and
   * whatever the rule was before — this is not a loosening to be rationed, it
   * is a rule that would stop judging.
   */
  asksNothing: string | null
  /**
   * A condition nothing could satisfy, said in words. Refused on the same
   * terms and for the same reason as `asksNothing`: at either end of the axis
   * the rule has stopped judging, and a rule that always breaks teaches you to
   * ignore it exactly as fast as one that never does.
   */
  impossible: string | null
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
  /* **A rule that has judged nothing is still being set up**, which is what
     this always meant — `=== startedOn` was only ever a way of saying "today
     is its first day". Once a rule can be told to start tomorrow, that
     spelling stops matching the idea: such a rule has no verdict a kinder
     version could rescue, so nothing is at risk and nothing needs a lock. */
  const settingUp = todayKey <= prev.startedOn
  const base = {
    changed,
    narrowing,
    settingUp,
    needsReason: false,
    needsApproval: false,
    asksNothing: null,
    impossible: null,
  }

  /* **Before every other gate, including the day it was written.** The lock
     rations loosenings; this is not one. A condition that asks nothing makes
     the rule pass every day there has ever been, and no amount of clock or
     explanation makes that a promise. */
  const empty = ruleClauses(draft).find((clause) =>
    clauseAsksNothing(clause, ctx),
  )
  if (empty)
    return {
      ...base,
      asksNothing: targetsLabel(clauseTargets(empty), ctx),
      allowed: false,
      next: prev,
    }

  /* And the other end of it. Ahead of the clock for the same reason: a
     condition asking twenty hours in the morning and twenty in the evening is
     a rule that breaks every day, and no waiting period makes that a promise
     worth keeping. */
  for (const clause of ruleClauses(draft)) {
    const bad = clauseImpossible(clause, ctx, draft.scope === "week")
    if (bad) return { ...base, impossible: bad, allowed: false, next: prev }
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
