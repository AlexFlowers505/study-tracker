/* ---------------------------------------------------------------
   Everything worth saying about today, and how loudly — `spec 016`.

   The app had exactly two volumes for anything that is not a number.

   **Loud** was `StreakAlarms`, and `spec 010` part 3 was right about when it
   may fire: *loud when acting is urgent, not merely possible.* A warning that
   goes off every morning is a warning nobody reads.

   **Silent** was `dueToday`, the list under the streak row's chevron —
   described in its own comment as *you go and look; it never comes and finds
   you.*

   There was nothing in between, and almost everything worth saying lives
   there. The answer is not a third volume: it is that **volume stops being a
   placement decision and becomes a property of the thing being said.** One
   board holds everything, and a notice's level decides how much of it it
   takes.

   **One axis: has this already happened, or is it still owed?**

   - `gone`    — broken, and nothing can cover it. Out of the writing window,
                 or the freezes are not there. Information, never a task.
   - `danger`  — broken, and **a freeze can still cover it**. The one level
                 that is a call to act rather than a report.
   - `warning` — still reachable, and the margin is gone.
   - `notice`  — still owed, and there is room.
   - `good`    — nothing owed and nothing spent.

   This is the old `RiskLevel` with `safe` split in two. `safe` was always two
   different states wearing one word — *nothing to do* and *plenty of time to
   do it* — and collapsing them is what forced `dueToday` to exist as a
   separate function computing half the same thing.

   The case that named the gap: a rule asserting *wake up in time* and *go to
   bed in time*. At noon the first is answered `no` and the second is not
   answered at all, and the red block listed both — because `clauseReadoutParts`
   put *not answered* and *answered wrongly* in one bucket. Here they fall
   apart with no special case: the first is **spent** and is `danger`, the
   second is **owed** and is `notice`. One condition of one rule, two notices,
   because it is in two situations.

   **One notice per rule per level.** A rule with two breached ceilings makes
   one `danger` carrying two lines. Five rules therefore make five to nine
   notices rather than thirty, and that bound is what stops the board being the
   dashboard `spec 010` part 3 deleted.
--------------------------------------------------------------- */

import type { Day, DayKey, Project, StreakRule } from "../types/model"
import { fmtHours } from "./time"
import type { Palette } from "./theme"
import type { RuleStatus, StreakContext } from "./customStreaks"
import {
  clauseBounds,
  clauseTargets,
  coveredDays,
  freezeOffers,
  judgesDay,
  measuredOn,
  q,
  readDay,
  readWeek,
  ruleDayState,
  ruleWeekState,
  slotBoundsOnWeekday,
  streakContext,
  targetsLabel,
  targetInfo,
  weekBounds,
  weekLostOn,
  weekSlotBounds,
} from "./customStreaks"
import {
  addDays,
  fmtDateLong,
  fromKey,
  startOfWeek,
  toKey,
  weekDates,
} from "./date"
import { CHECK_LABELS, checkState } from "./checks"
import { dayReport, keptDays } from "./dayVerdict"
import { achievementTargets, measureOf, progressOf } from "./achievements"

export type NoticeLevel =
  | "gone"
  | "danger"
  | "warning"
  | "notice"
  | "allClear"

/** Most urgent first. The board's order, and the filter row's. */
export const LEVELS: NoticeLevel[] = [
  "gone",
  "danger",
  "warning",
  "notice",
  "allClear",
]

const RANK: Record<NoticeLevel, number> = {
  gone: 0,
  danger: 1,
  warning: 2,
  notice: 3,
  allClear: 4,
}

/** One thing worth saying about today. */
export interface Notice {
  /** `${source}::${level}` — unique, and stable across renders. */
  key: string
  /** A rule id, or one of the four fixed sources. */
  id: string
  level: NoticeLevel
  tint: string
  /** An icon from the library, or null for a fixed source's own glyph. */
  icon: string | null
  title: string
  /** One per thing there is to say. Already quoted, for `Sentence`. */
  lines: string[]
  /** What it costs or what is at stake. `danger` and `warning` only. */
  detail?: string
  /** The rule's panel, opened on click. Absent for the fixed sources. */
  ruleId?: string
}

/**
 * A level's own colour.
 *
 * `danger` takes the miss colour and `warning` the amber added for exactly
 * this state — *behind but not lost* — whatever the rule's own tint is. On a
 * block that only ever appears when something is wrong, the level is the thing
 * worth colouring; the icon and the name are still there to say which rule.
 */
export const levelColour = (level: NoticeLevel, c: Palette): string =>
  level === "gone"
    ? c.gone
    : level === "danger"
      ? c.exam
      : level === "warning"
        ? c.warn
        : level === "allClear"
          ? c.goalMet
          : c.accent

/** The loudest thing on the board, for the toggle's badge. */
export const worstLevel = (list: Notice[]): NoticeLevel | null =>
  list.reduce<NoticeLevel | null>(
    (worst, n) => (worst === null || RANK[n.level] < RANK[worst] ? n.level : worst),
    null,
  )

export const countByLevel = (list: Notice[]): Record<NoticeLevel, number> => {
  const out: Record<NoticeLevel, number> = {
    gone: 0,
    danger: 0,
    warning: 0,
    notice: 0,
    allClear: 0,
  }
  list.forEach((n) => (out[n.level] += 1))
  return out
}

/* ---- the clock ---------------------------------------------------------- */

/** Minutes between now and midnight — what is left to act in. */
export const minutesLeftToday = (now: Date) =>
  24 * 60 - (now.getHours() * 60 + now.getMinutes())

/**
 * Past this much of the day gone, an unmet count starts to matter.
 *
 * Unchanged from `streakRisk.ts`, deliberately: `spec 016` splits the level
 * set and does not re-cut the thresholds. Changing both at once would leave
 * nobody able to say which change helped.
 */
const EVENING_MINUTES = 6 * 60

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/* ---- one thing a condition has to say ----------------------------------- */

interface Item {
  level: NoticeLevel
  line: string
}

/** A ceiling, wherever it sits: the condition's own, or one of its slots. */
interface Ceiling {
  value: number
  max: number
  /** ` in “Evening”`, or empty for the condition's own bound. */
  where: string
}

/** The same for a floor. */
interface Floor {
  value: number
  min: number
  where: string
}

/**
 * How a ceiling reads at each of the four levels.
 *
 * **A ceiling of nought is not an allowance**, so it never warns and never
 * counts down: it sits at its limit from midnight to midnight, and *never do
 * X* is the commonest rule in the app. Its only two readings are `clean` and
 * broken.
 */
function ceilingItem(
  ceiling: Ceiling,
  named: string,
  fmt: (n: number) => string,
  /** ` this week` for a weekly rule. Sits with the figures, never after the
   *  verdict word — `“0” in “Night” — clean this week` reads as a clean week
   *  rather than as a clean night. */
  when = "",
): Item {
  const { value, max, where } = ceiling
  const at = `${where}${when}`
  if (value > max)
    return {
      level: "danger",
      line: `${named} ${q(fmt(value))}${at} against at most ${q(fmt(max))}`,
    }
  if (max <= 0)
    return { level: "allClear", line: `${named} ${q(fmt(0))}${at} — clean` }
  if (value === max)
    return {
      level: "warning",
      line: `${named} ${q(fmt(value))} of ${q(fmt(max))}${where} used${when} — one more ends it`,
    }
  if (value > 0)
    return {
      level: "notice",
      line: `${named} ${q(fmt(max - value))} of ${q(fmt(max))}${where} left${when}`,
    }
  return {
    level: "allClear",
    line: `${named} ${q(fmt(0))} of ${q(fmt(max))}${at} — clean`,
  }
}

/**
 * How a floor reads, against what is left of the day.
 *
 * **An unmet floor is not news at nine in the morning** — it is the ordinary
 * state of every day before you have done anything, which is exactly why the
 * old row said nothing about it and why this says it quietly. Time is the one
 * measure the clock can rule out; a count has no rate to fall behind, so the
 * day itself is its clock.
 */
function dayFloorItem(
  floor: Floor,
  named: string,
  fmt: (n: number) => string,
  measure: "time" | "count",
  left: number,
  /** The day is over — nothing on it is owed any more, only spent. */
  settled: boolean,
): Item {
  const { value, min, where } = floor
  const need = Math.max(0, min - value)
  if (need <= 0)
    return {
      level: "allClear",
      line: `${named} ${q(fmt(value))} of ${q(fmt(min))}${where} — done`,
    }
  if (settled)
    return {
      level: "danger",
      line: `${named} ${q(fmt(value))} of ${q(fmt(min))}${where} — short by ${q(fmt(need))}`,
    }
  if (measure === "time") {
    if (need > left)
      return {
        level: "danger",
        line: `${named} ${q(fmt(value))} of ${q(fmt(min))}${where} — no longer reachable today`,
      }
    // More than half of what is left would have to go on this one thing.
    if (need * 2 > left)
      return {
        level: "warning",
        line: `${q(fmt(need))} more of ${named}${where}, and ${q(fmt(left))} of the day left`,
      }
    return { level: "notice", line: `${q(fmt(need))} more of ${named}${where}` }
  }
  return {
    level: left <= EVENING_MINUTES ? "warning" : "notice",
    line: `${q(fmt(need))} more of ${named}${where}`,
  }
}

/* ---- a rule that judges days -------------------------------------------- */

const slotLabel = (ctx: StreakContext, slotId: string) =>
  ctx.slots.find((s) => s.id === slotId)?.label || "a removed slot"

function dayItems(
  rule: StreakRule,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
  now: Date,
  /**
   * The day is over. Everything short on it is **spent** rather than owed, and
   * the clock is no longer a factor — reading yesterday against the hours left
   * in today is how `“Wake up in time” to answer` ended up on a day that had
   * already ended.
   */
  settled = false,
): Item[] {
  const todayKey = dayKey
  const left = settled ? 0 : minutesLeftToday(now)
  const weekday = fromKey(todayKey).getDay()
  const out: Item[] = []

  for (const reading of readDay(rule, ctx, day, todayKey)) {
    if (!reading.applies) continue
    const { clause } = reading
    const targets = clauseTargets(clause)
    const info = targetInfo(targets[0], ctx)
    const named = targetsLabel(targets, ctx)
    const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))

    /* **A check is answered or it is not**, and the difference between *not
       yet* and *answered wrongly* is the whole of this file. `allow` says
       which answers the day will take; anything else is spent the moment it
       is written, and no answer at all is the ordinary case with the day
       itself as its clock. */
    if (info.check && clause.allow) {
      const allowed = clause.allow[weekday] ?? []
      for (const target of targets) {
        const state = checkState(day, target.id || "")
        const label = q(targetInfo(target, ctx).label)
        if (!state) {
          out.push(
            settled
              ? { level: "danger", line: `${label} is ${q("not answered")}` }
              : {
                  level: left <= EVENING_MINUTES ? "warning" : "notice",
                  line: `${label} to answer`,
                },
          )
        } else {
          const said = `${label} is ${q(CHECK_LABELS[state].toLowerCase())}`
          out.push({
            level: allowed.includes(state) ? "allClear" : "danger",
            line: said,
          })
        }
      }
      continue
    }

    const bounds = clauseBounds(clause, ctx, todayKey)
    const slotRules = slotBoundsOnWeekday(clause, weekday)

    const ceilings: Ceiling[] = []
    const floors: Floor[] = []
    if (bounds.max !== undefined)
      ceilings.push({ value: reading.value, max: bounds.max, where: "" })
    if (bounds.min !== undefined && bounds.min > 0)
      floors.push({ value: reading.value, min: bounds.min, where: "" })
    for (const [slotId, b] of Object.entries(slotRules)) {
      const where = ` in ${q(slotLabel(ctx, slotId))}`
      const value = measuredOn(clause, ctx, day, [slotId])
      if (b.max !== undefined) ceilings.push({ value, max: b.max, where })
      if (b.min !== undefined && b.min > 0)
        floors.push({ value, min: b.min, where })
    }

    ceilings.forEach((ceiling) => out.push(ceilingItem(ceiling, named, fmt)))
    floors.forEach((floor) =>
      out.push(dayFloorItem(floor, named, fmt, info.measure, left, settled)),
    )
  }
  return out
}

/* ---- a rule that judges weeks ------------------------------------------- */

/**
 * The same for a week, and it has to be its own walk.
 *
 * **A ceiling knows nothing about pace and everything about headroom**, and
 * headroom reads the same at either scale — which is why `dueToday` returning
 * `null` for every weekly rule was right about its subject and wrong as a
 * prohibition. A weekly *floor* is a question about pace, which `PaceCard`
 * answers properly; a weekly *ceiling* is `2 of 3 left`, and nothing else in
 * the app was saying it.
 *
 * It is also where the second half of `spec 016`'s bug list lived:
 * `weeklyRisk` tested `owed()`, which returns nought for a ceiling by design,
 * so **every weekly rule with a ceiling has been silent about it since weekly
 * rules existed.**
 */
function weekItems(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  weekStart: Date,
  todayKey: DayKey,
): Item[] {
  const out: Item[] = []
  // `spec 018`: a week the rule was written inside judges no floor, because
  // nobody agreed to one over four days. Its ceilings still hold.
  const partial = toKey(weekStart) < rule.startedOn
  const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length
  const readings = readWeek(rule, ctx, days, weekStart, todayKey)

  for (const reading of readings) {
    if (!reading.applies) continue
    const { clause } = reading
    const targets = clauseTargets(clause)
    const info = targetInfo(targets[0], ctx)
    const named = targetsLabel(targets, ctx)
    const fmt = (n: number) => (info.measure === "time" ? fmtHours(n) : String(n))
    const covered = coveredDays(clause, rule, weekStart)
    if (!covered.length) continue

    /* A weekly rule still carrying day-shaped accepted answers means what it
       says: every day of the week must be one of them. Counted rather than
       named one by one — seven days of two checks is fourteen lines. */
    if (info.check && clause.allow && !clause.states) {
      for (const target of targets) {
        const label = q(targetInfo(target, ctx).label)
        const bad = covered.filter((k) => {
          if (k > todayKey) return false
          const allowed = clause.allow?.[fromKey(k).getDay()] ?? []
          const state = checkState(days[k], target.id || "")
          return !!state && !allowed.includes(state)
        }).length
        const waiting = covered.filter(
          (k) => k <= todayKey && !checkState(days[k], target.id || ""),
        ).length
        if (bad)
          out.push({
            level: "danger",
            line: `${label} refused on ${q(bad)} of ${q(covered.length)} days`,
          })
        else if (waiting)
          out.push({
            level: remaining <= 1 ? "warning" : "notice",
            line: `${label} unanswered on ${q(waiting)} days so far`,
          })
        else
          out.push({
            level: "allClear",
            line: `${label} kept every day so far`,
          })
      }
      continue
    }

    const bounds = weekBounds(clause, ctx, covered)
    const slotRules = weekSlotBounds(clause, covered)

    const ceilings: Ceiling[] = []
    const floors: Floor[] = []
    if (bounds.max !== undefined)
      ceilings.push({ value: reading.value, max: bounds.max, where: "" })
    if (bounds.min !== undefined && bounds.min > 0)
      floors.push({ value: reading.value, min: bounds.min, where: "" })
    for (const [slotId, b] of Object.entries(slotRules)) {
      const where = ` in ${q(slotLabel(ctx, slotId))}`
      const value = covered.reduce(
        (sum, k) => sum + measuredOn(clause, ctx, days[k], [slotId]),
        0,
      )
      if (b.max !== undefined) ceilings.push({ value, max: b.max, where })
      if (b.min !== undefined && b.min > 0)
        floors.push({ value, min: b.min, where })
    }

    ceilings.forEach((ceiling) =>
      out.push(ceilingItem(ceiling, named, fmt, " this week")),
    )

    if (partial) continue

    floors.forEach(({ value, min, where }) => {
      const need = Math.max(0, min - value)
      if (need <= 0) {
        out.push({
          level: "allClear",
          line: `${named} ${q(fmt(value))} of ${q(fmt(min))}${where} this week — done`,
        })
        return
      }
      // "Lost" has one definition and it lives in `weekLostOn`, because the
      // day's colour is built on it too.
      if (weekLostOn(rule, ctx, days, weekStart, todayKey)) {
        out.push({
          level: "danger",
          line: `${named} ${q(fmt(value))} of ${q(fmt(min))}${where} this week — out of reach`,
        })
        return
      }
      /* A count is assumed to happen **at most once a day**: three gym trips
         in one afternoon is technically possible and is not what anybody
         means by "three times a week". Time has no such ceiling, so it is
         judged against a straight pro-rata pace instead. */
      const tight =
        info.measure === "count"
          ? need >= remaining
          : need > min * (remaining / 7)
      out.push({
        level: tight ? "warning" : "notice",
        line: `${q(fmt(need))} more of ${named}${where} this week, and ${plural(remaining, "day")} left`,
      })
    })
  }
  return out
}

/* ---- assembling ---------------------------------------------------------- */

/** One notice per rule per level, in the level's own order. */
function group(
  items: Item[],
  base: Omit<Notice, "key" | "level" | "lines">,
  detailFor: (level: NoticeLevel) => string | undefined,
): Notice[] {
  return LEVELS.flatMap((level) => {
    const lines = items.filter((i) => i.level === level).map((i) => i.line)
    if (!lines.length) return []
    return [
      { ...base, key: `${base.id}::${level}`, level, lines, detail: detailFor(level) },
    ]
  })
}

function ruleNotices(
  status: RuleStatus,
  project: Project,
  ctx: StreakContext,
  todayKey: DayKey,
  now: Date,
): Notice[] {
  const { rule } = status
  const week = rule.scope === "week"
  // A rule has nothing to say about a day it does not judge, and nothing at
  // all before it was written. A weekly rule's partial first week is handled
  // inside `weekItems`, which keeps its ceilings and drops its floors.
  if (rule.startedOn > todayKey) return []
  if (!week && !judgesDay(rule, todayKey)) return []

  const state = week
    ? ruleWeekState(rule, ctx, project.days, startOfWeek(now), todayKey)
    : ruleDayState(rule, ctx, project.days[todayKey], todayKey, todayKey)
  // A frozen period is paid for; there is nothing left to say about it.
  if (state === "frozen") return []

  const items = week
    ? weekItems(rule, ctx, project.days, startOfWeek(now), todayKey)
    : dayItems(rule, ctx, project.days[todayKey], todayKey, now)

  /* **Yesterday, while it can still be frozen.**
   *
   * The board is about today, and yesterday is the exception that proves what
   * "about today" means: it is not a date, it is *what you can still act on*.
   * A day stays writable and freezable until the horizon passes it, so a
   * broken yesterday is the one thing on this board with a deadline — the old
   * alarms led with it for exactly that reason, and dropping it would mean
   * nothing anywhere told you a freeze was still available.
   *
   * Every one of its lines is `danger` by construction: the day is over, so
   * nothing on it is owed any more. They are marked, because a line that does
   * not say which day it is about is a line about today.
   */
  const yesterdayKey = toKey(addDays(now, -1))
  const yOffers = week
    ? []
    : freezeOffers(rule, project, yesterdayKey, todayKey, status)
  const yUnpaid = yOffers.filter((o) => !o.frozen)
  if (
    !week &&
    judgesDay(rule, yesterdayKey) &&
    ruleDayState(rule, ctx, project.days[yesterdayKey], yesterdayKey, todayKey) ===
      "missed" &&
    yUnpaid.length > 0
  ) {
    dayItems(rule, ctx, project.days[yesterdayKey], yesterdayKey, now, true)
      .filter((i) => i.level === "danger")
      .forEach((i) => items.unshift({ level: "danger", line: `Yesterday — ${i.line}` }))
  }

  if (!items.length) return []

  /* Yesterday leads when it has anything unpaid: it is the one with a
     deadline. Reported as **what is left to buy**, not as one price for the
     whole rule — you buy them one at a time now. */
  const unpaid = yUnpaid.length
    ? yUnpaid
    : freezeOffers(
        rule,
        project,
        todayKey,
        todayKey,
        status,
        minutesLeftToday(now),
      ).filter((o) => !o.frozen)
  const owedCost = unpaid.reduce((sum, o) => sum + o.cost, 0)
  const affordable = unpaid.filter((o) => o.ok).length
  const available = unpaid[0]?.available ?? 0

  /* **`danger` is a call; `gone` is a report** — and the difference is whether
     a freeze can still reach it. A settled violation inside the writing window
     that you can afford to cover is something to *do* something about; the
     same violation with no affordable freeze, or on a day the horizon has
     passed, is a fact. Drawing them the same colour taught the reader that the
     bright red sometimes means *act* and sometimes means *it is over*, which
     is how a bright red stops meaning anything.

     Promoted for the whole rule rather than per line, because the offers are
     per violation and the lines are not: what is true here is *nothing on this
     rule can be saved*, and that is a statement about the set. */
  /* **Nothing *to* freeze is not the same as nothing *left*.** The first
     draft promoted on `!unpaid.length` too, which swept in a weekly rule's
     partial first week: there are no offers there because the week keeps no
     verdict, so nothing is at stake and nothing was lost — calling that `gone`
     would be the same overclaim in the opposite direction. `gone` means a
     freeze was the last thing that could have covered it and you cannot buy
     one. */
  const nothingCovers = unpaid.length > 0 && !affordable
  const settledLevel: NoticeLevel = nothingCovers ? "gone" : "danger"
  const detailFor = (level: NoticeLevel): string | undefined => {
    if (level === "warning")
      return `${plural(status.current, week ? "week" : "day")} at stake`
    if (level !== "danger" && level !== "gone") return undefined
    if (!unpaid.length) return "Out of the writing window — nothing left to do"
    return affordable
      ? `${plural(unpaid.length, "violation")} to freeze · ${plural(owedCost, "freeze")} in all · ${available} available`
      : `${plural(owedCost, "freeze")} needed and you have ${available}`
  }

  return group(
    nothingCovers
      ? items.map((i) => (i.level === "danger" ? { ...i, level: settledLevel } : i))
      : items,
    {
      id: rule.id,
      tint: rule.color,
      icon: rule.iconName,
      title: rule.label,
      ruleId: rule.id,
    },
    detailFor,
  )
}

/* ---- the four sources that are not rules -------------------------------- */

const FIXED_TINT = "#8892A6"

function compositeNotice(
  project: Project,
  todayKey: DayKey,
  now: Date,
): Notice[] {
  const report = dayReport(project, todayKey, todayKey)
  if (!report.judged) return []
  const run = keptDays(project, now)
  const at = run ? `${plural(run.current, "day")} kept in a row` : ""
  if (report.state === "missed")
    return [
      {
        key: "composite::danger",
        id: "composite",
        level: "danger",
        tint: FIXED_TINT,
        icon: null,
        title: "Today",
        lines: [`${q(report.kept)} of ${q(report.judged)} rules held — the day is lost`],
        detail: at,
      },
    ]
  /* **Never `good`.** A green composite line would restate every green rule
     line above it, and the board would say the same thing twice at the same
     volume. */
  return [
    {
      key: "composite::notice",
      id: "composite",
      level: "notice",
      tint: FIXED_TINT,
      icon: null,
      title: "Today",
      lines: [
        `${q(report.kept)} of ${q(report.judged)} rules holding so far${at ? ` · ${at}` : ""}`,
      ],
    },
  ]
}

/**
 * **An expiring allowance is the one loss in this app that happens by doing
 * nothing**, which is why this is the only source whose level moves with the
 * calendar.
 */
function freezeNotices(statuses: RuleStatus[], now: Date): Notice[] {
  const weekend = now.getDay() === 0 || now.getDay() === 6
  const lines: string[] = []
  for (const s of statuses) {
    if (s.freezes.weeklyLeft <= 0) continue
    lines.push(
      `${q(s.rule.label)} — ${q(s.freezes.weeklyLeft)} of ${q(s.freezes.weeklyTotal)} left, lost on Sunday`,
    )
  }
  if (!lines.length) return []
  const level: NoticeLevel = weekend ? "warning" : "notice"
  return [
    {
      key: `freezes::${level}`,
      id: "freezes",
      level,
      tint: FIXED_TINT,
      icon: null,
      title: "This week's allowance",
      lines,
      detail: weekend ? "Granted every Monday and lost unused" : undefined,
    },
  ]
}

function openWeekNotices(statuses: RuleStatus[]): Notice[] {
  const lines: string[] = []
  for (const s of statuses)
    for (const open of s.open)
      if (open.wouldKeep)
        lines.push(
          `${q(s.rule.label)} — clean so far, pays out ${fmtDateLong(open.sealsOn)}`,
        )
  if (!lines.length) return []
  return [
    {
      key: "open-weeks::good",
      id: "open-weeks",
      level: "allClear",
      tint: FIXED_TINT,
      icon: null,
      title: "Still in play",
      lines,
    },
  ]
}

/** How close a threshold has to be before it is worth mentioning. */
const IN_REACH = 0.8

function achievementNotices(project: Project, now: Date): Notice[] {
  const earned = project.earned || {}
  const lines: string[] = []
  for (const a of project.settings.achievements || []) {
    if (earned[a.id]) continue
    const at = progressOf(project, a, now)
    if (!a.threshold || at < a.threshold * IN_REACH || at >= a.threshold) continue
    const time = measureOf(project, a) === "time" && achievementTargets(a.source).length
    const fmt = (n: number) => (time ? fmtHours(n) : String(n))
    lines.push(
      `${q(a.label)} — ${q(fmt(a.threshold - at))} to go, at ${q(fmt(at))} of ${q(fmt(a.threshold))}`,
    )
  }
  if (!lines.length) return []
  return [
    {
      key: "achievements::notice",
      id: "achievements",
      level: "notice",
      tint: FIXED_TINT,
      icon: null,
      title: "Within reach",
      lines,
    },
  ]
}

/* ---- the board's own list ------------------------------------------------ */

/**
 * Everything true about today, at four volumes.
 *
 * **Sorted by level, and within a level by the order the rules were written
 * in** — never by severity inside a level and never alphabetically: a list
 * that reorders itself has to be re-read from the top every time. The four
 * fixed sources sort to the end of their own level, because the rules are
 * promises you wrote and the rest is bookkeeping about them.
 *
 * `statuses` is passed in rather than recomputed: `App` already holds one per
 * rule, and `ruleStatus` walks every week since the rule began.
 */
export function notices(
  project: Project,
  statuses: RuleStatus[],
  now = new Date(),
): Notice[] {
  const ctx = streakContext(project)
  const todayKey = toKey(now)

  const fromRules = statuses.flatMap((s) =>
    ruleNotices(s, project, ctx, todayKey, now),
  )
  const fixed = [
    ...compositeNotice(project, todayKey, now),
    ...freezeNotices(statuses, now),
    ...openWeekNotices(statuses),
    ...achievementNotices(project, now),
  ]

  return LEVELS.flatMap((level) => [
    ...fromRules.filter((n) => n.level === level),
    ...fixed.filter((n) => n.level === level),
  ])
}
