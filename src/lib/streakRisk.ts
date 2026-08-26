/* ---------------------------------------------------------------
   Which streaks are actually in trouble — `spec 010`, part 3.

   The row used to draw every streak the same size and at the same volume, all
   the time. At any given moment the number genuinely at risk is zero, one,
   occasionally two, and five equal chips are exactly what makes each of them
   matter less: a row where everything shouts is a dashboard, and a dashboard
   gets inspected rather than feared.

   So this sorts them, and it answers one question per streak: **is there
   something you could still do about it?**

   - `danger` — it is already broken, or it can no longer be reached. A freeze
     is the only thing left, and only for as long as the day stays writable.
   - `warning` — still fixable, and the time to fix it is running out.
   - `safe` — nothing to say, and it should therefore say nothing.

   **Loud when acting is urgent, not merely possible.** That distinction is the
   whole difference between this and the row it replaced. "At least three hours"
   is unmet at nine in the morning and that is not news — it is the ordinary
   state of every day before you have done anything, and a row that says so is
   back to shouting. So an unmet *at least* is measured against the time left
   in the day, exactly as a weekly rule is measured against the days left in
   the week.

   An *at most* that has been exceeded is the opposite case and jumps straight
   to `danger`: you cannot un-watch the video, so no amount of doing fixes it
   and only a freeze is left.

   Weekly rules are the interesting case, because a week's verdict does not
   exist until the week ends. What does exist every day is **how much is left
   against how many days are left**, and that is enough to be useful on Friday
   rather than on Sunday: "gym 1 of 3, two days left" is a rule already lost,
   and saying so on Sunday is saying it when you can no longer act.

   That reachability test is the first piece of `spec 010` part 2 — the full
   version colours every day rather than only the streak row.
--------------------------------------------------------------- */

import type { Day, DayKey, Project, StreakRule } from "../types/model"
import { fmtHours } from "./time"
import type { ClauseReading, RuleStatus, StreakContext } from "./customStreaks"
import {
  clauseBounds,
  clauseReadoutParts,
  clauseTarget,
  clauseTargets,
  freezeOffer,
  judgesDay,
  measuredOn,
  q,
  readDay,
  readWeek,
  ruleDayState,
  ruleWeekState,
  slotBoundsOnWeekday,
  targetsLabel,
  weekLostOn,
  streakContext,
  targetInfo,
} from "./customStreaks"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "./date"
import { checkState } from "./checks"

export type RiskLevel = "danger" | "warning" | "safe"

/** Where a streak stands right now, and what is still worth doing about it. */
export interface StreakRisk {
  /** `"main"` for the goal streak, otherwise the rule's id. */
  id: string
  level: RiskLevel
  /**
   * The lead — `Today`, `Yesterday`, or a week's own sentence. Absent when
   * safe.
   */
  headline?: string
  /**
   * **One entry per thing that has gone wrong**, in the rule's own vocabulary.
   *
   * A list rather than a joined string, because that is what it is: a
   * condition asserting two checks has two things to say, and running them
   * together behind a dot made the reader do the separating. Whoever draws it
   * decides whether that is two lines or two clauses — the streaks row gives
   * them a line each, a tooltip a newline each.
   */
  lines?: string[]
  /** What it costs to save it, or what would fix it. */
  detail?: string
  /** The day a freeze would go on, while one still can. */
  freezeDay?: DayKey
}

const RANK: Record<RiskLevel, number> = { danger: 0, warning: 1, safe: 2 }

/** Most urgent first; ties keep the order they were given in. */
export const byRisk = (a: StreakRisk, b: StreakRisk) =>
  RANK[a.level] - RANK[b.level]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const freezes = (n: number) =>
  `${plural(n, "freeze")} ${n === 1 ? "covers" : "cover"} it`

/**
 * How long the run would be if this day were kept.
 *
 * The number worth printing when yesterday is already broken. `status.current`
 * is no use there: the streak has *already* reset, so it counts from today and
 * says "1 day at stake" about a nineteen-day run. What a freeze buys is the
 * run that ended yesterday, so that is what gets counted — backwards from the
 * day before, stopping where the rule started judging.
 */
function runIfKept(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  dayKey: DayKey,
  todayKey: DayKey,
): number {
  let run = 1
  for (let d = addDays(fromKey(dayKey), -1); toKey(d) >= rule.startedOn; d = addDays(d, -1)) {
    const key = toKey(d)
    const state = ruleDayState(rule, ctx, days[key], key, todayKey)
    if (state === "unjudged") continue
    if (state !== "met" && state !== "frozen") break
    run += 1
  }
  return run
}

/**
 * The conditions that fell short, said in their own measure.
 *
 * Each condition prints in the unit it is counted in — a compound rule can
 * hold one about hours and one about slips, and a shared format would be wrong
 * for one of them.
 */
function shortfall(
  readings: ClauseReading[],
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  dayKey: DayKey,
): string[] {
  return readings
    .filter((r) => r.applies && r.deficit > 0)
    .flatMap((r) => clauseReadoutParts(r, ctx, days[dayKey], dayKey, "failing"))
}

/**
 * **What today still asks of you, said quietly.**
 *
 * Everything owed today is knowable at breakfast, and the row above says none
 * of it until the evening — by design, because a warning that fires every
 * morning is a warning nobody reads. But *not an alarm* is not the same as
 * *nothing*, and the gap between them is where this lives: a reminder, in the
 * opened streaks row, under the chevron. You go and look; it does not come and
 * find you.
 *
 * **Only what you can still do.** A floor short of its figure and a check with
 * no answer yet are both things this morning can fix. A ceiling is not: there
 * is no doing less of something not yet done, and printing `2 of 3 left` here
 * would be reading out an allowance as if it were a chore.
 *
 * Day-scope only. A weekly rule's "today" is a question about pace, which
 * `PaceCard` already answers properly and a one-line reminder would answer
 * badly.
 */
export function dueToday(
  rule: StreakRule,
  project: Project,
  now = new Date(),
): string | null {
  if (rule.scope === "week") return null
  const todayKey = toKey(now)
  if (todayKey < rule.startedOn || !judgesDay(rule, todayKey)) return null

  const ctx = streakContext(project)
  const day = project.days[todayKey]
  const parts: string[] = []

  for (const r of readDay(rule, ctx, day, todayKey)) {
    if (!r.applies) continue
    const info = targetInfo(clauseTarget(r.clause), ctx)

    if (info.check) {
      // Unanswered, not "answered wrongly" — a `no` you meant is not a chore
      // left undone, and the row above is already shouting about it.
      const waiting = clauseTargets(r.clause).filter(
        (t) => !checkState(day, t.id || ""),
      )
      if (waiting.length)
        parts.push(
          `${waiting.map((t) => q(targetInfo(t, ctx).label)).join(", ")} to answer`,
        )
      continue
    }

    const need = owed(r, ctx, todayKey)
    if (need <= 0) continue

    /* **Nothing is asked for that can no longer be done.** Three hours at
       eleven at night is not a reminder, it is a taunt — and the alarm above
       has already said the day is out of reach. Time only: it is the one
       measure the clock can rule out, and the same arithmetic `todayUrgency`
       uses to decide the day is lost. */
    if (info.measure === "time" && need > minutesLeftToday(now)) continue

    const said = info.measure === "time" ? fmtHours(need) : String(need)
    parts.push(
      `${q(said)} more of ${targetsLabel(clauseTargets(r.clause), ctx)}`,
    )
  }

  return parts.length ? parts.join(" · ") : null
}

/** Minutes between now and midnight — what is left to act in. */
const minutesLeftToday = (now: Date) =>
  24 * 60 - (now.getHours() * 60 + now.getMinutes())

/** Past this much of the day gone, an unmet count starts to matter. */
const EVENING_MINUTES = 6 * 60

/**
 * How much of this condition is still owed, in its own unit.
 *
 * The floor only. A ceiling owes nothing — it is already spent or it is not,
 * and there is no amount of doing that fixes having done too much.
 */
const owed = (r: ClauseReading, ctx: StreakContext, dayKey: DayKey): number => {
  const { min } = clauseBounds(r.clause, ctx, dayKey)
  return min === undefined ? 0 : Math.max(0, min - r.value)
}

/**
 * How much trouble today is in, condition by condition.
 *
 * An exceeded ceiling is already spent and can only be frozen. An unmet floor
 * is judged against the hours left: needing two of the three hours you
 * have left is worth saying, and needing two of the twelve you have left is
 * the ordinary shape of a morning.
 */
/**
 * An allowance that has been spent to the last one, if this condition has one.
 *
 * **A ceiling of nought is not an allowance and never warns.** It sits at its
 * limit from midnight to midnight, so warning about it would put a permanent
 * amber row on the page for a rule nobody has broken — and *never do X* is the
 * commonest rule in the app. The state worth naming is the one the user asked
 * for: you had three, you have used three, and the next one ends the day.
 *
 * Slot allowances count too. Reported with the slot's own figures, since *two
 * of two in the evening* is a different sentence from the day's total.
 */
const spentAllowance = (
  r: ClauseReading,
  ctx: StreakContext,
  day: Day | undefined,
  dayKey: DayKey,
): { used: number; max: number } | null => {
  const { max } = clauseBounds(r.clause, ctx, dayKey)
  if (max !== undefined && max > 0 && r.value === max)
    return { used: r.value, max }
  const slotRules = slotBoundsOnWeekday(r.clause, fromKey(dayKey).getDay())
  for (const [slotId, bounds] of Object.entries(slotRules)) {
    if (bounds.max === undefined || bounds.max <= 0) continue
    const used = measuredOn(r.clause, ctx, day, [slotId])
    if (used === bounds.max) return { used, max: bounds.max }
  }
  return null
}

function todayUrgency(
  readings: ClauseReading[],
  ctx: StreakContext,
  day: Day | undefined,
  now: Date,
): { level: RiskLevel; spent: boolean; brink: ClauseReading[] } {
  const left = minutesLeftToday(now)
  const todayKey = toKey(now)
  let level: RiskLevel = "safe"
  // Whether the damage is already done, as opposed to merely running late.
  // The two are different sentences: one cannot be undone, the other cannot
  // be reached, and telling someone the wrong one is telling them to give up
  // when they could still act.
  let spent = false
  /** Conditions sitting exactly on a ceiling — one more and the day is gone. */
  const brink: ClauseReading[] = []
  const worse = (next: RiskLevel) => {
    if (RANK[next] < RANK[level]) level = next
  }

  readings.forEach((r) => {
    if (!r.applies) return

    /* **A ceiling at its limit is the state this app had no word for.** Green
       says nothing is wrong and red says nothing can be done; three of three
       Pinterests used is neither — everything still holds, and one more ends
       it. `c.warn` was added for exactly this stretch, and the check has to
       sit above the deficit guard below, because a ceiling at its limit is
       *kept*: its deficit is nought and the loop would return before seeing
       it. */
    if (r.deficit === 0) {
      if (spentAllowance(r, ctx, day, todayKey)) {
        brink.push(r)
        worse("warning")
      }
      return
    }
    const info = targetInfo(clauseTarget(r.clause), ctx)

    /* **A check has no rate and no headroom.** It is answered or it is not,
       and this function could not see one at all: the requirement lives in
       `clause.allow`, so `clauseBounds` returns neither side, the
       already-spent branch below never fired and `owed()` came to nought — so
       the loop returned before reaching the evening rule. A rule whose day was
       already lost said `safe` at nine in the morning, `safe` at ten at night,
       and then turned up the next morning as yesterday's emergency.

       An answer outside the accepted set is spent the moment it is written,
       exactly like a breached ceiling: the thing happened, and no amount of
       remaining day takes it back. No answer yet is the ordinary case, and the
       day itself is its clock. */
    if (info.check && r.clause.allow) {
      const allowed = r.clause.allow[fromKey(todayKey).getDay()] ?? []
      const answeredWrong = clauseTargets(r.clause).some((t) => {
        const state = checkState(day, t.id || "")
        return !!state && !allowed.includes(state)
      })
      if (answeredWrong) {
        spent = true
        return worse("danger")
      }
      if (left <= EVENING_MINUTES) return worse("warning")
      return
    }

    const bounds = clauseBounds(r.clause, ctx, todayKey)
    // Over a ceiling is already spent: nothing left to do but freeze it.
    if (bounds.max !== undefined && r.value > bounds.max) {
      spent = true
      return worse("danger")
    }
    const need = owed(r, ctx, todayKey)
    if (need <= 0) return
    if (info.measure === "time" && !info.check) {
      if (need > left) return worse("danger")
      // More than half of what is left would have to go on this one thing.
      if (need * 2 > left) return worse("warning")
      return
    }
    // A count or a check has no rate to fall behind, so the day itself is the
    // clock: nothing to say until the evening.
    if (left <= EVENING_MINUTES) return worse("warning")
  })

  return { level, spent, brink }
}

/**
 * A rule that judges a week, read against the days it has left.
 *
 * A count is assumed to happen **at most once a day** — three gym trips in one
 * afternoon is technically possible and is not what anybody means by "three
 * times a week", so a rule needing three with two days left is treated as
 * lost. Time has no such ceiling, so it is judged against a straight pro-rata
 * pace instead.
 */
function weeklyRisk(
  rule: StreakRule,
  ctx: StreakContext,
  days: Record<DayKey, Day>,
  today: Date,
  todayKey: DayKey,
): RiskLevel {
  const weekStart = startOfWeek(today)
  const state = ruleWeekState(rule, ctx, days, weekStart, todayKey)
  if (state === "missed") return "danger"
  if (state === "met" || state === "frozen" || state === "unjudged") return "safe"

  // "Lost" has exactly one definition and it lives in `weekLostOn`, because
  // the day verdict is built on it too and a row that disagreed with the
  // colour of the day would be worse than no row.
  if (weekLostOn(rule, ctx, days, weekStart, todayKey)) return "danger"

  const readings = readWeek(rule, ctx, days, weekStart, todayKey)
  const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length

  let level: RiskLevel = "safe"
  const worse = (next: RiskLevel) => {
    if (RANK[next] < RANK[level]) level = next
  }

  // Still winnable, so the only question left is whether it is getting tight.
  readings.forEach((r) => {
    if (!r.applies) return
    const need = owed(r, ctx, todayKey)
    if (need <= 0) return
    const info = targetInfo(clauseTarget(r.clause), ctx)
    // Every remaining day now has to carry one. Still possible, barely.
    if (info.measure === "count") {
      if (need >= remaining) worse("warning")
      return
    }
    // Behind the straight line from here to Sunday.
    const { min } = clauseBounds(r.clause, ctx, todayKey)
    if (need > (min ?? 0) * (remaining / 7)) worse("warning")
  })

  return level
}

/** One custom rule's standing. */
export function ruleRisk(
  status: RuleStatus,
  project: Project,
  today = new Date(),
): StreakRisk {
  const { rule } = status
  const ctx = streakContext(project)
  const todayKey = toKey(today)
  const days = project.days
  const id = rule.id

  if (rule.scope === "week") {
    const level = weeklyRisk(rule, ctx, days, today, todayKey)
    if (level === "safe") return { id, level }
    const weekStart = startOfWeek(today)
    const readings = readWeek(rule, ctx, days, weekStart, todayKey)
    const offer = freezeOffer(rule, project, todayKey, todayKey, status)
    const remaining = weekDates(weekStart).filter((d) => toKey(d) >= todayKey).length
    return {
      id,
      level,
      headline: "This week",
      lines: shortfall(readings, ctx, days, todayKey),
      detail:
        level === "danger"
          ? offer.ok
            ? `Out of reach — the whole week takes ${plural(offer.cost, "freeze")}`
            : "Out of reach, and there are not enough freezes to cover it"
          : `${plural(remaining, "day")} left, and every one of them has to count`,
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  const yesterdayKey = toKey(addDays(today, -1))
  const yState = ruleDayState(rule, ctx, days[yesterdayKey], yesterdayKey, todayKey)
  // Yesterday first: it is the one with a deadline. Today can still be fixed
  // by doing the thing, which is always the better answer than a freeze.
  if (yState === "missed") {
    const offer = freezeOffer(rule, project, yesterdayKey, todayKey, status)
    const readings = readDay(rule, ctx, days[yesterdayKey], yesterdayKey)
    const restores = runIfKept(rule, ctx, days, yesterdayKey, todayKey)
    return {
      id,
      level: "danger",
      headline: "Yesterday",
      lines: shortfall(readings, ctx, days, yesterdayKey),
      detail: offer.ok
        ? `${freezes(offer.cost)} · keeps ${plural(restores, "day")} · ${offer.available} available`
        : offer.cost > 0
          ? `${plural(restores, "day")} lost · ${plural(offer.cost, "freeze")} needed and you have ${offer.available}`
          : "Out of the writing window — nothing left to do",
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  /* **`met` as well as `pending`.** A rule sitting exactly on a ceiling is
     *kept* — its deficit is nought — and the gate used to read `pending`
     alone, so the one state worth warning about could never be reached. The
     cost of widening it is one `todayUrgency` call on a day where everything
     holds, which returns `safe` and takes the early exit below. */
  const tState = ruleDayState(rule, ctx, days[todayKey], todayKey, todayKey)
  if (tState === "pending" || tState === "met") {
    const readings = readDay(rule, ctx, days[todayKey], todayKey)
    const { level, spent, brink } = todayUrgency(
      readings,
      ctx,
      days[todayKey],
      today,
    )
    if (level === "safe") return { id, level }
    const offer = freezeOffer(rule, project, todayKey, todayKey, status)
    const restores = runIfKept(rule, ctx, days, todayKey, todayKey)
    const lost = spent ? "Nothing undoes it" : "No longer reachable today"
    /* Nothing is short, so `shortfall` has nothing to say: what is worth
       saying is which ceiling you are standing on. */
    const short = shortfall(readings, ctx, days, todayKey)
    const said = short.length
      ? short
      : brink.map((r) => {
          const at = spentAllowance(r, ctx, days[todayKey], todayKey)
          const named = targetsLabel(clauseTargets(r.clause), ctx)
          return at
            ? `${named} ${q(at.used)} of ${q(at.max)} used — one more ends it`
            : named
        })
    return {
      id,
      level,
      headline: "Today",
      lines: said,
      detail:
        level === "danger"
          ? offer.ok
            ? `${lost} · ${freezes(offer.cost)} and keeps ${plural(restores, "day")}`
            : `${lost} · ${plural(offer.cost, "freeze")} needed and you have ${offer.available}`
          : // Standing on a ceiling is not the day running out — nothing is
            // owed and no hour of the day changes it. Only what is at stake.
            short.length
            ? `${plural(restores, "day")} at stake · the day is running out`
            : `${plural(restores, "day")} at stake`,
      freezeDay: offer.ok ? offer.key : undefined,
    }
  }

  return { id, level: "safe" }
}
