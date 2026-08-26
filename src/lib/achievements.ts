/* ---------------------------------------------------------------
   Achievements — `spec 010`, part 5.

   Everything else here is built on fear: a streak is what you lose, a red day
   is what you avoid, the balance is what a bad week costs. That works, and it
   is one-sided. **An achievement cannot be taken away**, and it is the only
   reason the history is worth having accumulated rather than merely survived.

   Three things make it honest rather than decorative:

   **Few, and written by you.** A generated 30/60/100 ladder across five rules
   is thirty achievements, which is the dilution problem wearing a rosette. The
   sources are a short list for the same reason — every one is a number the app
   already computes, and a wider list would turn the editor into a second rule
   builder.

   **Earned once, with its date, never recomputed.** The same ledger rule as
   the verdicts and the day marks. What was reached was reached; editing the
   past cannot un-reach it, and cannot re-mint it either.

   **Its own ledger, not `settings`.** The hand that edits the definitions must
   not be the hand that edits what was earned.
--------------------------------------------------------------- */

import type {
  Achievement,
  AchievementRun,
  AchievementSource,
  AchievementWindow,
  Day,
  DayKey,
  EarnedAchievement,
  Project,
  StreakTarget,
} from "../types/model"
import {
  listDays,
  q,
  ruleDayState,
  ruleWeekState,
  streakContext,
  targetInfo,
  targetsLabel,
} from "./customStreaks"
import type { StreakContext } from "./customStreaks"
import {
  dayReport,
  foldVerdicts,
  heldUp,
  verdictStart,
} from "./dayVerdict"
import { dayCounters, unitDayTotal } from "./counters"
import { entryActivity } from "./entries"
import { fmtHours } from "./time"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "./date"

/**
 * The targets an achievement counts, however it was written.
 *
 * The one place that knows a `total` could once name only one — the same job
 * `clauseTargets` does for a condition, and for the same reason: an
 * achievement written before several were allowed has to go on reading as
 * itself, and nothing else should have to know that.
 */
export const achievementTargets = (
  source: AchievementSource,
): StreakTarget[] => {
  if (source.kind !== "total") return []
  if (source.targets?.length) return source.targets
  return source.target ? [source.target] : []
}

/** What a target gathered on one day, in whatever it is measured in. */
function dayTotal(
  day: Day,
  target: StreakTarget,
  ctx: StreakContext,
): number {
  const info = targetInfo(target, ctx)

  if (info.measure === "time") {
    const keep = (id: string) =>
      target.kind === "time"
        ? true
        : target.kind === "activity"
          ? id === target.id
          : ctx.activities.some(
              (a) => a.id === id && a.categoryId === target.id,
            )
    const cells = day.cells
    if (!cells) return 0
    return Object.values(cells)
      .flat()
      .reduce(
        (inner, e) =>
          keep(String(entryActivity(e))) ? inner + (Number(e.minutes) || 0) : inner,
        0,
      )
  }

  return ctx.units
    .filter((u) =>
      target.kind === "unit"
        ? u.id === target.id
        : target.kind === "tag"
          ? (u.tagIds || []).includes(target.id || "")
          : u.categoryId === target.id,
    )
    .reduce((sum, u) => sum + unitDayTotal(dayCounters(day), u.id), 0)
}

/** The key a day belongs to, for the window a total is measured over. */
const windowKeyOf = (dayKey: DayKey, window: AchievementWindow): string =>
  window === "day"
    ? dayKey
    : window === "week"
      ? toKey(startOfWeek(fromKey(dayKey)))
      : dayKey.slice(0, 7)

/**
 * What a `total` source stands at.
 *
 * **`ever` sums; a window takes the best one.** Read as the maximum over every
 * window in the history, so `100h in one month` is earned the first time any
 * month clears it — and, like every ledger here, never un-earned by what a
 * later month does. The alternative, reading only the window you are standing
 * in, would make an achievement blink out again on the first of the month.
 */
function totalFor(
  project: Project,
  source: AchievementSource,
  ctx: StreakContext,
): number {
  const targets = achievementTargets(source)
  if (!targets.length) return 0
  const window = (source.kind === "total" && source.window) || "ever"

  const onDay = (day: Day) =>
    targets.reduce((sum, t) => sum + dayTotal(day, t, ctx), 0)

  if (window === "ever")
    return Object.values(project.days).reduce((sum, d) => sum + onDay(d), 0)

  const buckets = new Map<string, number>()
  for (const [dayKey, day] of Object.entries(project.days)) {
    const key = windowKeyOf(dayKey, window)
    buckets.set(key, (buckets.get(key) ?? 0) + onDay(day))
  }
  return buckets.size ? Math.max(...buckets.values()) : 0
}

/**
 * The run an achievement counts, however it was written.
 *
 * The one place that knows there were once three separate sources for what is
 * one shape with three axes on it. Same job `achievementTargets` does for the
 * other half, and `clauseTargets` does for a condition.
 */
export const runOf = (source: AchievementSource): AchievementRun | null => {
  if (source.kind === "run") return source.run
  if (source.kind === "keptDays") return { consecutive: true, scale: "day" }
  if (source.kind === "keptWeeks") return { consecutive: true, scale: "week" }
  if (source.kind === "ruleStreak")
    return { ruleId: source.ruleId, consecutive: true, scale: "day" }
  return null
}

/**
 * How many days — or weeks — went well, under one reading of "went well".
 *
 * **The best there has ever been, not the run standing right now.** An
 * achievement is reached, and reaching is a thing that happened: if thirty in
 * a row happened in June, it happened, and a bad July does not un-happen it.
 * That is the same rule the ledger enforces after the fact, applied before it
 * — and reading `current` instead made the figure depend on the app being open
 * on the right evening.
 *
 * A day the rules do not judge — before any of them started, or a rule's own
 * off-day — is skipped rather than counted or broken on, exactly as `keptDays`
 * skips one. It is not a success and it is not a failure; there was nothing
 * there to be either.
 */
export function runProgress(
  project: Project,
  run: AchievementRun,
  today = new Date(),
): number {
  const from = verdictStart(project)
  if (!from) return 0
  const todayKey = toKey(today)
  if (from > todayKey) return 0
  const ctx = streakContext(project)
  const rule = run.ruleId
    ? (project.settings.streakRules || []).find((r) => r.id === run.ruleId)
    : null
  if (run.ruleId && !rule) return 0

  /** Every unit in order, as `true` (held), `false` (broke) or null (unjudged). */
  const marks: (boolean | null)[] = []

  if (run.scale === "week") {
    for (
      let monday = startOfWeek(fromKey(from));
      toKey(monday) <= todayKey;
      monday = addDays(monday, 7)
    ) {
      if (rule) {
        const state = ruleWeekState(rule, ctx, project.days, monday, todayKey)
        marks.push(
          state === "unjudged" || state === "pending" ? null : state !== "missed",
        )
        continue
      }
      const states = weekDates(monday)
        .map(toKey)
        .filter((k) => k >= from && k <= todayKey)
        .map((k) => dayReport(project, k, todayKey, ctx).state)
      const folded = foldVerdicts(states)
      marks.push(
        folded === "unjudged" || folded === "pending" ? null : heldUp(folded),
      )
    }
  } else {
    for (let d = fromKey(from); toKey(d) <= todayKey; d = addDays(d, 1)) {
      const key = toKey(d)
      // The weekday filter decides what is *looked at*, so a day outside it is
      // not a gap in the run — it was never part of the sequence.
      if (run.weekdays?.length && !run.weekdays.includes(d.getDay())) continue
      if (rule) {
        const state = ruleDayState(rule, ctx, project.days[key], key, todayKey)
        marks.push(
          state === "unjudged" || state === "pending" ? null : state !== "missed",
        )
        continue
      }
      const { state } = dayReport(project, key, todayKey, ctx)
      marks.push(
        state === "unjudged" || state === "pending" ? null : heldUp(state),
      )
    }
  }

  if (!run.consecutive) return marks.filter((m) => m === true).length

  let best = 0
  let now = 0
  for (const mark of marks) {
    if (mark === null) continue
    if (mark) {
      now += 1
      if (now > best) best = now
    } else now = 0
  }
  return best
}

/** Where this achievement stands right now. */
export function progressOf(
  project: Project,
  achievement: Achievement,
  today = new Date(),
): number {
  const run = runOf(achievement.source)
  if (run) return runProgress(project, run, today)
  return totalFor(project, achievement.source, streakContext(project))
}

/** Minutes or occurrences — decides how the figure and the goal are printed. */
export function measureOf(
  project: Project,
  achievement: Achievement,
): "time" | "count" {
  const { source } = achievement
  if (source.kind !== "total") return "count"
  const [first] = achievementTargets(source)
  // A total's targets always share a kind, because the picker chooses the kind
  // before the chips — so the first one's measure is every one's.
  return first ? targetInfo(first, streakContext(project)).measure : "count"
}

export const fmtProgress = (n: number, measure: "time" | "count"): string =>
  measure === "time" ? fmtHours(n) : String(n)

/**
 * The local day an achievement was earned on.
 *
 * `earnedAt` is an instant in UTC, and slicing the first ten characters off it
 * is a day in UTC — which is the wrong day for anything logged in the evening
 * west of Greenwich or after midnight east of it. Every date in this app is a
 * local one on purpose; this is how the instant becomes one.
 */
export const earnedOn = (earnedAt: string): string =>
  toKey(new Date(earnedAt))

/**
 * The achievements reached but not yet written — write these, once.
 *
 * Returns rather than writes, exactly as `dueMarks` and `ruleStatus` do: the
 * caller owns persistence, and an earned achievement is written a single time.
 */
export function dueAchievements(
  project: Project,
  today = new Date(),
): EarnedAchievement[] {
  const earned = project.earned || {}
  const at = new Date().toISOString()
  return (project.settings.achievements || [])
    .filter((a) => !earned[a.id])
    .map((a) => ({ a, value: progressOf(project, a, today) }))
    .filter(({ a, value }) => a.threshold > 0 && value >= a.threshold)
    .map(({ a, value }) => ({
      achievementId: a.id,
      earnedAt: at,
      value,
      // Recorded here rather than read back later: the account is spent
      // against this figure, and a definition edited afterwards must not move
      // a balance somebody has already bought something with.
      reward: Math.max(0, a.reward ?? 0),
    }))
}

/**
 * The achievement read back, the way `clauseSentence` reads a rule back.
 *
 * Same discipline: names and figures quoted through `q()` so they survive
 * being a bare string in a tooltip, and `ui/Sentence` gives those spans weight
 * where it can. The only way to check that what you built is what you meant is
 * to read it back, and two sentences that can drift check nothing.
 */
export function achievementSentence(
  project: Project,
  a: Achievement,
): string {
  const amount = q(fmtProgress(a.threshold, measureOf(project, a)))
  const run = runOf(a.source)

  if (run) {
    const unit = run.scale === "week" ? "weeks" : "days"
    const whose = run.ruleId
      ? q(
          (project.settings.streakRules || []).find((r) => r.id === run.ruleId)
            ?.label || "a deleted rule",
        )
      : "kept"
    const when =
      run.scale === "day" && run.weekdays?.length
        ? ` — counting only ${listDays(run.weekdays)}`
        : ""
    return `Reach ${amount} ${whose} ${unit} ${
      run.consecutive ? "in a row" : "in all"
    }${when}`
  }

  const ctx = streakContext(project)
  const named = targetsLabel(achievementTargets(a.source), ctx)
  const window = windowOf(a.source)
  const over =
    window === "ever"
      ? "in all"
      : `in a single ${window === "month" ? "month" : window}`
  return `Gather ${amount} of ${named} ${over}`
}

/* ---- The lock ------------------------------------------------------------ */

/** `ever` is the widest; each step down is strictly harder to clear. */
const WINDOW_RANK: Record<AchievementWindow, number> = {
  ever: 3,
  month: 2,
  week: 1,
  day: 0,
}

const windowOf = (source: AchievementSource): AchievementWindow =>
  (source.kind === "total" && source.window) || "ever"

/** The same string for the same target, so a set can be compared. */
const targetKey = (t: StreakTarget): string =>
  `${t.kind}|${t.id || ""}|${t.measure || ""}|${t.memberKind || ""}`

/**
 * Can it be proved this edit cannot make the achievement easier?
 *
 * The same one-sided test the rules use, and for the same reason: a change
 * that cannot be classified waits rather than being guessed at. Changing what
 * is counted is incomparable — a hundred hours of lessons and a hundred gym
 * visits are not two points on one scale — so it waits.
 *
 * It used to be `JSON.stringify(source)` on both sides, which was exactly
 * right for three fixed sources and far too blunt once a total could name a
 * set and choose a window. Two dimensions have a direction now, and both take
 * the argument the streak rules already make:
 *
 * - **Targets are summed**, so one more is one more place the number can come
 *   from, which is *easier*. Adding waits; dropping lands at once.
 * - **A window narrows.** Anything reached inside a day was reached inside its
 *   month, so `ever → month → week → day` is monotonically harder. Tightening
 *   lands; loosening waits.
 */
export const achievementNarrows = (
  prev: Achievement,
  next: Achievement,
): boolean => {
  if (next.threshold < prev.threshold) return false
  /* **The reward reads backwards from the threshold.** Asking for more points
     in exchange for the same work is a loosening of the bargain even though
     nothing about the bar moved, so raising one waits; lowering lands. */
  if ((next.reward ?? 0) > (prev.reward ?? 0)) return false

  const wasRun = runOf(prev.source)
  const isRun = runOf(next.source)
  if (!!wasRun !== !!isRun) return false

  if (wasRun && isRun) {
    // Whose verdict, and at what size, are the two things a run cannot be
    // compared across: thirty days of one rule and thirty of another are not
    // two points on one scale, and nor are days and weeks.
    if ((wasRun.ruleId || "") !== (isRun.ruleId || "")) return false
    if (wasRun.scale !== isRun.scale) return false

    /* **Requiring them in a row is harder; dropping that is easier.** Any run
       of thirty consecutive is also thirty in all, never the other way round,
       so `false → true` narrows and `true → false` waits. */
    if (wasRun.consecutive && !isRun.consecutive) return false

    /* **Fewer weekdays looked at is harder.** The days are a filter on what
       counts, so widening it hands the run more chances to reach its figure —
       and under `consecutive` it also hands it more chances to be broken,
       which pulls the other way. Incomparable, so any change to the set waits
       unless it is exactly the same set. */
    const was = new Set(wasRun.weekdays?.length ? wasRun.weekdays : WEEKDAYS)
    const now = new Set(isRun.weekdays?.length ? isRun.weekdays : WEEKDAYS)
    if (was.size !== now.size || [...now].some((d) => !was.has(d))) return false
    return true
  }

  if (WINDOW_RANK[windowOf(next.source)] > WINDOW_RANK[windowOf(prev.source)])
    return false

  // Every target the new one counts must be one the old one counted: a set it
  // could already draw on cannot have grown.
  const before = new Set(achievementTargets(prev.source).map(targetKey))
  return achievementTargets(next.source).every((t) => before.has(targetKey(t)))
}

export interface AchievementEdit {
  changed: boolean
  narrowing: boolean
  /** Still the day it was written: anything goes and nothing starts the clock. */
  settingUp: boolean
  /** The clock permits it; only the written reason is missing. */
  needsReason: boolean
  allowed: boolean
  next: Achievement
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

const terms = (a: Achievement) => {
  const run = runOf(a.source)
  if (run)
    return JSON.stringify({
      reward: a.reward ?? 0,
      kind: "run",
      ruleId: run.ruleId || "",
      consecutive: run.consecutive,
      scale: run.scale,
      weekdays: [...(run.weekdays?.length ? run.weekdays : WEEKDAYS)].sort(),
      threshold: a.threshold,
    })
  return JSON.stringify({
    reward: a.reward ?? 0,
    kind: a.source.kind,
    // Normalised, so re-picking the same targets in another order is not an
    // edit and the singular spelling is not a difference from the plural one.
    targets: achievementTargets(a.source).map(targetKey).sort(),
    window: windowOf(a.source),
    threshold: a.threshold,
  })
}

/** The same shape as `ruleEdit`, down to the grace day. */
export function achievementEdit(
  prev: Achievement,
  draft: Achievement,
  lockDays: number,
  today = new Date(),
  reason = "",
): AchievementEdit {
  const todayKey = toKey(today)
  const changed = terms(prev) !== terms(draft)
  const narrowing = achievementNarrows(prev, draft)
  const settingUp = todayKey === prev.createdOn
  const base = { changed, narrowing, settingUp, needsReason: false }
  if (!changed) return { ...base, narrowing: true, allowed: true, next: draft }
  if (narrowing || settingUp) return { ...base, allowed: true, next: draft }
  if (todayKey < prev.lockedUntil)
    return { ...base, allowed: false, next: prev }
  const written = reason.trim()
  if (!written) return { ...base, needsReason: true, allowed: false, next: prev }
  const unlock = new Date(today)
  unlock.setDate(unlock.getDate() + lockDays)
  return {
    ...base,
    allowed: true,
    next: {
      ...draft,
      lockedUntil: toKey(unlock),
      looseningLog: [
        ...(prev.looseningLog || []),
        { at: todayKey, reason: written },
      ],
    },
  }
}

/** A fresh definition. `EditableList` supplies the name, colour and icon. */
export const newAchievement = (
  today: Date,
): Omit<Achievement, "id" | "label" | "color" | "iconName"> => ({
  source: { kind: "run", run: { consecutive: true, scale: "day" } },
  threshold: 30,
  reward: 100,
  createdOn: toKey(today),
  lockedUntil: toKey(today),
})
