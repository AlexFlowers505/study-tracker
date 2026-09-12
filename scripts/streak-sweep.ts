/* ---------------------------------------------------------------
   Every shape a streak rule can take, against a period that should hold and a
   period that should break it.

   **Why this is checked in.** The audit that found four silent holes in
   `spec 011` was a throwaway under `.claude/`, which is gitignored, so it went
   with the next cleanup — and then a single morning of ordinary use turned up
   eight more, three of them in the engine. Every one of those would have been
   caught here. `npm run sweep`.

   **Expectations are written out, never derived.** The throwaway version
   guessed — *does an empty period pass something that claims to ask?* — and
   flagged three ceilings that were behaving perfectly, because an empty period
   is exactly what `at most 0` is for. A wrong expectation costs more than a
   missing one: it teaches you to ignore the output. So each case says what it
   wants and why, and a case that is *known* wrong today carries `pending`
   with the spec that owns it.

   This is not a test framework and does not want to be one. The repo has no
   tests on purpose (`CLAUDE.md`); this is one script with one job, run by hand
   when the streak engine is touched.
--------------------------------------------------------------- */

import {
  achievementEdit,
  achievementNarrows,
  dueAchievements,
  progressOf,
} from "../src/lib/achievements"
import { KEPT_VALUE, MISSED_COST, dueMarks } from "../src/lib/balance"
import { removalGate } from "../src/lib/customStreaks"
import { notices, worstLevel } from "../src/lib/notices"
import type { Notice, NoticeLevel } from "../src/lib/notices"
import {
  clauseAsksNothing,
  clauseImpossible,
  clauseReadout,
  clauseSentence,
  clauseWeekReadoutParts,
  coveredDays,
  clauseInForceFrom,
  isNarrowing,
  judgesDay,
  ruleAsOf,
  ruleClauses,
  ruleEdit,
  ruleHeldOnWeek,
  revisionsOf,
  termsOf,
  termsSnapshot,
  ruleStateOn,
  readDay,
  readWeek,
  ruleDayState,
  ruleStatus,
  ruleWeekDayState,
  ruleWeekShown,
  ruleWeekState,
  streakContext,
  totalDeficit,
  violationsCost,
  violationsOn,
  weekViolationsOn,
  freezeOffers,
  freezeSpendOn,
  runShown,
} from "../src/lib/customStreaks"
import { dayReport, keptDays } from "../src/lib/dayVerdict"
import { addDays, fromKey, startOfWeek, toKey, weekDates } from "../src/lib/date"
import { benchmarkMeter, benchmarkMinutes } from "../src/lib/benchmark"
import { canBuy } from "../src/lib/shop"
import { benchmarkBar } from "../src/lib/benchmark"
import { computeOverviewStats } from "../src/lib/analytics"
import { foldDay, foldSleep } from "../src/lib/sleepMove"
import type {
  Achievement,
  Activity,
  CounterUnit,
  Day,
  DayKey,
  Project,
  RuleRevision,
  Slot,
  StreakClause,
  StreakRule,
} from "../src/types/model"

/* ---- the fixture ------------------------------------------------------- */

const UNITS: CounterUnit[] = [
  { id: "u-yt", label: "Youtube", color: "#888", iconName: "Circle", kind: "tally" },
  { id: "u-gym", label: "Gym", color: "#888", iconName: "Circle", kind: "tally" },
  { id: "u-wake", label: "Wake up", color: "#888", iconName: "Circle", kind: "check" },
  { id: "u-bed", label: "Go to bed", color: "#888", iconName: "Circle", kind: "check" },
]
const ACTIVITIES = [
  // Tagged since `spec 019`: an activity carries tags like any other counter.
  { id: "a-les", label: "Lessons", color: "#888", iconName: "Circle", tagIds: ["t-deep"] },
  // An ordinary activity since `spec 024`, and named here so a rule can point
  // at it exactly as it would at any other.
  { id: "a-sleep", label: "Sleep", color: "#888", iconName: "Moon" },
] as Activity[]
const SLOTS = [
  { id: "s-am", label: "Morning", color: "#888", iconName: "Circle" },
  { id: "s-pm", label: "Evening", color: "#888", iconName: "Circle" },
  { id: "slot-sleep", label: "Sleep", color: "#888", iconName: "Moon" },
] as Slot[]

/** Monday 17 Aug 2026, a week that is wholly in the past. */
const WEEK = new Date("2026-08-17T12:00:00")
const KEYS = weekDates(WEEK).map(toKey)
const [MON, TUE, WED, THU] = KEYS
/** Well after that week, so nothing in it is still pending. */
const TODAY: DayKey = "2026-08-31"

const counted = (unitId: string, slotId: string, n: number): Day =>
  ({ counters: { [unitId]: { [slotId]: n } } }) as unknown as Day

const studied = (minutes: number, slotId = "s-am"): Day =>
  ({
    cells: { [slotId]: [{ id: "e", activity: "a-les", minutes }] },
  }) as unknown as Day

/** A day of sessions with clocks on them — `spec 023`. */
const sat = (
  sessions: [start: string, end: string][],
  slotId = "s-am",
  activity = "a-les",
): Day =>
  ({
    cells: {
      [slotId]: sessions.map(([start, end], i) => ({
        id: `e${i}`,
        activity,
        start,
        end,
        minutes: 60,
      })),
    },
  }) as unknown as Day

const answered = (marks: Record<string, "yes" | "no" | "skip">): Day => {
  const counters: Record<string, Record<string, number>> = {}
  const checks: Record<string, string> = {}
  for (const [id, mark] of Object.entries(marks)) {
    if (mark === "yes") counters[id] = { "": 1 }
    else checks[id] = mark
  }
  return { counters, checks } as unknown as Day
}

const project = (rule: StreakRule, days: Record<DayKey, Day>): Project =>
  ({
    id: "p",
    settings: {
      streakRules: [rule],
      dailyGoals: {},
      tags: [{ id: "t-deep", label: "Deep work", color: "#888", iconName: "Circle" }],
    },
    slots: SLOTS,
    activities: ACTIVITIES,
    counterUnits: UNITS,
    days,
    weekNotes: {},
    monthNotes: {},
    weekIgnore: {},
    monthIgnore: {},
  }) as unknown as Project

/* ---- the benchmark's own reading ---------------------------------------

   `spec 022`: the figure the period prints beside its goal is measured
   through the nominated rule, not through every minute logged. These pin the
   distinction, because the failure is silent — a regression to "everything"
   still prints a plausible number, just one that answers a different
   question. Expectations written out, like everything else here.
-------------------------------------------------------------------------- */

/** A day holding time under two activities, only one of which is promised. */
const mixedDay = (): Day =>
  ({
    cells: {
      "s-am": [
        { id: "e1", activity: "a-les", minutes: 120 },
        { id: "e2", activity: "a-idle", minutes: 300 },
      ],
    },
  }) as unknown as Day

const benchProject = (nominated: boolean): Project => {
  const rule = ruleOf(
    { id: "c", targets: [{ kind: "activity", id: "a-les" }], min: 60 },
    "day",
  )
  const base = project(rule, { [MON]: mixedDay() })
  return {
    ...base,
    activities: [
      ...ACTIVITIES,
      { id: "a-idle", label: "Did nothing", color: "#888", iconName: "Circle" },
    ],
    settings: {
      ...base.settings,
      ...(nominated ? { benchmarkRuleId: "r" } : {}),
    },
  } as unknown as Project
}

const BENCHMARKS: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "counts only what the nominated rule names",
    got: () => benchmarkMinutes(benchProject(true), [fromKey(MON)]),
    want: 120,
  },
  {
    name: "nothing nominated reads null, so the caller falls back",
    got: () => benchmarkMinutes(benchProject(false), [fromKey(MON)]),
    want: null,
  },
  {
    name: "a day the rule does not cover contributes nothing",
    got: () => benchmarkMinutes(benchProject(true), [fromKey(TODAY)]),
    want: 0,
  },
  {
    name: "the per-day meter agrees with the sum",
    got: () => benchmarkMeter(benchProject(true))?.(MON, benchProject(true).days[MON]),
    want: 120,
  },
  {
    name: "no meter at all when nothing is nominated",
    got: () => benchmarkMeter(benchProject(false)),
    want: null,
  },
  {
    name: "the overview totals what the meter counted, not what was logged",
    got: () => {
      const proj = benchProject(true)
      const meter = benchmarkMeter(proj)
      return computeOverviewStats(
        [MON],
        proj.days,
        proj.slots,
        fromKey(MON),
        fromKey(MON),
        meter ?? undefined,
      ).totalMinutes
    },
    want: 120,
  },
  {
    name: "and totals everything when handed no meter",
    got: () => {
      const proj = benchProject(true)
      return computeOverviewStats([MON], proj.days, proj.slots, fromKey(MON), fromKey(MON))
        .totalMinutes
    },
    want: 420,
  },
  {
    name: "a day with something on it is never an empty day",
    got: () => {
      const proj = benchProject(true)
      const meter = benchmarkMeter(proj)
      return computeOverviewStats(
        [MON],
        proj.days,
        proj.slots,
        fromKey(MON),
        fromKey(MON),
        meter ?? undefined,
      ).activeDays
    },
    want: 1,
  },
]

const ruleOf = (clause: StreakClause, scope: "day" | "week"): StreakRule =>
  ({
    id: "r",
    label: "R",
    color: "#888",
    iconName: "Circle",
    scope,
    clauses: [clause],
    freezesPerWeek: 0,
    freezeCap: 0,
    startedOn: KEYS[0],
    lockedUntil: KEYS[0],
    inDayVerdict: true,
  }) as StreakRule

/* ---- the cases --------------------------------------------------------- */

type Verdict = "met" | "missed"

interface Case {
  name: string
  scope: "day" | "week"
  clause: StreakClause
  /** The days recorded. For a day rule only `MON` is read. */
  days: Record<DayKey, Day>
  want: Verdict
  /** Known wrong today; names the spec that owns it. */
  pending?: string
}

const c = (
  name: string,
  scope: "day" | "week",
  clause: object,
  days: Record<DayKey, Day>,
  want: Verdict,
  pending?: string,
): Case => ({ name, scope, clause: clause as StreakClause, days, want, pending })

const target = (kind: string, id: string) => ({ targets: [{ kind, id }] })
const checks = (...ids: string[]) => ({
  targets: ids.map((id) => ({ kind: "unit", id })),
})
const everyDayYes = Object.fromEntries(
  [0, 1, 2, 3, 4, 5, 6].map((d) => [d, ["yes"]]),
)
/* **A per-day map with no figures in it.** `days` carries three unrelated
   answers — the figure, which slots count, what a named slot owes — so the
   weekday picker and the per-weekday slot grid both write a map like this,
   and it is not a statement that each day has its own figure. */
const everyDayBlank = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, {}]))
const weekdaysBlank = Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, {}]))

const CASES: Case[] = [
  /* ---- when the day had to start and finish — `spec 023` ---------------

     A window is read against the day's **earliest start** and **latest end**,
     not against every entry: *begin by ten* is about when you sat down, not
     about every time you sat down. Both directions of both walls are here,
     because they are four different sentences and the pair reads in opposite
     directions. ---------------------------------------------------------- */
  c("window · begin by 10:00 · sat down at 09:30", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } },
    { [MON]: sat([["09:30", "11:00"]]) }, "met"),
  c("window · begin by 10:00 · sat down at 10:30", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } },
    { [MON]: sat([["10:30", "11:00"]]) }, "missed"),
  /* The earliest start is what answers, so a late second session cannot
     un-keep a morning that began on time. */
  c("window · begin by 10:00 · began at 09:00 and again at 14:00", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } },
    { [MON]: sat([["09:00", "10:00"], ["14:00", "15:00"]]) }, "met"),
  c("window · no earlier than 09:00 · started at 07:00", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { from: "09:00" } },
    { [MON]: sat([["07:00", "11:00"]]) }, "missed"),
  c("window · between 09:00 and 10:00 · started inside it", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { from: "09:00", to: "10:00" } },
    { [MON]: sat([["09:40", "11:00"]]) }, "met"),
  c("window · finish by 18:00 · finished at 17:30", "day",
    { id: "c", ...target("activity", "a-les"), endWindow: { to: "18:00" } },
    { [MON]: sat([["16:00", "17:30"]]) }, "met"),
  c("window · finish by 18:00 · finished at 19:00", "day",
    { id: "c", ...target("activity", "a-les"), endWindow: { to: "18:00" } },
    { [MON]: sat([["16:00", "19:00"]]) }, "missed"),
  /* **The one that reads backwards without care.** A session ending at 00:30
     finished *after* midnight, not first thing in the morning, so a plain
     clock comparison would have it keeping *finish by six*. */
  c("window · finish by 18:00 · ran past midnight", "day",
    { id: "c", ...target("activity", "a-les"), endWindow: { to: "18:00" } },
    { [MON]: sat([["23:00", "00:30"]]) }, "missed"),
  c("window · finish no earlier than 17:00 · stopped at 16:00", "day",
    { id: "c", ...target("activity", "a-les"), endWindow: { from: "17:00" } },
    { [MON]: sat([["12:00", "16:00"]]) }, "missed"),
  /* **A window says when, never whether.** An empty day has no beginning to
     be late, and a rule that made every untouched day fail is not the rule
     anybody wrote — the floor is what makes you turn up. */
  c("window · begin by 10:00 · nothing logged at all", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } },
    {}, "met"),
  c("window · begin by 10:00 · time logged with no clock on it", "day",
    { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } },
    { [MON]: studied(120) }, "met"),
  /* Only the counted entries answer: the window follows the slots and the
     targets the condition already restricts itself to. */
  c("window · counts the morning only · the late session is in the evening", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      slotIds: ["s-am"],
      startWindow: { to: "10:00" },
    },
    { [MON]: { cells: {
      "s-am": [{ id: "a", activity: "a-les", start: "09:00", end: "10:00", minutes: 60 }],
      "s-pm": [{ id: "b", activity: "a-les", start: "20:00", end: "21:00", minutes: 60 }],
    } } as unknown as Day },
    "met"),
  /* A window and a figure are one promise, and either breaking breaks it. */
  c("window · two hours and begin by 10:00 · began late with the hours in", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      startWindow: { to: "10:00" },
    },
    { [MON]: sat([["11:00", "13:00"]]) }, "missed"),
  /* Per weekday, like every other thing this map carries. */
  c("window · per weekday · Monday's own window, kept", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      days: { 1: { startWindow: { to: "10:00" } }, 2: { startWindow: { to: "07:00" } } },
    },
    { [MON]: sat([["09:00", "10:00"]]) }, "met"),
  c("window · per weekday · Monday's own window, broken", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      days: { 1: { startWindow: { to: "08:00" } }, 2: { startWindow: { to: "22:00" } } },
    },
    { [MON]: sat([["09:00", "10:00"]]) }, "missed"),
  /* A per-day map that states windows must not blank the shared figure —
     the fault `figuresPerDay` was written for, one dimension along. */
  c("window · per-day windows leave the shared figure standing", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 120,
      days: { 1: { startWindow: { to: "10:00" } } },
    },
    { [MON]: sat([["09:00", "10:00"]]) }, "missed"),
  /* A tally has no clock, so a window stored on one is not read. */
  c("window · a count target ignores it", "day",
    { id: "c", ...target("unit", "u-pin"), max: 1, startWindow: { to: "06:00" } },
    { [MON]: counted("u-pin", "s-am", 1) }, "met"),

  /* ---- slots chosen per weekday ---- */
  c("per-day slots · Monday counts only the morning · logged in the morning", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      days: { 1: { slotIds: ["s-am"] }, 2: { slotIds: ["s-pm"] } },
    },
    { [MON]: studied(90, "s-am") }, "met"),
  c("per-day slots · Monday counts only the morning · logged in the evening", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      days: { 1: { slotIds: ["s-am"] }, 2: { slotIds: ["s-pm"] } },
    },
    { [MON]: studied(90, "s-pm") }, "missed"),
  /* The bug this shape exists to catch is one weekday being read against
     another's slots, so the map is deliberately keyed the other way round
     here: Monday takes the evening, Tuesday the morning. Reading the first
     entry, or the clause's own list, gets this one wrong. */
  c("per-day slots · Monday takes the evening while Tuesday takes the morning", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      days: { 1: { slotIds: ["s-pm"] }, 2: { slotIds: ["s-am"] } },
    },
    { [MON]: studied(90, "s-pm") }, "met"),
  /* And the shared figure survives a `days` map that only talks about slots.
     Seeding it into every entry was the alternative, and it would have made
     asking for individual slots silently switch the figure to per-day. */
  c("per-day slots · the shared floor still applies", "day",
    {
      id: "c",
      ...target("activity", "a-les"),
      min: 120,
      days: { 1: { slotIds: ["s-am"] } },
    },
    { [MON]: studied(60, "s-am") }, "missed"),

  /* ---- a day, measured in time ---- */
  c("time · at least 3h · 3h logged", "day",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    { [MON]: studied(180) }, "met"),
  c("time · at least 3h · 2h logged", "day",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    { [MON]: studied(120) }, "missed"),

  /* ---- a day, counted ---- */
  c("count · at most 0 · nothing", "day",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    {}, "met"),
  c("count · at most 0 · one slip", "day",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    { [MON]: counted("u-yt", "s-am", 1) }, "missed"),
  c("count · at most 3 · three", "day",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    { [MON]: counted("u-yt", "s-am", 3) }, "met"),
  c("count · at most 3 · four", "day",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    { [MON]: counted("u-yt", "s-am", 4) }, "missed"),

  /* ---- a day, with a bound on a named slot ---- */
  c("slot · at most 3, none in Evening · three in Morning", "day",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    { [MON]: counted("u-yt", "s-am", 3) }, "met"),
  c("slot · at most 3, none in Evening · one in Evening", "day",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    { [MON]: counted("u-yt", "s-pm", 1) }, "missed"),

  /* ---- a day, per-weekday figures ---- */
  c("per-weekday · 3h Mon only · 3h on Mon", "day",
    { id: "c", ...target("activity", "a-les"), days: { 1: { min: 180 } } },
    { [MON]: studied(180) }, "met"),
  c("per-weekday · 3h Mon only · 2h on Mon", "day",
    { id: "c", ...target("activity", "a-les"), days: { 1: { min: 180 } } },
    { [MON]: studied(120) }, "missed"),

  /* ---- a day, checks ---- */
  c("check · must be yes · yes", "day",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    { [MON]: answered({ "u-wake": "yes" }) }, "met"),
  c("check · must be yes · no", "day",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    { [MON]: answered({ "u-wake": "no" }) }, "missed"),
  c("check · must be yes · unanswered", "day",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    {}, "missed"),
  c("check · must be yes · skipped", "day",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    { [MON]: answered({ "u-wake": "skip" }) }, "missed"),
  c("two checks · both yes · both yes", "day",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    { [MON]: answered({ "u-wake": "yes", "u-bed": "yes" }) }, "met"),
  c("two checks · both yes · one yes", "day",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    { [MON]: answered({ "u-wake": "yes" }) }, "missed"),
  c("two checks counted · at least 2 · both yes", "day",
    { id: "c", ...checks("u-wake", "u-bed"), min: 2 },
    { [MON]: answered({ "u-wake": "yes", "u-bed": "yes" }) }, "met"),
  c("two checks counted · at least 2 · one yes", "day",
    { id: "c", ...checks("u-wake", "u-bed"), min: 2 },
    { [MON]: answered({ "u-wake": "yes" }) }, "missed"),

  /* ---- a week, counted. The figure is the WEEK's, not a day's ---- */
  c("weekly count · at least 3 · three trips", "week",
    { id: "c", ...target("unit", "u-gym"), min: 3 },
    {
      [MON]: counted("u-gym", "s-am", 1),
      [WED]: counted("u-gym", "s-am", 1),
      [THU]: counted("u-gym", "s-am", 1),
    }, "met"),
  c("weekly count · at least 3 · two trips", "week",
    { id: "c", ...target("unit", "u-gym"), min: 3 },
    { [MON]: counted("u-gym", "s-am", 1), [WED]: counted("u-gym", "s-am", 1) },
    "missed"),
  c("weekly count · at most 3 · three", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    { [MON]: counted("u-yt", "s-am", 3) }, "met"),
  c("weekly count · at most 3 · four", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    { [MON]: counted("u-yt", "s-am", 4) }, "missed"),

  /* ---- a week, in time ---- */
  c("weekly time · at least 10h · 10h", "week",
    { id: "c", ...target("activity", "a-les"), min: 600 },
    { [MON]: studied(300), [TUE]: studied(300) }, "met"),
  c("weekly time · at least 10h · 9h", "week",
    { id: "c", ...target("activity", "a-les"), min: 600 },
    { [MON]: studied(300), [TUE]: studied(240) }, "missed"),

  /* ---- a week, per-weekday figures. These ARE summed: writing them out is
     the act of saying each day has its own, and the week is their total ---- */
  c("weekly per-weekday · 3h Mon + 2h Tue · both met", "week",
    { id: "c", ...target("activity", "a-les"), days: { 1: { min: 180 }, 2: { min: 120 } } },
    { [MON]: studied(180), [TUE]: studied(120) }, "met"),
  c("weekly per-weekday · 3h Mon + 2h Tue · an hour short", "week",
    { id: "c", ...target("activity", "a-les"), days: { 1: { min: 180 }, 2: { min: 120 } } },
    { [MON]: studied(180), [TUE]: studied(60) }, "missed"),

  /* ---- a week, with a bound on a named slot ---- */
  c("weekly slot · at most 3, none in Evening · three in Morning", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    { [MON]: counted("u-yt", "s-am", 3) }, "met"),
  c("weekly slot · at most 3, none in Evening · one in Evening", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    { [MON]: counted("u-yt", "s-pm", 1) }, "missed"),

  /* ---- a week whose `days` map carries no figures.
     `weekBounds` read the mere presence of the map as *a figure per weekday*
     and summed the week's own figure over its days, so `at most 3 a week`
     allowed twenty-one — a ceiling no week of ordinary living could break,
     wearing the face of a rule that was watching. `boundsOnWeekday` learned
     this distinction (`figuresPerDay`) when the map grew its other two
     answers; this function did not, and the fault surfaced the moment a
     weekly rule was told which weekdays it judged ---- */
  c("weekly count · empty per-day map · at most 3 · three", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3, days: everyDayBlank },
    { [MON]: counted("u-yt", "s-am", 3) }, "met"),
  c("weekly count · empty per-day map · at most 3 · four", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3, days: everyDayBlank },
    { [MON]: counted("u-yt", "s-am", 4) }, "missed"),
  /* Judged Mon–Fri, so the map has no Sunday in it — and the flat branch used
     to ask weekday `0` what the condition was held to. `boundsOnWeekday`
     answers `{}` for a weekday outside the map, which lost the ceiling
     outright rather than merely loosening it. */
  c("weekly count · judged Mon–Fri · at most 3 · four on Monday", "week",
    { id: "c", ...target("unit", "u-yt"), max: 3, days: weekdaysBlank },
    { [MON]: counted("u-yt", "s-am", 4) }, "missed"),
  /* The slot half of the same fault, which hid behind the commonest rider
     there is: seven noughts add up to a nought. It takes a rider above zero
     to show at all. */
  c("weekly slot · empty per-day map · at most 1 in Evening · one", "week",
    { id: "c", ...target("unit", "u-yt"), max: 9, slots: { "s-pm": { max: 1 } }, days: everyDayBlank },
    { [MON]: counted("u-yt", "s-pm", 1) }, "met"),
  c("weekly slot · empty per-day map · at most 1 in Evening · two", "week",
    { id: "c", ...target("unit", "u-yt"), max: 9, slots: { "s-pm": { max: 1 } }, days: everyDayBlank },
    { [MON]: counted("u-yt", "s-pm", 2) }, "missed"),

  /* ---- a week of checks, counted per answer ---- */
  c("weekly check · at least 2 yes · two", "week",
    { id: "c", ...checks("u-wake"), states: { yes: { min: 2 } } },
    { [MON]: answered({ "u-wake": "yes" }), [TUE]: answered({ "u-wake": "yes" }) },
    "met"),
  c("weekly check · at least 2 yes · one", "week",
    { id: "c", ...checks("u-wake"), states: { yes: { min: 2 } } },
    { [MON]: answered({ "u-wake": "yes" }) }, "missed"),
  c("weekly two checks · at least 4 yes · four", "week",
    { id: "c", ...checks("u-wake", "u-bed"), states: { yes: { min: 4 } } },
    {
      [MON]: answered({ "u-wake": "yes", "u-bed": "yes" }),
      [TUE]: answered({ "u-wake": "yes", "u-bed": "yes" }),
    }, "met"),
  c("weekly two checks · at least 4 yes · three", "week",
    { id: "c", ...checks("u-wake", "u-bed"), states: { yes: { min: 4 } } },
    {
      [MON]: answered({ "u-wake": "yes", "u-bed": "yes" }),
      [TUE]: answered({ "u-wake": "yes" }),
    }, "missed"),

  /* ---- a weekly rule still carrying day-shaped accepted answers, which is
     what switching a rule from days to weeks leaves behind ---- */
  c("weekly, day-shaped answers · every day yes", "week",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    Object.fromEntries(KEYS.map((k) => [k, answered({ "u-wake": "yes" })])),
    "met"),
  c("weekly, day-shaped answers · one day missed", "week",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    Object.fromEntries(
      KEYS.map((k) => [k, answered({ "u-wake": k === WED ? "no" : "yes" })]),
    ), "missed"),
  /* ---- a finish on the next morning — `spec 025` -----------------------

     `edgesOn` reports a session that ran past midnight as minutes past 1440,
     and a window's walls are wall-clock times. So *get up between 04:00 and
     05:00* asked for 240–300 while every real night reported 1680, and the
     one rule this app most obviously wants to hold — a bedtime and a
     get-up — could not be written at all. `nextDay` puts the pair on the
     same scale, and says so rather than guessing. */
  c("window · +1d · finish between 04:00 and 05:00 · got up at 04:30", "day",
    { id: "c", ...target("activity", "a-les"),
      endWindow: { from: "04:00", to: "05:00", nextDay: true } },
    { [MON]: sat([["22:00", "04:30"]]) }, "met"),
  /* The same two times without the mark: this is the old reading, and it is
     what made the rule unkeepable. It stays refused, because guessing which
     side of midnight a wall meant is the thing `spec 023` ruled out. */
  c("window · no +1d · the same night is a day and a quarter late", "day",
    { id: "c", ...target("activity", "a-les"),
      endWindow: { from: "04:00", to: "05:00" } },
    { [MON]: sat([["22:00", "04:30"]]) }, "missed"),
  c("window · +1d · slept until six", "day",
    { id: "c", ...target("activity", "a-les"),
      endWindow: { from: "04:00", to: "05:00", nextDay: true } },
    { [MON]: sat([["22:00", "06:00"]]) }, "missed"),
  c("window · +1d · up before it opens", "day",
    { id: "c", ...target("activity", "a-les"),
      endWindow: { from: "04:00", to: "05:00", nextDay: true } },
    { [MON]: sat([["22:00", "03:00"]]) }, "missed"),

]

/* ---- what the streaks row says about today ------------------------------

   A different axis entirely, and the one where a bug is hardest to see: the
   verdict can be right while the warning that would have let you act on it
   never appears. A check answered `no` read `safe` at every hour of the day
   until `013 §1.3`.

   `RISK_DAY` is a Monday with yesterday held, so the `today` branch of the
   risk builder is the one reached rather than yesterday's emergency. */

const RISK_DAY: DayKey = "2026-08-24"
const RISK_YESTERDAY: DayKey = "2026-08-23"

interface RiskCase {
  name: string
  clause: object
  today: Day | undefined
  hour: number
  want: NoticeLevel
  /** The weekly allowance. Three unless a case is about not being able to pay. */
  freezes?: number
}

const risky = (
  name: string,
  clause: object,
  today: Day | undefined,
  hour: number,
  want: NoticeLevel,
): RiskCase => ({ name, clause, today, hour, want })

const RISKS: RiskCase[] = [
  risky("check · answered no · morning",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    answered({ "u-wake": "no" }), 9, "danger"),
  risky("check · answered no · night",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    answered({ "u-wake": "no" }), 22, "danger"),
  risky("check · skipped · morning",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    answered({ "u-wake": "skip" }), 9, "danger"),
  risky("check · unanswered · morning is not an emergency",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    undefined, 9, "notice"),
  risky("check · unanswered · evening is",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    undefined, 22, "warning"),
  risky("check · answered yes · quiet all day",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    answered({ "u-wake": "yes" }), 22, "allClear"),
  risky("two checks · one wrong · danger even with the other kept",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    answered({ "u-wake": "no", "u-bed": "yes" }), 9, "danger"),

  risky("ceiling · breached · already spent, at any hour",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    counted("u-yt", "s-am", 1), 9, "danger"),
  risky("ceiling · room left · nothing to say",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    counted("u-yt", "s-am", 1), 9, "notice"),
  risky("ceiling · at its limit · one more ends it",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    counted("u-yt", "s-am", 3), 9, "warning"),
  risky("slot ceiling · breached · the day is already spent",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    counted("u-yt", "s-pm", 1), 9, "danger"),
  risky("slot ceiling · breached in the evening while the day's own bound is fine",
    { id: "c", ...target("unit", "u-yt"), max: 9, slots: { "s-pm": { max: 2 } } },
    counted("u-yt", "s-pm", 3), 9, "danger"),
  risky("slot ceiling · at its limit",
    { id: "c", ...target("unit", "u-yt"), max: 9, slots: { "s-pm": { max: 2 } } },
    counted("u-yt", "s-pm", 2), 9, "warning"),
  /* A ceiling of nought is at its limit from midnight to midnight, so
     warning about it would put a permanent amber row on the page for a rule
     nobody has broken — and *never do X* is the commonest rule here. */
  risky("ceiling of nought · never warns, it is not an allowance",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    undefined, 9, "allClear"),

  risky("time · nothing logged · morning is not an emergency",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    undefined, 9, "notice"),
  risky("time · nothing logged · an hour before midnight is",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    undefined, 23, "danger"),

  /* **A call against a report.** A settled violation a freeze can reach is
     something to do; the same violation with nothing to spend is a fact. They
     were one colour, which taught the reader that the bright red sometimes
     means *act* and sometimes means *it is over*. */
  {
    name: "ceiling · breached · a freeze can reach it, so it is a call",
    clause: { id: "c", ...target("unit", "u-yt"), max: 0 },
    today: counted("u-yt", "s-am", 1),
    hour: 9,
    want: "danger",
  },
  {
    name: "ceiling · breached · nothing to spend, so it is a report",
    clause: { id: "c", ...target("unit", "u-yt"), max: 0 },
    today: counted("u-yt", "s-am", 1),
    hour: 9,
    freezes: 0,
    want: "gone",
  },
]

/* ---- yesterday must not swallow today ----------------------------------

   The risk builder answers yesterday first, because yesterday is the one with
   a deadline — and it used to answer *only* yesterday, so a rule with a broken
   yesterday said nothing about the ceiling you were standing on this
   afternoon, which is the day you can still act on. */

interface MaskCase {
  name: string
  clause: object
  yesterday: Day | undefined
  todayDay: Day | undefined
  /** A fragment the block's lines must contain. */
  mentions: string
}

const MASKS: MaskCase[] = [
  {
    name: "a broken yesterday still reports today's spent allowance",
    clause: { id: "c", ...target("unit", "u-yt"), max: 3 },
    yesterday: counted("u-yt", "s-am", 9),
    todayDay: counted("u-yt", "s-am", 3),
    mentions: "one more ends it",
  },
  {
    name: "a broken yesterday still reports today's breached slot",
    clause: {
      id: "c",
      ...target("unit", "u-yt"),
      max: 9,
      slots: { "s-pm": { max: 0 } },
    },
    yesterday: counted("u-yt", "s-pm", 5),
    todayDay: counted("u-yt", "s-pm", 1),
    mentions: "in “Evening”",
  },
]

/* ---- what today still asks -----------------------------------------------

   The quiet line under the streaks row. It has one rule of its own worth
   testing: it asks only for what can still be done, so a floor the clock has
   ruled out drops out rather than taunting you with it. */

interface DueCase {
  name: string
  clause: object
  day: Day | undefined
  hour: number
  want: string | null
}

const dues = (
  name: string,
  clause: object,
  day: Day | undefined,
  hour: number,
  want: string | null,
): DueCase => ({ name, clause, day, hour, want })

const DUES: DueCase[] = [
  dues("a floor short, with the day ahead of it",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    studied(60), 9, "“2h” more of “Lessons”"),
  dues("a floor already met asks nothing",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    studied(180), 9, null),
  dues("a floor the clock has ruled out is not asked for",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    studied(60), 23, null),
  dues("an unanswered check",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    answered({ "u-bed": "yes" }), 9, "“Wake up” to answer"),
  dues("a check answered wrongly is the alarm's business, not this line",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    answered({ "u-wake": "no" }), 9, null),
  /* **This one reversed, and it is the point of `spec 016`.** Under
     `dueToday` a ceiling said nothing at all: there is no doing less of
     something already done, so it had no errand to hand you. But how much of
     an allowance is left is exactly what a person wants to know before
     spending more of it, and nowhere in the app was saying it. It is a
     `notice` now — owed nothing, and worth reading. */
  dues("a ceiling reports its headroom, which nothing used to",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    counted("u-yt", "s-am", 1), 9, "“Youtube” “2” of “3” left"),
]

/* ---- what a day is reported as -----------------------------------------

   The tooltips and warnings. Three times now the same bug has been fixed in a
   different copy of this text — the first target named whatever went wrong —
   so the readout is one function and these are its cases. `failing` says what
   broke; `all` says what happened. */

interface ReadCase {
  name: string
  clause: object
  day: Day | undefined
  mode: "failing" | "all"
  want: string
}

const reads = (
  name: string,
  clause: object,
  day: Day | undefined,
  mode: "failing" | "all",
  want: string,
): ReadCase => ({ name, clause, day, mode, want })

const READS: ReadCase[] = [
  reads("two checks · names only the one that broke",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    answered({ "u-wake": "skip", "u-bed": "yes" }), "failing",
    "“Wake up” is “skipped”"),
  reads("two checks · both broke",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    undefined, "failing",
    "“Wake up” is “not answered” · “Go to bed” is “not answered”"),
  reads("two checks · what happened, kept or not",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    answered({ "u-wake": "skip", "u-bed": "yes" }), "all",
    "“Wake up” is “skipped” · “Go to bed” is “yes”"),
  reads("a check written before accepted answers",
    { id: "c", ...checks("u-wake"), min: 1 },
    answered({ "u-wake": "no" }), "failing",
    "“Wake up” is “no”"),
  reads("a ceiling says what is left, not only what is spent",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    counted("u-yt", "s-am", 2), "all",
    "“Youtube” “2” of “3”"),
  reads("a floor does not repeat itself in every cell",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    studied(90), "all",
    "“Lessons” “1h 30m”"),
  reads("a broken slot bound names the slot, not the day's own figure",
    { id: "c", ...target("unit", "u-yt"), max: 3, slots: { "s-pm": { max: 0 } } },
    counted("u-yt", "s-pm", 1), "failing",
    "“Youtube” “1” in “Evening” against at most “0”"),
  reads("both broken · a line each",
    { id: "c", ...target("unit", "u-yt"), max: 2, slots: { "s-pm": { max: 0 } } },
    counted("u-yt", "s-pm", 3), "failing",
    // `clauseReadout` joins the parts with a dot; the callers that lay them
    // out as lines take `clauseReadoutParts` instead.
    "“Youtube” “3” against at most “2” · “Youtube” “3” in “Evening” against at most “0”"),
  reads("a count names the whole set, not one of it",
    { id: "c", ...checks("u-yt", "u-gym"), max: 0 },
    counted("u-gym", "s-am", 2), "failing",
    "“Youtube” or “Gym” “2” against at most “0”"),
  reads("time reports hours, never minutes",
    { id: "c", ...target("activity", "a-les"), min: 180 },
    studied(90), "failing",
    "“Lessons” “1h 30m” against at least “3h”"),
]

/* ---- the lock ----------------------------------------------------------

   `isNarrowing` is one-sided: `true` means *proved no easier*, and `false`
   means *not proved*, which is a wait rather than a verdict. So every case
   here reads as "does this land at once, or does it wait", and an edit that
   is genuinely incomparable belongs in the `waits` column.

   The direction of an added target is not obvious and is the whole reason
   these exist: under an assertion one more target is one more thing to keep;
   under a floor it is one more place the number can come from. */

interface LockCase {
  name: string
  before: object
  after: object
  /** True where the edit is proved no-easier and may land at once. */
  lands: boolean
}

const lock = (
  name: string,
  before: object,
  after: object,
  lands: boolean,
): LockCase => ({ name, before, after, lands })

const LOCKS: LockCase[] = [
  /* **Windows are walls, and absent is a wall at nowhere** — `spec 023`. No
     `from` is *however early you like*, so moving one later can only cost
     you; no `to` is *however late you like*, so moving one earlier can only
     cost you. The pair therefore reads in opposite directions, exactly as a
     floor and a ceiling do. */
  lock("window · add one where there was none",
    { id: "c", ...target("activity", "a-les"), min: 60 },
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "10:00" } },
    true),
  lock("window · drop one",
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "10:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60 },
    false),
  lock("window · begin by an earlier hour — harder",
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "10:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "09:00" } },
    true),
  lock("window · begin by a later hour — easier",
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "09:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "10:00" } },
    false),
  lock("window · no earlier than a later hour — harder",
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { from: "08:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { from: "09:00" } },
    true),
  lock("window · no earlier than an earlier hour — easier",
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { from: "09:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { from: "08:00" } },
    false),
  lock("window · finish by an earlier hour — harder",
    { id: "c", ...target("activity", "a-les"), min: 60, endWindow: { to: "20:00" } },
    { id: "c", ...target("activity", "a-les"), min: 60, endWindow: { to: "18:00" } },
    true),
  lock("assertion · swap the second check",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    { id: "c", ...checks("u-wake", "u-gym"), allow: everyDayYes }, false),
  lock("assertion · drop the second check",
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    { id: "c", ...checks("u-wake"), allow: everyDayYes }, false),
  lock("assertion · add a check",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes }, true),
  lock("assertion · accept one fewer answer",
    { id: "c", ...checks("u-wake"), allow: { ...everyDayYes, 1: ["yes", "skip"] } },
    { id: "c", ...checks("u-wake"), allow: everyDayYes }, true),
  lock("assertion · accept one more answer",
    { id: "c", ...checks("u-wake"), allow: everyDayYes },
    { id: "c", ...checks("u-wake"), allow: { ...everyDayYes, 1: ["yes", "skip"] } }, false),

  lock("floor · add a counter it can come from",
    { id: "c", ...checks("u-gym"), min: 3 },
    { id: "c", ...checks("u-gym", "u-yt"), min: 3 }, false),
  lock("floor · drop a counter it could come from",
    { id: "c", ...checks("u-gym", "u-yt"), min: 3 },
    { id: "c", ...checks("u-gym"), min: 3 }, true),
  lock("floor · raise it",
    { id: "c", ...target("unit", "u-gym"), min: 3 },
    { id: "c", ...target("unit", "u-gym"), min: 4 }, true),
  lock("floor · lower it",
    { id: "c", ...target("unit", "u-gym"), min: 3 },
    { id: "c", ...target("unit", "u-gym"), min: 2 }, false),

  lock("ceiling · add a counter that can breach it",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    { id: "c", ...checks("u-yt", "u-gym"), max: 0 }, true),
  lock("ceiling · drop one",
    { id: "c", ...checks("u-yt", "u-gym"), max: 0 },
    { id: "c", ...target("unit", "u-yt"), max: 0 }, false),
  lock("ceiling · lower it",
    { id: "c", ...target("unit", "u-yt"), max: 3 },
    { id: "c", ...target("unit", "u-yt"), max: 1 }, true),
  lock("ceiling · raise it",
    { id: "c", ...target("unit", "u-yt"), max: 1 },
    { id: "c", ...target("unit", "u-yt"), max: 3 }, false),

  lock("swap the counter entirely",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    { id: "c", ...target("unit", "u-gym"), max: 0 }, false),
  lock("nothing changed",
    { id: "c", ...target("unit", "u-yt"), max: 0 },
    { id: "c", ...target("unit", "u-yt"), max: 0 }, true),
]

/* ---- achievements ------------------------------------------------------

   `spec 014` gave these the flexibility the rules have, which means they now
   have axes that can be got the wrong way round: in a row against in all, a
   window against ever, and a set of targets under the lock. Every one of them
   is a direction, and a direction is exactly what a sweep is for.

   The fixture is a fortnight where Mon/Wed/Fri held and Tue/Thu did not, so a
   weekday filter has something to bite on. */

const A_START: DayKey = "2026-08-03"        // a Monday
const A_TODAY: DayKey = "2026-08-17"

/** A rule that asks for any study at all, so a logged day is a kept day. */
const A_RULE: StreakRule = {
  id: "r-study",
  label: "Study",
  color: "#888",
  iconName: "Circle",
  scope: "day",
  clauses: [
    { id: "c", targets: [{ kind: "activity", id: "a-les" }], min: 1 },
  ] as never,
  freezesPerWeek: 0,
  freezeCap: 0,
  startedOn: A_START,
  lockedUntil: A_START,
  inDayVerdict: true,
} as StreakRule

/** Mon, Wed and Fri studied; Tue and Thu did not. Weekends untouched. */
const A_DAYS: Record<DayKey, Day> = (() => {
  const out: Record<DayKey, Day> = {}
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(`${A_START}T12:00:00`)
    d.setDate(d.getDate() + i)
    const wd = d.getDay()
    if (wd === 0 || wd === 6) continue
    out[toKey(d)] = wd === 2 || wd === 4 ? ({} as Day) : studied(60)
  }
  return out
})()

const achievement = (
  source: object,
  threshold: number,
  reward = 0,
): Achievement =>
  ({
    id: "a",
    label: "A",
    color: "#888",
    iconName: "Circle",
    source,
    threshold,
    reward,
    createdOn: A_START,
    lockedUntil: A_START,
  }) as Achievement

const A_PROJECT: Project = {
  id: "p",
  settings: { streakRules: [A_RULE], dailyGoals: {} },
  slots: SLOTS,
  activities: ACTIVITIES,
  counterUnits: UNITS,
  days: A_DAYS,
  weekNotes: {},
  monthNotes: {},
  weekIgnore: {},
  monthIgnore: {},
} as unknown as Project

interface ProgressCase {
  name: string
  source: object
  want: number
}

const PROGRESS: ProgressCase[] = [
  { name: "kept days in a row · the longest stretch, not the current one",
    source: { kind: "run", run: { consecutive: true, scale: "day" } }, want: 1 },
  { name: "kept days in all · every day that held",
    source: { kind: "run", run: { consecutive: false, scale: "day" } }, want: 6 },
  { name: "Mondays in a row · consecutive among Mondays only",
    source: { kind: "run", run: { consecutive: true, scale: "day", weekdays: [1] } },
    want: 2 },
  { name: "Tuesdays in all · none of them held",
    source: { kind: "run", run: { consecutive: false, scale: "day", weekdays: [2] } },
    want: 0 },
  { name: "one rule's own days, in all",
    source: { kind: "run", run: { ruleId: "r-study", consecutive: false, scale: "day" } },
    want: 6 },
  { name: "the old keptDays spelling still reads",
    source: { kind: "keptDays" }, want: 1 },

  { name: "a total, ever",
    source: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "ever" },
    want: 360 },
  { name: "a total, in a single day",
    source: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "day" },
    want: 60 },
  { name: "a total, in a single week",
    source: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "week" },
    want: 180 },
  { name: "the old singular target still reads",
    source: { kind: "total", target: { kind: "activity", id: "a-les" } },
    want: 360 },
]

interface AchLockCase {
  name: string
  before: object
  after: object
  beforeN?: number
  afterN?: number
  beforeR?: number
  afterR?: number
  lands: boolean
}

const A_LOCKS: AchLockCase[] = [
  { name: "raise the figure", lands: true, beforeN: 30, afterN: 40,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day" } } },
  { name: "lower the figure", lands: false, beforeN: 30, afterN: 20,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day" } } },
  { name: "in all becomes in a row — harder", lands: true,
    before: { kind: "run", run: { consecutive: false, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day" } } },
  { name: "in a row becomes in all — easier", lands: false,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: false, scale: "day" } } },
  { name: "days become weeks — incomparable", lands: false,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "week" } } },
  { name: "the weekdays change at all — incomparable", lands: false,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day", weekdays: [1] } } },
  { name: "swap whose verdict — incomparable", lands: false,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { ruleId: "r-study", consecutive: true, scale: "day" } } },
  { name: "a run becomes a total — incomparable", lands: false,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "total", targets: [{ kind: "activity", id: "a-les" }] } },

  { name: "narrow the window — harder", lands: true,
    before: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "ever" },
    after: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "month" } },
  { name: "widen the window — easier", lands: false,
    before: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "week" },
    after: { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "ever" } },
  { name: "add a target it can come from — easier", lands: false,
    before: { kind: "total", targets: [{ kind: "activity", id: "a-les" }] },
    after: { kind: "total", targets: [{ kind: "activity", id: "a-les" }, { kind: "time" }] } },
  { name: "drop a target it could come from — harder", lands: true,
    before: { kind: "total", targets: [{ kind: "activity", id: "a-les" }, { kind: "time" }] },
    after: { kind: "total", targets: [{ kind: "activity", id: "a-les" }] } },
  { name: "lower the reward — harder bargain", lands: true,
    beforeR: 200, afterR: 100,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day" } } },
  { name: "raise the reward — same work, more points", lands: false,
    beforeR: 100, afterR: 200,
    before: { kind: "run", run: { consecutive: true, scale: "day" } },
    after: { kind: "run", run: { consecutive: true, scale: "day" } } },
  { name: "the same targets in another order is not an edit", lands: true,
    before: { kind: "total", targets: [{ kind: "activity", id: "a-les" }, { kind: "time" }] },
    after: { kind: "total", targets: [{ kind: "time" }, { kind: "activity", id: "a-les" }] } },
]

/* ---- what it costs to drop one -----------------------------------------

   Removing a rule or an achievement used to be free, which made the week-long
   wait on lowering a bar a wait you could step around by removing the bar. It
   walks the same gates a loosening does now, and the order of those gates is
   the thing worth pinning: the grace day, then the clock, then the reason,
   then the supervisor. Getting them out of order would ask you to type a
   reason into a refusal. */

interface RemovalCase {
  name: string
  createdOn: DayKey
  lockedUntil: DayKey
  reason: string
  supervised: boolean
  want: "free" | "waits" | "needsReason" | "needsApproval" | "allowed"
}

const REMOVALS: RemovalCase[] = [
  { name: "the day it was written is still yours",
    createdOn: "2026-08-24", lockedUntil: "2026-09-01", reason: "", supervised: false,
    want: "free" },
  { name: "one written tomorrow cannot be at risk either",
    createdOn: "2026-08-25", lockedUntil: "2026-09-01", reason: "", supervised: false,
    want: "free" },
  { name: "the clock comes before the reason",
    createdOn: "2026-08-01", lockedUntil: "2026-09-01", reason: "changed my mind",
    supervised: false, want: "waits" },
  { name: "the clock clear, the reason missing",
    createdOn: "2026-08-01", lockedUntil: "2026-08-20", reason: "  ",
    supervised: false, want: "needsReason" },
  { name: "clear and explained, and nobody watching",
    createdOn: "2026-08-01", lockedUntil: "2026-08-20", reason: "it no longer fits",
    supervised: false, want: "allowed" },
  { name: "clear and explained, and somebody is",
    createdOn: "2026-08-01", lockedUntil: "2026-08-20", reason: "it no longer fits",
    supervised: true, want: "needsApproval" },
  { name: "a supervisor does not override the clock",
    createdOn: "2026-08-01", lockedUntil: "2026-09-01", reason: "it no longer fits",
    supervised: true, want: "waits" },
]

/* ---- the account -------------------------------------------------------

   Not a rule shape, but the one arithmetic here you can *spend*, and its two
   constants are the kind that get changed without anyone re-deriving what they
   mean. The figure worth pinning is the **ratio**: the account grows above a
   two-thirds keep rate and shrinks below it, and a purchase comes off the top
   without touching the streak. */

interface BalanceCase {
  name: string
  kept: number
  missed: number
  spent: number
  /** Points from achievements already reached, as their ledger rows record. */
  paid?: number
  want: number
}

const BALANCES: BalanceCase[] = [
  { name: "a kept day pays ten", kept: 1, missed: 0, spent: 0, want: 10 },
  { name: "a missed day takes twenty", kept: 0, missed: 1, spent: 0, want: -20 },
  { name: "two thirds kept is break-even", kept: 2, missed: 1, spent: 0, want: 0 },
  { name: "above two thirds it grows", kept: 3, missed: 1, spent: 0, want: 10 },
  { name: "below two thirds it shrinks", kept: 1, missed: 1, spent: 0, want: -10 },
  { name: "a purchase comes off the top", kept: 10, missed: 0, spent: 40, want: 60 },
  { name: "an achievement pays in", kept: 1, missed: 0, spent: 0, paid: 100, want: 110 },
  { name: "what it paid is what was recorded, not what it says now",
    kept: 0, missed: 0, spent: 0, paid: 250, want: 250 },
  { name: "it goes negative from misses, never from buying",
    kept: 0, missed: 2, spent: 0, want: -40 },
]

/* ---- conditions that must be refused rather than judged ---------------- */

const REFUSED: { name: string; clause: object }[] = [
  { name: "no bound at all", clause: { id: "c", ...target("unit", "u-yt") } },
  { name: "a floor of nought", clause: { id: "c", ...target("unit", "u-yt"), min: 0 } },
  { name: "a floor of nought in time", clause: { id: "c", ...target("activity", "a-les"), min: 0 } },
  { name: "no accepted answer on any day", clause: { id: "c", ...checks("u-wake"), allow: {} } },
  { name: "a per-weekday map with nothing in it", clause: { id: "c", ...target("activity", "a-les"), days: {} } },
  /* A window with neither wall is the same nothing said in times. */
  { name: "a window with no wall on either side", clause: { id: "c", ...target("activity", "a-les"), startWindow: {} } },
]

/**
 * **Nights, folded out of the old column** — `spec 024`.
 *
 * The fold is the one piece of this change that can lose data, so it is the
 * one worth pinning: it runs on every load until `migrations/021` has been
 * everywhere, and a day it gets wrong is a night that is either invisible or
 * counted twice.
 */
const FOLDS: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "a night moves into the sleep slot, keeping its id and its times",
    got: () => {
      const day = foldDay({
        sleep: [{ id: "n1", minutes: 400, start: "23:00", end: "07:00" }],
      } as unknown as Day)
      const moved = (day.cells?.["slot-sleep"] ?? [])[0]
      return `${moved?.id}/${moved?.activity}/${moved?.start}/${moved?.minutes}`
    },
    want: "n1/activity-sleep/23:00/400",
  },
  {
    name: "and the old column is emptied, so nothing reads it twice",
    got: () =>
      foldDay({ sleep: [{ id: "n1", minutes: 400 }] } as unknown as Day).sleep,
    want: undefined,
  },
  {
    name: "work already in the sleep slot is kept",
    got: () => {
      const day = foldDay({
        cells: { "slot-sleep": [{ id: "a", activity: "activity-sleep", minutes: 60 }] },
        sleep: [{ id: "n1", minutes: 400 }],
      } as unknown as Day)
      return (day.cells?.["slot-sleep"] ?? []).map((e) => e.id).join(",")
    },
    want: "a,n1",
  },
  {
    /* The case that matters: the app folded a day and wrote it, and then a
       stale read hands the same night back. It must not land twice. */
    name: "a night already folded is not folded again",
    got: () => {
      const day = foldDay({
        cells: { "slot-sleep": [{ id: "n1", activity: "activity-sleep", minutes: 400 }] },
        sleep: [{ id: "n1", minutes: 400 }],
      } as unknown as Day)
      return (day.cells?.["slot-sleep"] ?? []).length
    },
    want: 1,
  },
  {
    name: "a day with no night is returned untouched",
    got: () => {
      const day = { cells: { "s-am": [] } } as unknown as Day
      return foldDay(day) === day
    },
    want: true,
  },
  {
    name: "the slot and the activity are invented until the migration makes them",
    got: () => {
      const rule = ruleOf(
        { id: "c", ...target("activity", "a-les"), min: 60 } as StreakClause,
        "day",
      )
      const proj = project(rule, {
        [MON]: { sleep: [{ id: "n1", minutes: 400 }] } as unknown as Day,
      })
      const folded = foldSleep({ ...proj, slots: SLOTS, activities: ACTIVITIES })
      return [
        folded.slots.some((x) => x.id === "slot-sleep"),
        folded.activities.some((x) => x.id === "activity-sleep"),
      ].join(",")
    },
    want: "true,true",
  },
]

/**
 * **What the rule reads back as** — `spec 023`.
 *
 * The readback is the only way to check that what you built is what you meant,
 * so it is the one drawing worth asserting to the character. It also proves
 * the `frag:` fallbacks still work, which is what caught the doubled comma the
 * windows shipped with for an hour: the key's fallback *is* the English, so a
 * caller that adds punctuation of its own doubles whatever the fragment had.
 */
const SENTENCES: { name: string; clause: object; want: string }[] = [
  {
    name: "a window and a figure",
    clause: { id: "c", ...target("activity", "a-les"), min: 120, startWindow: { to: "10:00" } },
    want: "“Lessons” at least “2h”, starting by “10:00”",
  },
  {
    name: "both walls read as a stretch of clock",
    clause: { id: "c", ...target("activity", "a-les"), min: 120, startWindow: { from: "09:00", to: "10:00" } },
    want: "“Lessons” at least “2h”, starting between “09:00” and “10:00”",
  },
  {
    name: "a window carrying the whole condition",
    clause: { id: "c", ...target("activity", "a-les"), endWindow: { to: "18:00" } },
    want: "“Lessons” finishing by “18:00”",
  },
  {
    name: "both windows",
    clause: { id: "c", ...target("activity", "a-les"), min: 60, startWindow: { to: "10:00" }, endWindow: { from: "17:00" } },
    want: "“Lessons” at least “1h”, starting by “10:00”, finishing no earlier than “17:00”",
  },
  {
    /* The one that matters most: a rule with no window says exactly what it
       always said, to the character. */
    name: "no window at all, unchanged",
    clause: { id: "c", ...target("activity", "a-les"), min: 120 },
    want: "“Lessons” at least “2h”",
  },
  {
    name: "per weekday, grouped by the window as well as the figure",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      days: { 1: { min: 60, startWindow: { to: "09:00" } }, 2: { min: 60, startWindow: { to: "11:00" } } },
    },
    want: "“Lessons” at least “1h”, starting by “09:00” on Mon, at least “1h”, starting by “11:00” on Tue",
  },
]

/**
 * **A window on its own is a promise**, and the gate has to know it.
 *
 * *Begin by ten* asks something real with no figure beside it, and without
 * this the form would refuse to save one — the failure would be a control
 * that draws a rule and then will not let you keep it.
 */
const ACCEPTED: { name: string; clause: object }[] = [
  { name: "a window and no figure at all", clause: { id: "c", ...target("activity", "a-les"), startWindow: { to: "10:00" } } },
  { name: "a finishing window and no figure", clause: { id: "c", ...target("activity", "a-les"), endWindow: { from: "17:00" } } },
]

/**
 * The other end of the same axis — a condition **nothing** could satisfy.
 *
 * `clauseAsksNothing` catches the rule every day clears; this catches the rule
 * no day can. Both have stopped judging, and a rule that always breaks teaches
 * you to ignore it exactly as fast as one that never does. `byWeek` matters to
 * two of these: what fits in a day and what fits in a week are different
 * amounts of room.
 */
const IMPOSSIBLE: { name: string; clause: object; byWeek?: boolean }[] = [
  /* Two more ways in, both a scroll wheel apart — `spec 023`. */
  {
    name: "a window whose walls have crossed",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      startWindow: { from: "11:00", to: "09:00" },
    },
  },
  {
    name: "must begin after it has to have finished",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      startWindow: { from: "18:00" },
      endWindow: { to: "09:00" },
    },
  },
  {
    name: "a floor above its own ceiling",
    clause: { id: "c", ...target("activity", "a-les"), min: 180, max: 60 },
  },
  {
    name: "slot floors adding up past the day's ceiling",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      max: 120,
      slots: { "s-am": { min: 90 }, "s-pm": { min: 90 } },
    },
  },
  {
    name: "slot floors adding up past the day itself",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      slots: { "s-am": { min: 20 * 60 }, "s-pm": { min: 20 * 60 } },
    },
  },
  {
    name: "a figure on a slot the condition does not count",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      slotIds: ["s-am"],
      slots: { "s-pm": { min: 30 } },
    },
  },
  {
    name: "a slot floor above its own slot ceiling",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      slots: { "s-am": { min: 90, max: 30 } },
    },
  },
  {
    name: "one weekday of seven that contradicts itself",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      days: { 1: { min: 60 }, 4: { min: 180, max: 60 } },
    },
  },
]

/**
 * And the ones that look like the above and are perfectly fine. A refusal that
 * over-reaches is worse than none: it stops you writing a rule you meant.
 */
const POSSIBLE: { name: string; clause: object; byWeek?: boolean }[] = [
  {
    name: "a window that opens before it shuts",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      startWindow: { from: "09:00", to: "11:00" },
      endWindow: { to: "19:00" },
    },
  },
  {
    name: "slot floors that fit inside the day's ceiling",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      max: 240,
      slots: { "s-am": { min: 60 }, "s-pm": { min: 60 } },
    },
  },
  {
    name: "a slot floor with no day ceiling to breach",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      slots: { "s-am": { min: 600 } },
    },
  },
  {
    name: "twenty hours a slot, over a week rather than a day",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 60,
      slots: { "s-am": { min: 20 * 60 }, "s-pm": { min: 20 * 60 } },
    },
    byWeek: true,
  },
  {
    name: "counts, which have no ceiling of their own to exceed",
    clause: {
      id: "c",
      ...target("unit", "u-yt"),
      min: 1,
      slots: { "s-am": { min: 9999 } },
    },
  },
  {
    name: "a rider on a slot, with every slot counted",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 120,
      slots: { "s-am": { min: 60 } },
    },
  },
]

/**
 * One rule's notices, out of a project that holds only that rule.
 *
 * `notices()` is the whole board, so every case has to narrow to the rule it
 * is about — the fixed sources (the composite, the freeze allowance) speak on
 * every one of these days and are not what any of these cases is asking.
 */
const noticesFor = (ruleId: string, proj: Project, at: Date): Notice[] => {
  const rules = proj.settings.streakRules || []
  const statuses = rules.map((r) => ruleStatus(r, proj, at))
  return notices(proj, statuses, at).filter((n) => n.ruleId === ruleId)
}

const worstOf = (ruleId: string, proj: Project, at: Date) =>
  worstLevel(noticesFor(ruleId, proj, at))

const linesOf = (
  ruleId: string,
  proj: Project,
  at: Date,
  level?: NoticeLevel,
): string[] =>
  noticesFor(ruleId, proj, at)
    .filter((n) => !level || n.level === level)
    .flatMap((n) => n.lines)

/* ---- run --------------------------------------------------------------- */

const GREEN = "[32m"
const RED = "[31m"
const DIM = "[2m"
const OFF = "[0m"

let failed = 0
let deferred = 0

console.log(`${DIM}Every rule shape, against a period that should hold and one that should not.${OFF}\n`)

for (const test of CASES) {
  const rule = ruleOf(test.clause, test.scope)
  const proj = project(rule, test.days)
  const ctx = streakContext(proj)
  const got =
    test.scope === "day"
      ? ruleDayState(rule, ctx, test.days[MON], MON, TODAY)
      : ruleWeekState(rule, ctx, test.days, WEEK, TODAY)
  const readings =
    test.scope === "day"
      ? readDay(rule, ctx, test.days[MON], MON)
      : readWeek(rule, ctx, test.days, WEEK, TODAY)
  const deficit = readings.reduce((n, r) => n + r.deficit, 0)

  const ok = got === test.want
  if (ok) {
    console.log(`${GREEN}  ok${OFF}  ${test.name}`)
    if (test.pending)
      console.log(`      ${DIM}${test.pending} — expected to fail, and does not. Drop the marker.${OFF}`)
  } else if (test.pending) {
    deferred += 1
    console.log(`${DIM}  ..  ${test.name} — ${got}, want ${test.want} (${test.pending})${OFF}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  ${test.name}`)
    console.log(`      got ${got}, want ${test.want}; deficit ${deficit}`)
    console.log(`      ${DIM}reads "${clauseSentence(test.clause, ctx, test.scope)}"${OFF}`)
  }
}

console.log("")
for (const test of RISKS) {
  const rule = {
    ...ruleOf(test.clause as StreakClause, "day"),
    startedOn: RISK_YESTERDAY,
    lockedUntil: RISK_YESTERDAY,
    freezesPerWeek: test.freezes ?? 3,
  } as StreakRule
  /* Yesterday satisfies every shape these cases use — both checks answered
     and three hours logged — so the risk builder reaches its `today` branch
     rather than reporting yesterday's emergency. A fixture that holds for one
     kind of rule and not another silently tests the wrong branch. */
  const held = {
    ...answered({ "u-wake": "yes", "u-bed": "yes" }),
    ...studied(180),
  } as Day
  const proj = project(rule, {
    [RISK_YESTERDAY]: held,
    ...(test.today ? { [RISK_DAY]: test.today } : {}),
  })
  const at = new Date(`${RISK_DAY}T${String(test.hour).padStart(2, "0")}:00:00`)
  const got = worstOf(rule.id, proj, at) ?? "(nothing)"
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  level: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  level: ${test.name} — ${got}, want ${test.want}`)
  }
}

console.log("")
for (const test of MASKS) {
  const rule = {
    ...ruleOf(test.clause as StreakClause, "day"),
    startedOn: RISK_YESTERDAY,
    lockedUntil: RISK_YESTERDAY,
    freezesPerWeek: 3,
  } as StreakRule
  const proj = project(rule, {
    ...(test.yesterday ? { [RISK_YESTERDAY]: test.yesterday } : {}),
    ...(test.todayDay ? { [RISK_DAY]: test.todayDay } : {}),
  })
  const at = new Date(`${RISK_DAY}T09:00:00`)
  const said = linesOf(rule.id, proj, at).join(" · ")
  if (said.includes(test.mentions)) {
    console.log(`${GREEN}  ok${OFF}  both: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  both: ${test.name}`)
    console.log(`      got  ${said || "(nothing)"}`)
    console.log(`      want a line containing ${test.mentions}`)
  }
}

console.log("")
for (const test of DUES) {
  const rule = {
    ...ruleOf(test.clause as StreakClause, "day"),
    startedOn: RISK_DAY,
    lockedUntil: RISK_DAY,
  } as StreakRule
  const proj = project(rule, test.day ? { [RISK_DAY]: test.day } : {})
  const at = new Date(`${RISK_DAY}T${String(test.hour).padStart(2, "0")}:00:00`)
  /* `dueToday` is gone: what it said is now the `notice` level, and what it
     deliberately withheld is now said at a level that is not `notice`. Both
     halves of that are worth pinning, so the case asserts the whole set of
     `notice` lines rather than one string. */
  const got = linesOf(rule.id, proj, at, "notice").join(" · ") || null
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  owed: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  owed: ${test.name}`)
    console.log(`      got  ${got === null ? "(nothing)" : got}`)
    console.log(`      want ${test.want === null ? "(nothing)" : test.want}`)
  }
}

console.log("")
for (const test of READS) {
  const rule = ruleOf(test.clause as StreakClause, "day")
  const proj = project(rule, test.day ? { [MON]: test.day } : {})
  const ctx = streakContext(proj)
  const [reading] = readDay(rule, ctx, test.day, MON)
  const got = clauseReadout(reading, ctx, test.day, MON, test.mode)
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  reads: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  reads: ${test.name}`)
    console.log(`      got  ${got}`)
    console.log(`      want ${test.want}`)
  }
}

console.log("")
for (const test of LOCKS) {
  const before = ruleOf(test.before as StreakClause, "day")
  const after = ruleOf(test.after as StreakClause, "day")
  const ctx = streakContext(project(before, {}))
  const got = isNarrowing(before, after, ctx)
  const word = (v: boolean) => (v ? "lands at once" : "waits")
  if (got === test.lands) {
    console.log(`${GREEN}  ok${OFF}  lock: ${test.name} — ${word(got)}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  lock: ${test.name} — ${word(got)}, want ${word(test.lands)}`,
    )
  }
}

console.log("")
for (const test of PROGRESS) {
  const got = progressOf(
    A_PROJECT,
    achievement(test.source, 999),
    new Date(`${A_TODAY}T12:00:00`),
  )
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  reaches: ${test.name}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  reaches: ${test.name} — ${got}, want ${test.want}`,
    )
  }
}

/* **When an achievement may be sealed, and when its terms stop moving.**

   Both of these are one bug reported from ordinary use: pressing *+
   Achievement* minted a hundred points and an indelible record before the
   form had been looked at, because the defaults are thirty days in a row and
   any project with a streak already has them. Then the terms could not be
   raised — the terms of something already earned are frozen — and deleting it
   left the badge and the points behind. */

interface SealCase {
  name: string
  createdOn: DayKey
  on: DayKey
  want: number
}

const SEALS: SealCase[] = [
  {
    /* The lock has always said the day it is written is yours to get it right
       on (`settingUp`); the sealer never honoured it. The rules can afford
       that gap because a rule seals no week the day it is written — an
       achievement seals the moment its figure is met. */
    name: "the day it is written is not a day it can be earned on",
    createdOn: A_TODAY,
    on: A_TODAY,
    want: 0,
  },
  {
    name: "and the next day it seals, on whatever terms it ended up with",
    createdOn: A_TODAY,
    on: "2026-08-18",
    want: 1,
  },
  {
    name: "one written earlier is sealed today as before",
    createdOn: A_START,
    on: A_TODAY,
    want: 1,
  },
]

console.log("")
for (const test of SEALS) {
  // A total of something the fixture actually logged, so the threshold is
  // plainly met and the only thing under test is the date.
  const a = {
    ...achievement(
      { kind: "total", targets: [{ kind: "activity", id: "a-les" }], window: "ever" },
      1,
    ),
    createdOn: test.createdOn,
  } as Achievement
  const proj = {
    ...A_PROJECT,
    settings: { ...A_PROJECT.settings, achievements: [a] },
  } as Project
  const got = dueAchievements(proj, new Date(`${test.on}T12:00:00`)).length
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  seals: ${test.name}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  seals: ${test.name} — ${got} sealed, want ${test.want}`,
    )
  }
}

interface FrozenCase {
  name: string
  earned: boolean
  raise: boolean
  allowed: boolean
}

const FROZEN: FrozenCase[] = [
  {
    /* The ledger recorded what it was worth at the moment it was reached and
       the account has been paid. A definition that moved afterwards leaves the
       badge and the sentence describing it disagreeing, and raising the bar
       cannot un-earn it, because the row is written once. */
    name: "already earned · raising the figure is refused",
    earned: true,
    raise: true,
    allowed: false,
  },
  {
    name: "already earned · a draft that changed nothing is not an edit",
    earned: true,
    raise: false,
    allowed: true,
  },
  {
    name: "not earned · the same raise still lands at once",
    earned: false,
    raise: true,
    allowed: true,
  },
]

console.log("")
for (const test of FROZEN) {
  const prev = {
    ...achievement({ kind: "run", run: { consecutive: true, scale: "day" } }, 30),
    createdOn: A_START,
    lockedUntil: A_START,
  } as Achievement
  const draft = test.raise ? { ...prev, threshold: 40 } : { ...prev }
  const edit = achievementEdit(
    prev,
    draft,
    7,
    new Date(`${A_TODAY}T12:00:00`),
    "",
    test.earned,
  )
  if (edit.allowed === test.allowed) {
    console.log(`${GREEN}  ok${OFF}  frozen: ${test.name}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  frozen: ${test.name} — allowed=${edit.allowed}, want ${test.allowed}`,
    )
  }
}

console.log("")
for (const test of A_LOCKS) {
  const before = achievement(test.before, test.beforeN ?? 30, test.beforeR ?? 0)
  const after = achievement(test.after, test.afterN ?? 30, test.afterR ?? 0)
  const got = achievementNarrows(before, after)
  const word = (v: boolean) => (v ? "lands at once" : "waits")
  if (got === test.lands) {
    console.log(`${GREEN}  ok${OFF}  earned: ${test.name} — ${word(got)}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  earned: ${test.name} — ${word(got)}, want ${word(test.lands)}`,
    )
  }
}

console.log("")
for (const test of REMOVALS) {
  const g = removalGate(
    { createdOn: test.createdOn, lockedUntil: test.lockedUntil },
    new Date(`${RISK_DAY}T12:00:00`),
    test.reason,
    test.supervised,
  )
  const got = g.free
    ? "free"
    : g.waitsUntil
      ? "waits"
      : g.needsReason
        ? "needsReason"
        : g.needsApproval
          ? "needsApproval"
          : g.allowed
            ? "allowed"
            : "refused"
  // Only two of the five states may actually go through.
  const shouldAllow = got === "free" || got === "allowed"
  if (got === test.want && g.allowed === shouldAllow) {
    console.log(`${GREEN}  ok${OFF}  dropping: ${test.name} — ${got}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  dropping: ${test.name} — ${got} (allowed=${g.allowed}), want ${test.want}`,
    )
  }
}

console.log("")
for (const test of BALANCES) {
  const got =
    test.kept * KEPT_VALUE -
    test.missed * MISSED_COST +
    (test.paid ?? 0) -
    test.spent
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  points: ${test.name}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  points: ${test.name} — ${got}, want ${test.want}`,
    )
  }
}

/* ---- the partial first week — `spec 018` -------------------------------

   A weekly rule written on any day but a Monday used to do nothing at all
   until the following Monday: no arc, no alarm, no effect, no explanation.
   The gate that did it was written as a statement about weekly rules and is
   a statement about **floors** — "three trips a week" judged over the four
   days that were left is a rule nobody wrote. A ceiling knows nothing about
   how much week there was.

   So the week keeps no verdict of its own and never moves the streak, and a
   broken ceiling is still drawn and still warned about. These pin both
   halves, because getting either one wrong is silent. */

/** Wednesday of `WEEK` — the rule is written mid-week. */
const MIDWEEK: DayKey = KEYS[2]
/** Friday: inside the same partial week, with the ceiling already broken. */
const MIDWEEK_TODAY: DayKey = KEYS[4]
const MIDWEEK_AT = new Date(`${MIDWEEK_TODAY}T12:00:00`)

const midweekRule = (clause: object, freezes = 0): StreakRule =>
  ({
    ...ruleOf(clause as StreakClause, "week"),
    startedOn: MIDWEEK,
    lockedUntil: MIDWEEK,
    freezesPerWeek: freezes,
  }) as StreakRule

/** One Youtube in the evening, on the Thursday — after the rule was written. */
const SLIP: Record<DayKey, Day> = { [KEYS[3]]: counted("u-yt", "s-pm", 1) }

interface PartialCase {
  name: string
  clause: object
  days: Record<DayKey, Day>
  /** The weekly allowance. Nought unless a case is about being able to pay. */
  freezes?: number
  /** What the engine should say, as one printable line. */
  got: (rule: StreakRule, proj: Project) => string
  want: string
}

const CEILING = {
  id: "c",
  ...target("unit", "u-yt"),
  max: 9,
  slots: { "s-pm": { max: 0 } },
}
const FLOOR = { id: "c", ...target("unit", "u-gym"), min: 3 }

const dayStateAt =
  (key: DayKey) =>
  (rule: StreakRule, proj: Project): string =>
    ruleWeekDayState(rule, streakContext(proj), proj.days, key, MIDWEEK_TODAY)

const riskAt = (rule: StreakRule, proj: Project): string =>
  worstOf(rule.id, proj, MIDWEEK_AT) ?? "(nothing)"

const PARTIALS: PartialCase[] = [
  {
    name: "a ceiling broken after the rule was written still misses its day",
    clause: CEILING,
    days: SLIP,
    got: dayStateAt(KEYS[3]),
    want: "missed",
  },
  {
    name: "the other days of that week are watching, not unjudged",
    clause: CEILING,
    days: SLIP,
    got: dayStateAt(KEYS[4]),
    want: "watching",
  },
  {
    name: "a day before the rule was written is unjudged",
    clause: CEILING,
    days: SLIP,
    got: dayStateAt(KEYS[0]),
    want: "unjudged",
  },
  {
    name: "a floor nobody agreed to says nothing",
    clause: FLOOR,
    days: {},
    got: dayStateAt(KEYS[4]),
    want: "watching",
  },
  {
    name: "the week's own verdict stays unjudged, so the streak cannot break",
    clause: CEILING,
    days: SLIP,
    got: (rule, proj) =>
      ruleWeekState(rule, streakContext(proj), proj.days, WEEK, MIDWEEK_TODAY),
    want: "unjudged",
  },
  {
    name: "and the streak itself is untouched",
    clause: CEILING,
    days: SLIP,
    got: (rule, proj) => String(ruleStatus(rule, proj, MIDWEEK_AT).current),
    want: "0",
  },
  /* The sharp one. The ring draws it and the ledger does not conclude it:
     `spec 010` Decision 1 already allows that split, and here it says *you did
     the thing you said you would not* while the week was never in force. */
  {
    name: "the broken day is drawn and not tallied",
    clause: CEILING,
    days: SLIP,
    got: (_rule, proj) => {
      const r = dayReport(proj, KEYS[3], MIDWEEK_TODAY)
      return `${r.readings.length} drawn, ${r.judged} judged, ${r.state}`
    },
    want: "1 drawn, 0 judged, unjudged",
  },
  /* **The split `spec 016` gained after the fact.** A settled violation with
     a freeze that can reach it is a *call* — `danger`. The same violation with
     no freeze to spend on it is a *report* — `gone`. Both halves are pinned,
     because getting either one wrong teaches the reader that the bright red
     sometimes means act and sometimes means it is over. */
  /* Still `danger`, not `gone`: there are no offers in a week nobody agreed
     to, because nothing is at stake there — and nothing at stake is not the
     same as nothing left to do. The `gone` split is pinned on a daily rule,
     where the freeze economy actually applies. */
  {
    name: "a broken ceiling is danger even in a week nobody agreed to",
    clause: CEILING,
    days: SLIP,
    got: riskAt,
    want: "danger",
  },
  {
    name: "a short floor in the same week says nothing at all",
    clause: FLOOR,
    days: {},
    got: riskAt,
    want: "(nothing)",
  },
]

console.log("")
for (const test of PARTIALS) {
  const rule = midweekRule(test.clause, test.freezes ?? 0)
  const proj = project(rule, test.days)
  const got = test.got(rule, proj)
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  partial: ${test.name}`)
  } else {
    failed += 1
    console.log(
      `${RED}FAIL${OFF}  partial: ${test.name} — ${got}, want ${test.want}`,
    )
  }
}

/* ---- reading a week back — `spec 018` -----------------------------------

   `shortfall` handed a **week** reading to a **day** readout keyed on today,
   so the week's figure was tested against the day's bounds and its slots were
   measured on the one day with nothing in them. Nothing matched, and every
   weekly line fell through to a bare `“Youtube” “1”`. These pin the sentence
   that should have been built. */

interface WeekReadCase {
  name: string
  clause: object
  days: Record<DayKey, Day>
  mode: "failing" | "all"
  want: string
}

const WEEK_READS: WeekReadCase[] = [
  {
    name: "a slot ceiling names the slot, the figure and the bound",
    clause: {
      id: "c",
      ...target("unit", "u-yt"),
      max: 9,
      slots: { "s-pm": { max: 0 } },
    },
    days: { [TUE]: counted("u-yt", "s-pm", 1) },
    mode: "failing",
    want: "“Youtube” “1” in “Evening” this week against at most “0”",
  },
  {
    name: "the week's own ceiling reads as the week's",
    clause: { id: "c", ...target("unit", "u-yt"), max: 2 },
    days: { [MON]: counted("u-yt", "s-am", 3) },
    mode: "failing",
    want: "“Youtube” “3” this week against at most “2”",
  },
  {
    name: "a floor short reads as the week's",
    clause: { id: "c", ...target("unit", "u-gym"), min: 3 },
    days: { [MON]: counted("u-gym", "s-am", 1) },
    mode: "failing",
    want: "“Gym” “1” this week against at least “3”",
  },
  {
    name: "nothing wrong, read in full, still says which week it is about",
    clause: { id: "c", ...target("unit", "u-yt"), max: 3 },
    days: { [MON]: counted("u-yt", "s-am", 1) },
    mode: "all",
    want: "“Youtube” “1” of “3” this week",
  },
]

console.log("")
for (const test of WEEK_READS) {
  const rule = ruleOf(test.clause as StreakClause, "week")
  const proj = project(rule, test.days)
  const ctx = streakContext(proj)
  const [reading] = readWeek(rule, ctx, proj.days, WEEK, TODAY)
  const got = clauseWeekReadoutParts(
    reading,
    ctx,
    proj.days,
    coveredDays(test.clause as StreakClause, rule, WEEK),
    test.mode,
  ).join(" · ")
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  week reads: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  week reads: ${test.name}`)
    console.log(`      got  ${got}`)
    console.log(`      want ${test.want}`)
  }
}

/* ---- today is not a day you kept — `spec 018` ---------------------------

   `ruleDayState` returns `met` for today the moment the deficit is nought, so
   a rule written this morning with nothing logged against it read `1`:
   credited with a day that is not over. `keptDays` has always declined to
   count today and `keptBreakdown` was fixed to agree; this was the last of
   the three still disagreeing. */

interface FreshCase {
  name: string
  startedOn: DayKey
  want: number
}

const FRESH: FreshCase[] = [
  { name: "a rule written this morning has kept nothing yet", startedOn: RISK_DAY, want: 0 },
  { name: "yesterday still counts", startedOn: RISK_YESTERDAY, want: 1 },
]

console.log("")
for (const test of FRESH) {
  const rule = {
    ...ruleOf(
      { id: "c", ...target("unit", "u-yt"), max: 0 } as StreakClause,
      "day",
    ),
    startedOn: test.startedOn,
    lockedUntil: test.startedOn,
  } as StreakRule
  const at = new Date(`${RISK_DAY}T09:00:00`)
  const got = ruleStatus(rule, project(rule, {}), at).current
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  today: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  today: ${test.name} — ${got}, want ${test.want}`)
  }
}

/* ---- freezes bought, not charged — `spec 017` ---------------------------

   A freeze used to be a rule id with its price recomputed on every read, so
   it was not a purchase: it was a property the current data happened to have.
   Three things follow from fixing that, and all three are silent when broken.

   **The prices must not move.** Itemising the deficit is only safe if the
   items add back up to it — otherwise every rule quietly got cheaper or
   dearer on the day this landed. */

interface SplitCase {
  name: string
  clause: object
  day: Day
  /** How many named sites it should break into. */
  sites: number
}

const SPLITS: SplitCase[] = [
  {
    name: "two checks, one answered wrongly and one not answered",
    clause: { id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes },
    day: answered({ "u-wake": "no" }),
    sites: 2,
  },
  {
    name: "a count over its own ceiling is one site at the price it missed by",
    clause: { id: "c", ...target("unit", "u-yt"), max: 0 },
    day: counted("u-yt", "s-am", 3),
    sites: 1,
  },
  {
    name: "a day bound and a slot rider are two sites",
    clause: {
      id: "c",
      ...target("unit", "u-yt"),
      max: 2,
      slots: { "s-pm": { max: 0 } },
    },
    day: counted("u-yt", "s-pm", 4),
    sites: 2,
  },
  {
    /* One broken promise, not forty. The whole freeze economy prices time
       this way and splitting it here would multiply what a bad day costs. */
    name: "time is one site however many of its parts broke",
    clause: {
      id: "c",
      ...target("activity", "a-les"),
      min: 180,
      slots: { "s-pm": { min: 60 } },
    },
    day: studied(20),
    sites: 1,
  },
]

console.log("")
for (const test of SPLITS) {
  const rule = ruleOf(test.clause as StreakClause, "day")
  const proj = project(rule, { [MON]: test.day })
  const ctx = streakContext(proj)
  const vs = violationsOn(rule, ctx, test.day, MON)
  const deficit = totalDeficit(readDay(rule, ctx, test.day, MON))
  const got = `${vs.length} sites, ${violationsCost(vs)} total`
  const want = `${test.sites} sites, ${deficit} total`
  if (got === want) {
    console.log(`${GREEN}  ok${OFF}  splits: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  splits: ${test.name} — ${got}, want ${want}`)
  }
}

/* **A week splits exactly as a day does.** `spec 017` made a week one flat
   violation costing one freeze, and that left the week as the cheap period: a
   day rule pays what it fell short by, so four slips cost four, while the same
   promise written weekly cost one however far past the line you went. These
   assert the split *and* that the items still add back up to the week's
   deficit — the streak must be untouched, only the buying changed. */

interface WeekSplit {
  name: string
  clauses: object[]
  days: Record<DayKey, Day>
  sites: number
}

const WEEK_SPLITS: WeekSplit[] = [
  {
    name: "the week's own ceiling and its slot rider are two sites",
    clauses: [
      { id: "c", ...target("unit", "u-yt"), max: 2, slots: { "s-pm": { max: 0 } } },
    ],
    days: { [MON]: counted("u-yt", "s-pm", 4) },
    sites: 2,
  },
  {
    name: "a weekly floor is one site, priced by what it fell short by",
    clauses: [{ id: "c", ...target("unit", "u-gym"), min: 3 }],
    days: { [MON]: counted("u-gym", "s-am", 1) },
    sites: 1,
  },
  {
    /* One broken promise, not forty minutes' worth — the same rule the day
       follows, and the reason a weekly time rule still costs exactly one. */
    name: "weekly time is one site however many of its parts broke",
    clauses: [
      { id: "c", ...target("activity", "a-les"), min: 600, slots: { "s-pm": { min: 60 } } },
    ],
    days: { [MON]: studied(20) },
    sites: 1,
  },
  {
    name: "a compound weekly rule is one site per condition that broke",
    clauses: [
      { id: "c1", ...target("unit", "u-yt"), max: 1 },
      { id: "c2", ...target("activity", "a-les"), min: 600 },
    ],
    days: { [MON]: { ...counted("u-yt", "s-am", 5), ...studied(60) } as Day },
    sites: 2,
  },
  {
    /* Two bounds on two different answers are two promises, so two sites. */
    name: "a week of checks splits per accepted answer",
    clauses: [
      { id: "c", ...checks("u-wake"), states: { yes: { min: 4 }, no: { max: 0 } } },
    ],
    days: { [MON]: answered({ "u-wake": "yes" }), [TUE]: answered({ "u-wake": "no" }) },
    sites: 2,
  },
  {
    /* Day-shaped answers left behind by switching a rule from days to weeks:
       one site per check, priced by how many days were not accepted. Not one
       per day — `violationKey` has no room for a date, and giving it one would
       orphan every freeze already bought. */
    name: "day-shaped answers on a weekly rule split per check",
    clauses: [{ id: "c", ...checks("u-wake", "u-bed"), allow: everyDayYes }],
    days: { [MON]: answered({ "u-wake": "yes", "u-bed": "no" }) },
    sites: 2,
  },
]

console.log("")
for (const test of WEEK_SPLITS) {
  const rule = { ...ruleOf(test.clauses[0] as StreakClause, "week"), clauses: test.clauses as StreakClause[] }
  const proj = project(rule, test.days)
  const ctx = streakContext(proj)
  const vs = weekViolationsOn(rule, ctx, test.days, WEEK, TODAY)
  const deficit = totalDeficit(readWeek(rule, ctx, test.days, WEEK, TODAY))
  const got = `${vs.length} sites, ${violationsCost(vs)} total`
  const want = `${test.sites} sites, ${deficit} total`
  if (got === want) {
    console.log(`${GREEN}  ok${OFF}  week splits: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  week splits: ${test.name} — ${got}, want ${want}`)
  }
}

/* **A violation you have paid for stops speaking.**
   `notices.ts` predates `spec 017` and could only see a freeze at the level of
   the whole rule — `state === "frozen"`, which is `isFrozenFor`, which means
   *every* site covered. So a rule asserting two checks with one of them bought
   went on shouting `danger` about the one you had just paid for: the board
   contradicting the receipt, with the receipt right. */

interface PaidCase {
  name: string
  freezes: unknown[]
  wantDanger: string[]
}

const PAID: PaidCase[] = [
  {
    name: "nothing bought · the wrong answer is the alarm",
    freezes: [],
    wantDanger: ["“Wake up” is “no”"],
  },
  {
    name: "that one violation bought · it stops speaking",
    freezes: [
      { ruleId: "r", clauseId: "c", targetId: "u-wake", cost: 1, boughtAt: "x" },
    ],
    wantDanger: [],
  },
  {
    name: "a different violation bought · the alarm stands",
    freezes: [
      { ruleId: "r", clauseId: "c", targetId: "u-bed", cost: 1, boughtAt: "x" },
    ],
    wantDanger: ["“Wake up” is “no”"],
  },
]

console.log("")
for (const test of PAID) {
  const rule = {
    ...ruleOf(
      {
        id: "c",
        ...checks("u-wake", "u-bed"),
        allow: everyDayYes,
      } as unknown as StreakClause,
      "day",
    ),
    startedOn: RISK_DAY,
    lockedUntil: RISK_DAY,
    /* **Freezes have to be affordable, or the level is `gone` rather than
       `danger`** — `ruleOf` grants none, and a violation nothing can reach is
       a report rather than a call. This case is about the call. */
    freezesPerWeek: 3,
    freezeCap: 3,
  } as StreakRule
  // Woke up late; not yet in bed, so the second check is still an errand and
  // the rule is never *fully* frozen — which is the whole point of the case.
  const today = {
    ...answered({ "u-wake": "no" }),
    ...(test.freezes.length ? { ruleFreezes: test.freezes } : {}),
  } as unknown as Day
  const proj = project(rule, { [RISK_DAY]: today })
  const at = new Date(`${RISK_DAY}T14:00:00`)
  const got = linesOf(rule.id, proj, at, "danger")
    .filter((l) => !l.startsWith("Yesterday"))
    .join(" · ")
  const want = test.wantDanger.join(" · ")
  if (got === want) {
    console.log(`${GREEN}  ok${OFF}  paid: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  paid: ${test.name}`)
    console.log(`      got  ${got || "(nothing)"}`)
    console.log(`      want ${want || "(nothing)"}`)
  }
}

/* **Only what is already lost may be bought.** The case the whole spec exists
   for: at noon a wrong answer is spent and an unanswered check is an errand,
   and billing for the errand is what made one slip cost two freezes. */

interface OfferCase {
  name: string
  day: Day | undefined
  hour: number
  /** The lines offered, in order, joined. */
  want: string
}

const SLEEP_CLAUSE = {
  id: "c1",
  ...checks("u-wake", "u-bed"),
  allow: everyDayYes,
} as unknown as StreakClause

const bought = (day: Day | undefined): Day =>
  ({
    ...(day || {}),
    ruleFreezes: [
      { ruleId: "r", clauseId: "c1", targetId: "u-wake", cost: 1, boughtAt: "x" },
    ],
  }) as unknown as Day

const OFFERS: OfferCase[] = [
  {
    name: "at noon only the answered-wrongly check is on offer",
    day: answered({ "u-wake": "no" }),
    hour: 12,
    want: "“Wake up” is “no”",
  },
  {
    name: "an unanswered check is an errand and is never billed",
    day: undefined,
    hour: 12,
    want: "",
  },
  {
    name: "once the evening answers it too, it is offered separately",
    day: answered({ "u-wake": "no", "u-bed": "no" }),
    hour: 21,
    want: "“Wake up” is “no” · “Go to bed” is “no”",
  },
  {
    /* The receipt: what you already paid for stays on the list, marked, or
       there is no way to find out and paying twice becomes possible. */
    name: "what is already frozen stays listed",
    day: bought(answered({ "u-wake": "no", "u-bed": "no" })),
    hour: 21,
    want: "“Wake up” is “no” · “Go to bed” is “no”",
  },
]

console.log("")
for (const test of OFFERS) {
  const rule = {
    ...ruleOf(SLEEP_CLAUSE, "day"),
    startedOn: RISK_DAY,
    lockedUntil: RISK_DAY,
    freezesPerWeek: 3,
  } as StreakRule
  const proj = project(rule, test.day ? { [RISK_DAY]: test.day } : {})
  const at = new Date(`${RISK_DAY}T${String(test.hour).padStart(2, "0")}:00:00`)
  const left = 24 * 60 - test.hour * 60
  const got = freezeOffers(rule, proj, RISK_DAY, RISK_DAY, ruleStatus(rule, proj, at), left)
    .map((o) => o.violation.line)
    .join(" · ")
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  offers: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  offers: ${test.name}`)
    console.log(`      got  ${got || "(nothing)"}`)
    console.log(`      want ${test.want || "(nothing)"}`)
  }
}

/* **A price stamped is a price kept, and a freeze spent stays spent.** These
   are the three failures the old shape had, one case each. */

interface LedgerCase {
  name: string
  day: Day
  /** What the week has spent, and what the day is worth. */
  want: string
}

const LEDGERS: LedgerCase[] = [
  {
    name: "buying one of two leaves the day missed and one freeze spent",
    day: bought(answered({ "u-wake": "no", "u-bed": "no" })),
    want: "1 spent, missed",
  },
  {
    name: "answering the other one does not take a second freeze",
    day: bought(answered({ "u-wake": "no", "u-bed": "yes" })),
    want: "1 spent, frozen",
  },
  {
    /* The one that made the economy reversible: putting the answer back used
       to hand the freeze to the bank. */
    name: "logging the day up afterwards does not hand the freeze back",
    day: bought(answered({ "u-wake": "yes", "u-bed": "yes" })),
    want: "1 spent, met",
  },
  {
    name: "a legacy bare id still means the whole rule, entirely",
    day: {
      ...answered({ "u-wake": "no", "u-bed": "no" }),
      ruleFreezes: ["r"],
    } as unknown as Day,
    want: "2 spent, frozen",
  },
]

console.log("")
for (const test of LEDGERS) {
  const rule = {
    ...ruleOf(SLEEP_CLAUSE, "day"),
    startedOn: MON,
    lockedUntil: MON,
    freezesPerWeek: 3,
  } as StreakRule
  const proj = project(rule, { [MON]: test.day })
  const ctx = streakContext(proj)
  /* Measured with `freezeSpendOn` rather than off the weekly pool: the pool
     reports **this** week, and the fixture's day is a fortnight old. What is
     under test is that the figure comes out of the record rather than out of
     the data, and that is what this reads. */
  const spent = freezeSpendOn(rule, ctx, test.day, MON)
  const got = `${spent} spent, ${ruleDayState(rule, ctx, test.day, MON, TODAY)}`
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  ledger: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  ledger: ${test.name} — ${got}, want ${test.want}`)
  }
}

/* ---- three additions — `spec 019` ---------------------------------------

   Two of them widen what a condition can point at, and both have the same
   failure mode if they are wrong: a rule quietly measures something other than
   what it says. That is silent, so it is pinned here. */

const SLEPT = (minutes: number): Day =>
  ({
    cells: {
      "s-am": [{ id: "e", activity: "a-les", minutes: 120 }],
      "slot-sleep": [
        { id: "s", activity: "a-sleep", start: "23:00", end: "07:00", minutes },
      ],
    },
  }) as unknown as Day

interface AddCase {
  name: string
  clause: object
  day: Day
  /** What the condition measured. */
  want: number
}

const ADDITIONS: AddCase[] = [
  {
    /* **Sleep stopped being an axis** — `spec 024`. A night is an ordinary
       activity in an ordinary slot, so a rule about it names that activity and
       is read by the same arithmetic as everything else. There is no `sleep`
       target kind left to test. */
    name: "a rule pointed at the sleep activity counts the nights",
    clause: { id: "c", ...target("activity", "a-sleep"), min: 420 },
    day: SLEPT(400),
    want: 400,
  },
  {
    /* And it lands in the totals now, because it is time like any other. What
       keeps it out of the figure a period reports is the benchmark rule not
       naming it — see `spec 022`. */
    name: "all logged time now includes the night",
    clause: { id: "c", ...target("time", ""), min: 60 },
    day: SLEPT(400),
    want: 520,
  },
  {
    /* A tag reached counters only until `spec 019`; with activities tagged it
       reaches them too, so it needs the branch its sibling `category` has
       rather than falling through to "everything". */
    name: "a tag reaches the activities wearing it, and nothing else",
    clause: {
      id: "c",
      targets: [{ kind: "tag", id: "t-deep", measure: "time" }],
      min: 180,
    },
    day: studied(120),
    want: 120,
  },
]

console.log("")
for (const test of ADDITIONS) {
  const rule = ruleOf(test.clause as StreakClause, "day")
  const proj = project(rule, { [MON]: test.day })
  const got = readDay(rule, streakContext(proj), test.day, MON)[0].value
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  adds: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  adds: ${test.name} — ${got}, want ${test.want}`)
  }
}

console.log("")
for (const { name, clause, byWeek } of IMPOSSIBLE) {
  const rule = ruleOf(clause as StreakClause, byWeek ? "week" : "day")
  const ctx = streakContext(project(rule, {}))
  const said = clauseImpossible(clause as StreakClause, ctx, !!byWeek)
  if (said) {
    console.log(`${GREEN}  ok${OFF}  impossible: ${name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  impossible: ${name} — accepted, and no day can hold it`)
  }
}

console.log("")
for (const { name, clause, byWeek } of POSSIBLE) {
  const rule = ruleOf(clause as StreakClause, byWeek ? "week" : "day")
  const ctx = streakContext(project(rule, {}))
  const said = clauseImpossible(clause as StreakClause, ctx, !!byWeek)
  if (!said) {
    console.log(`${GREEN}  ok${OFF}  allowed: ${name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  allowed: ${name} — refused as “${said}”`)
  }
}

console.log("")
for (const { name, clause } of REFUSED) {
  const rule = ruleOf(clause as StreakClause, "day")
  const ctx = streakContext(project(rule, {}))
  const refused = clauseAsksNothing(clause as StreakClause, ctx)
  if (refused) {
    console.log(`${GREEN}  ok${OFF}  refused: ${name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  refused: ${name} — accepted, and it judges nothing`)
  }
}

console.log("")
for (const test of FOLDS) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  fold: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  fold: ${test.name}`)
    console.log(`      got ${got}, want ${test.want}`)
  }
}

console.log("")
for (const { name, clause, want } of SENTENCES) {
  const rule = ruleOf(clause as StreakClause, "day")
  const ctx = streakContext(project(rule, {}))
  const got = clauseSentence(clause as StreakClause, ctx, "day")
  if (got === want) {
    console.log(`${GREEN}  ok${OFF}  reads back: ${name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  reads back: ${name}`)
    console.log(`      got  ${got}`)
    console.log(`      want ${want}`)
  }
}

console.log("")
for (const { name, clause } of ACCEPTED) {
  const rule = ruleOf(clause as StreakClause, "day")
  const ctx = streakContext(project(rule, {}))
  if (!clauseAsksNothing(clause as StreakClause, ctx)) {
    console.log(`${GREEN}  ok${OFF}  accepted: ${name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  accepted: ${name} — refused, and it does ask something`)
  }
}

/* ---- a running week wears a receipt, not a verdict — `spec 025` ---------

   `spec 017` fixed *coverage* for a week — a violation that has grown past
   what was paid is not the one that was bought — and left the **verdict**
   alone. So a ceiling broken on the Monday and bought on the Monday made
   `isFrozenFor` true for a week with five days still to run, the strip
   coloured all seven of its cells by that state, and the board went silent
   about the rule until the violation grew past the price, at which point it
   reappeared at `danger` having never once warned. */

const W_CLAUSE = {
  id: "c",
  ...target("unit", "u-yt"),
  max: 3,
  slots: { "s-pm": { max: 0 } },
} as unknown as StreakClause

const W_RULE = ruleOf(W_CLAUSE, "week")

/** Three in the week, one of them in the evening the rule forbids. */
const W_DAY = {
  counters: { "u-yt": { "s-am": 2, "s-pm": 1 } },
} as unknown as Day

const W_PAID = {
  ...W_DAY,
  ruleFreezes: [
    { ruleId: "r", clauseId: "c", slotId: "s-pm", cost: 1, boughtAt: "x" },
  ],
} as unknown as Day

const W_DAYS = { [MON]: W_PAID }
const W_PROJECT = project(W_RULE, W_DAYS)
const W_CTX = streakContext(W_PROJECT)

const RUNNING: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "the ledger still calls a bought week frozen",
    got: () => ruleWeekState(W_RULE, W_CTX, W_DAYS, WEEK, TUE),
    want: "frozen",
  },
  {
    name: "but a week still running is drawn as still running",
    got: () => ruleWeekShown(W_RULE, W_CTX, W_DAYS, WEEK, TUE),
    want: "pending",
  },
  {
    name: "and turns blue once nothing more can be added to it",
    got: () => ruleWeekShown(W_RULE, W_CTX, W_DAYS, WEEK, TODAY),
    want: "frozen",
  },
  {
    name: "the board goes on warning about the bound that is still at its limit",
    got: () =>
      linesOf("r", W_PROJECT, new Date(`${TUE}T14:00:00`), "warning").join(" · "),
    want: "“Youtube” “3” of “3” used this week — one more ends it",
  },
  {
    name: "and says nothing more about the site that has been paid for",
    got: () =>
      linesOf("r", W_PROJECT, new Date(`${TUE}T14:00:00`), "danger").join(" · "),
    want: "",
  },
]

/* ---- one rule, two scales — `spec 025` ----------------------------------

   The scale used to belong to the rule, so *three hours a day of the course*
   and *at most one slip a week* were two rules: two streaks to keep, two
   allowances to spend, and two things that break independently for one thing
   you said. A condition now carries its own period, and the rule's own
   `scope` is what a condition without one takes. */

const M_DAY = {
  id: "cd",
  ...target("activity", "a-les"),
  min: 60,
} as unknown as StreakClause

const M_WEEK = {
  id: "cw",
  scope: "week",
  ...target("unit", "u-yt"),
  max: 1,
} as unknown as StreakClause

const M_RULE: StreakRule = {
  ...ruleOf(M_DAY, "day"),
  clauses: [M_DAY, M_WEEK],
}

/** A day with an hour and a half of lessons and `n` slips on it. */
const both = (minutes: number, slips: number): Day =>
  ({
    cells: { "s-am": [{ id: "e", activity: "a-les", minutes }] },
    counters: { "u-yt": { "s-am": slips } },
  }) as unknown as Day

const mixedOn = (days: Record<DayKey, Day>, key: DayKey): string => {
  const proj = project(M_RULE, days)
  return ruleStateOn(M_RULE, streakContext(proj), days, key, TODAY)
}

const MIXED: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "both halves held",
    got: () => mixedOn({ [MON]: both(90, 0) }, MON),
    want: "met",
  },
  {
    name: "the daily half falls short and the day goes with it",
    got: () => mixedOn({ [MON]: both(30, 0) }, MON),
    want: "missed",
  },
  {
    name: "the weekly half breaks and takes the day it broke on",
    got: () => mixedOn({ [MON]: both(90, 3) }, MON),
    want: "missed",
  },
  {
    /* **Reversed by `spec 027`, on purpose.** This wanted `met`: the week
       the weekly half lost on Monday was over for it, and every other day
       read as kept — so the run restarted in the middle of a week that could
       no longer be won, and every further slip that week was free. A day that
       added nothing to it is grey now: neither kept nor broken. */
    name: "and leaves the days it did not break on grey",
    got: () => mixedOn({ [MON]: both(90, 3), [WED]: both(90, 0) }, WED),
    want: "lost",
  },
  {
    name: "a day that adds to a lost week's excess is red again",
    got: () => mixedOn({ [MON]: both(90, 3), [WED]: both(90, 1) }, WED),
    want: "missed",
  },
  {
    name: "and a daily half broken on a grey day still decides it",
    got: () => mixedOn({ [MON]: both(90, 3), [WED]: both(30, 0) }, WED),
    want: "missed",
  },
  {
    name: "a weekly condition judges no single day of its own",
    got: () => judgesDay({ ...M_RULE, clauses: [M_WEEK] }, MON),
    want: false,
  },
  {
    /* A condition with no period of its own takes the rule's, which is what
       makes this change need no migration — and it is also why *saying* day
       is the only way to get one inside a weekly rule. */
    name: "a condition with no period of its own takes the rule's",
    got: () =>
      judgesDay(
        { ...M_RULE, scope: "week", clauses: [M_DAY] } as StreakRule,
        MON,
      ),
    want: false,
  },
  {
    name: "and a daily one that says so judges its days inside a weekly rule",
    got: () =>
      judgesDay(
        {
          ...M_RULE,
          scope: "week",
          clauses: [{ ...M_DAY, scope: "day" } as StreakClause, M_WEEK],
        } as StreakRule,
        MON,
      ),
    want: true,
  },
  {
    name: "the day's figure is the daily half's, never the week's added on",
    got: () =>
      totalDeficit(
        readDay(M_RULE, streakContext(project(M_RULE, {})), both(30, 9), MON),
      ),
    want: 1,
  },
  {
    name: "a weekly condition beside daily ones still leaves the rule a benchmark",
    got: () =>
      benchmarkBar(M_RULE, streakContext(project(M_RULE, {}))) === null,
    want: true,
  },
  {
    /* With two scales in one rule, a line that does not name its own period
       is a line you cannot read: `at most 1` is a different promise by the
       day and by the week. */
    name: "a weekly condition names its period in its own sentence",
    got: () =>
      clauseSentence(M_WEEK, streakContext(project(M_RULE, {})), "week"),
    want: "“Youtube” at most “1” time a week",
  },
  {
    name: "and a daily one is unchanged to the character",
    got: () =>
      clauseSentence(M_DAY, streakContext(project(M_RULE, {})), "day"),
    want: "“Lessons” at least “1h”",
  },
  {
    name: "moving a condition between the scales is a loosening until proved otherwise",
    got: () => {
      const ctx = streakContext(project(M_RULE, {}))
      const next: StreakRule = {
        ...M_RULE,
        clauses: [M_DAY, { ...M_WEEK, scope: "day" } as StreakClause],
      }
      return isNarrowing(M_RULE, next, ctx)
    },
    want: false,
  },
]

/* ---- what the run is worth, and what it seals as — `spec 025` -----------

   `current` is the run as things stand, and as things stand is the one state
   it cannot describe. It reads `36` until the midnight it reads `0`; and it
   reads `0` the moment a day you can still write to breaks, which is
   indistinguishable from a run that ended in March and is gone. `atStake` and
   `facing` are the two ends of that, and the counter draws the pair only
   while they disagree. */

const S_TODAY: DayKey = "2026-08-31"          // a Monday
const S_START: DayKey = "2026-08-27"
const S_RULE: StreakRule = {
  ...ruleOf(
    { id: "c", ...target("activity", "a-les"), min: 60 } as unknown as StreakClause,
    "day",
  ),
  startedOn: S_START,
  inDayVerdict: true,
}

/** The five days, each either an hour and a half of lessons or nothing. */
const runOf = (...minutes: number[]): string => {
  const days: Record<DayKey, Day> = {}
  minutes.forEach((m, i) => {
    days[toKey(addDays(fromKey(S_START), i))] = studied(m)
  })
  const k = keptDays(project(S_RULE, days), new Date(`${S_TODAY}T14:00:00`))
  return k ? `${k.atStake}→${k.facing} (${k.current})` : "none"
}

const STREAKS: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "today is not done yet — four to lose, nought if it seals like this",
    got: () => runOf(90, 90, 90, 90, 0),
    want: "4→0 (4)",
  },
  {
    /* The case the pair was actually asked for: the run has **already** gone
       to nought, and the day that took it is still inside the window. The
       old figure said `0` and nothing else, which is what a run lost a month
       ago says. */
    name: "yesterday broke and can still be written to",
    got: () => runOf(90, 90, 90, 0, 90),
    want: "5→1 (1)",
  },
  {
    name: "a break the horizon has passed is gone, and says so plainly",
    got: () => runOf(90, 90, 0, 90, 90),
    want: "2→2 (2)",
  },
  {
    name: "a day finished is a day counted, and nothing is at stake",
    got: () => runOf(90, 90, 90, 90, 90),
    want: "5→5 (5)",
  },
]

/* ---- a reward can ask for more than points — `spec 025` ----------------- */

const REWARD = {
  id: "sh",
  label: "Record player",
  color: "#888",
  iconName: "Circle",
  price: 100,
  createdOn: MON,
  lockedUntil: MON,
}

const ACH = [
  { id: "a1", label: "A", color: "#888", iconName: "Circle" },
] as unknown as Parameters<typeof canBuy>[2]

const REWARDS: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "points alone still buy what asks for points alone",
    got: () => canBuy(REWARD as never, 100),
    want: true,
  },
  {
    name: "an unearned requirement holds it back however rich you are",
    got: () => canBuy({ ...REWARD, requires: ["a1"] } as never, 500, ACH, {}),
    want: false,
  },
  {
    name: "and lets go once it has been earned",
    got: () =>
      canBuy({ ...REWARD, requires: ["a1"] } as never, 500, ACH, {
        a1: { achievementId: "a1", earnedAt: "x" },
      } as never),
    want: true,
  },
  {
    name: "a requirement pointing at nothing is not a locked door",
    got: () => canBuy({ ...REWARD, requires: ["gone"] } as never, 100, ACH, {}),
    want: true,
  },
  {
    name: "and a reward that asks for nothing at all is still not a reward",
    got: () => canBuy({ ...REWARD, price: 0 } as never, 100, ACH, {}),
    want: false,
  },
  {
    name: "but one gated on an achievement may cost no points",
    got: () =>
      canBuy({ ...REWARD, price: 0, requires: ["a1"] } as never, 0, ACH, {
        a1: { achievementId: "a1", earnedAt: "x" },
      } as never),
    want: true,
  },
]


/* ---- what a sealed day is worth, and what it was worth then — `spec 026` --

   Two lies in opposite directions, and the same cause: a rule's terms are
   mutable and its past was judged with whatever they are now. Tighten a rule
   and a history you kept honestly turns red; loosen one and a history you
   broke turns green. The ledger answers the first, the revisions answer the
   second, and the cascade is the order they are asked in.

   The cases that matter are the boundaries — what counts as history — because
   an engine that gets the *rule* right and the *boundary* wrong applies a
   promise made on Wednesday to next week and never to this one.
-------------------------------------------------------------------------- */

const V_TODAY: DayKey = "2026-09-07" // a Monday
const V_YEST: DayKey = "2026-09-06" // still inside the writing window
const V_OLD: DayKey = "2026-08-24" // a Monday, long sealed
const V_CHANGED: DayKey = "2026-08-26" // the Wednesday of that week

const easyClause = () =>
  ({ id: "c", ...target("activity", "a-les"), min: 60 }) as unknown as StreakClause
const hardClause = () =>
  ({ id: "c", ...target("activity", "a-les"), min: 180 }) as unknown as StreakClause

const revisionAt = (from: DayKey, clause: StreakClause): RuleRevision => ({
  from,
  scope: "day",
  clauses: [clause],
  freezesPerWeek: 0,
  freezeCap: 0,
})

/** The rule as it stands now: three hours. It asked for one until `from`. */
const tightened = (from: DayKey, scope: "day" | "week" = "day"): StreakRule => ({
  ...ruleOf(hardClause(), scope),
  startedOn: V_OLD,
  inDayVerdict: true,
  revisions: [
    { ...revisionAt(V_OLD, easyClause()), scope },
    { ...revisionAt(from, hardClause()), scope },
  ],
})

/** The same rule with no history recorded — how it read before `spec 026`. */
const noHistory = (rule: StreakRule): StreakRule => {
  const copy = { ...rule }
  delete copy.revisions
  return copy
}

const marked = (p: Project, marks: Record<DayKey, boolean>): Project =>
  ({
    ...p,
    dayLedger: Object.fromEntries(
      Object.entries(marks).map(([date, kept]) => [
        date,
        { date, kept, sealedAt: "x" },
      ]),
    ),
  }) as unknown as Project

const stateOnOld = (
  rule: StreakRule,
  day: Day,
  marks?: Record<DayKey, boolean>,
) => {
  const base = project(rule, { [V_OLD]: day })
  const p = marks ? marked(base, marks) : base
  return dayReport(p, V_OLD, V_TODAY).state
}

/** The fixture's own context — the same lists every case here reads. */
const V_CTX = streakContext(project(ruleOf(easyClause(), "day"), {}))

/** The mirror of `tightened`: three hours until today, one from today on. */
const loosened = (): StreakRule => ({
  ...ruleOf(easyClause(), "day"),
  startedOn: V_OLD,
  inDayVerdict: true,
  revisions: [
    revisionAt(V_OLD, hardClause()),
    revisionAt(V_TODAY, easyClause()),
  ],
})

const SEALED: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "a marked day keeps its verdict when the terms are tightened",
    got: () => stateOnOld(tightened(V_TODAY), studied(120), { [V_OLD]: true }),
    want: "kept",
  },
  {
    // The half nobody reports, because it arrives as good news.
    name: "and when they are loosened — a broken past is not bought back",
    got: () => stateOnOld(loosened(), studied(120), { [V_OLD]: false }),
    want: "missed",
  },
  {
    /* The ledger holds one boolean; two of the five states hold up. Read
       alone it would turn every freeze you ever bought plain green.

       The day has to be **broken under the terms it was held to** for there
       to be a freeze to see, so this is the loosened rule: three hours then,
       one now, and two hours logged. */
    name: "a frozen day keeps its colour rather than turning plain kept",
    got: () =>
      stateOnOld(
        loosened(),
        { ...studied(120), ruleFreezes: ["r"] } as unknown as Day,
        { [V_OLD]: true },
      ),
    want: "frozen",
  },
  {
    name: "an unmarked past day is judged by the terms in force on it",
    got: () => stateOnOld(tightened(V_TODAY), studied(120)),
    want: "kept",
  },
  {
    // The same day and the same figures with the history taken away: this is
    // what the report was, and what every drawing in the app agreed with.
    name: "and by today's terms when there is no history to read",
    got: () => stateOnOld(noHistory(tightened(V_TODAY)), studied(120)),
    want: "missed",
  },
  {
    // Tier 3. Yesterday is not history — it is a day you can still write to,
    // so the promise that applies to it is the one you have now.
    name: "yesterday takes the terms as they are, not as they were",
    got: () =>
      dayReport(
        project(tightened(V_TODAY), { [V_YEST]: studied(120) }),
        V_YEST,
        V_TODAY,
      ).state,
    want: "missed",
  },
  {
    /* A week's terms are read off its **last** day. Off its Monday, a
       revision landing on the Wednesday would judge the week after this one
       and never this one — and worse, such a week would be judged by the new
       terms while it was open and by the old ones the moment it sealed, so
       its verdict would flip on the Tuesday after with nothing having
       happened. */
    name: "a sealed week takes the terms that arrived inside it",
    got: () =>
      ruleClauses(
        ruleHeldOnWeek(
          tightened(V_CHANGED, "week"),
          startOfWeek(fromKey(V_OLD)),
          new Date(`${V_TODAY}T12:00:00`),
          V_CTX,
        ),
      )[0]?.min,
    want: 180,
  },
  {
    name: "and the week you are living in takes the terms you have now",
    got: () =>
      ruleClauses(
        ruleHeldOnWeek(
          tightened(V_TODAY, "week"),
          startOfWeek(fromKey(V_TODAY)),
          new Date(`${V_TODAY}T12:00:00`),
          V_CTX,
        ),
      )[0]?.min,
    want: 180,
  },
]

/* ---- the record itself — `spec 026`, part 2 ----------------------------- */

const E_TODAY = new Date("2026-09-07T12:00:00")
const E_PREV: StreakRule = {
  ...ruleOf(easyClause(), "day"),
  startedOn: V_OLD,
  lockedUntil: V_OLD,
  inDayVerdict: true,
}
const edited = (draft: StreakRule, prev = E_PREV) =>
  ruleEdit(prev, draft, V_CTX, E_TODAY)

const REVISIONS: { name: string; got: () => unknown; want: unknown }[] = [
  {
    /* Two entries, not one: appending only the new set would leave the
       implicit first resolving to "current", and the terms it replaced would
       be gone at the moment they became history. */
    name: "an edit records the new terms and the ones they replaced",
    got: () =>
      (edited({ ...E_PREV, clauses: [hardClause()] }).next.revisions || [])
        .map((r) => `${r.from}:${r.clauses[0].min}`)
        .join(" | "),
    want: `${V_OLD}:60 | 2026-09-07:180`,
  },
  {
    // A revision says which days it judged. Two dated one day judge nothing
    // between them, so the fourth adjustment of an afternoon replaces the
    // third rather than growing a log nobody can read.
    name: "a second edit the same day replaces rather than appends",
    got: () => {
      const once = edited({ ...E_PREV, clauses: [hardClause()] }).next
      const twice = edited(
        {
          ...once,
          clauses: [{ ...hardClause(), min: 240 } as unknown as StreakClause],
        },
        once,
      ).next
      return (twice.revisions || [])
        .map((r) => `${r.from}:${r.clauses[0].min}`)
        .join(" | ")
    },
    want: `${V_OLD}:60 | 2026-09-07:240`,
  },
  {
    name: "a rename is not an edit to the terms and records nothing",
    got: () => edited({ ...E_PREV, label: "Renamed" }).next.revisions,
    want: undefined,
  },
  {
    // The day a rule is written is one sentence being written, not a rule
    // changing its mind — and it has judged nothing a history could be about.
    name: "the day a rule is written records nothing",
    got: () =>
      edited(
        { ...E_PREV, startedOn: V_TODAY, clauses: [hardClause()] },
        { ...E_PREV, startedOn: V_TODAY },
      ).next.revisions,
    want: undefined,
  },
  {
    // A loosening inside the lock is refused outright, and a refusal hands
    // back the rule untouched — so there is nothing to record.
    name: "a refused loosening records nothing",
    got: () => {
      const locked: StreakRule = { ...E_PREV, lockedUntil: "2026-12-31" }
      const out = edited(
        {
          ...locked,
          clauses: [{ ...easyClause(), min: 10 } as unknown as StreakClause],
        },
        locked,
      )
      return `${out.allowed}, ${JSON.stringify(out.next.revisions)}`
    },
    want: "false, undefined",
  },
  {
    name: "the day a revision begins is judged by it, not by the one before",
    got: () =>
      ruleClauses(ruleAsOf(tightened(V_CHANGED), V_CHANGED, V_CTX))[0]?.min,
    want: 180,
  },
  {
    name: "and the day before it is not",
    got: () =>
      ruleClauses(ruleAsOf(tightened(V_CHANGED), "2026-08-25", V_CTX))[0]?.min,
    want: 60,
  },
  {
    // The one case that fails the day somebody adds a field to the lock and
    // forgets the history. They are one function for exactly this reason.
    name: "the snapshot and the lock's string name the same fields",
    got: () =>
      JSON.stringify(termsSnapshot(E_PREV, V_CTX)) === termsOf(E_PREV, V_CTX),
    want: true,
  },
  {
    name: "a rule with no history reads as one revision, from its beginning",
    got: () => revisionsOf(E_PREV, V_CTX).map((r) => r.from).join(),
    want: V_OLD,
  },
]

/* ---- a day the project was told to look away from — `spec 026`, part 3 --

   `dueMarks` has always skipped these, so such a day never gets a mark and
   the composite run was being broken by the one day the project was told to
   ignore. This walk was the last reader of `makeIsIgnored` that never asked
   it. Deliberately a change of behaviour, and the number it reports can move
   upward on the day it ships.
-------------------------------------------------------------------------- */

const I_START: DayKey = "2026-08-24"
const I_TODAY: DayKey = "2026-08-27"

const ignoredRun = (ignore: boolean): number => {
  const rule: StreakRule = {
    ...ruleOf(easyClause(), "day"),
    startedOn: I_START,
    inDayVerdict: true,
  }
  const days: Record<DayKey, Day> = {
    [I_START]: studied(120),
    "2026-08-25": {
      ...studied(0),
      ...(ignore ? { ignore: true } : {}),
    } as unknown as Day,
    "2026-08-26": studied(120),
  }
  const k = keptDays(project(rule, days), new Date(`${I_TODAY}T14:00:00`))
  return k ? k.current : -1
}

const IGNORED: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "an ignored broken day no longer breaks the run",
    got: () => ignoredRun(true),
    want: 2,
  },
  {
    name: "and one nobody ignored still does",
    got: () => ignoredRun(false),
    want: 1,
  },
]

console.log("")
for (const test of RUNNING) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  running week: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  running week: ${test.name}`)
    console.log(`      got  ${JSON.stringify(got)}`)
    console.log(`      want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of MIXED) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  two scales: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  two scales: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of STREAKS) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  at stake: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  at stake: ${test.name}`)
    console.log(`      got ${got}, want ${test.want}`)
  }
}

console.log("")
for (const test of REWARDS) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  reward: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  reward: ${test.name}`)
    console.log(`      got ${got}, want ${test.want}`)
  }
}

console.log("")
for (const test of BENCHMARKS) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  benchmark: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  benchmark: ${test.name}`)
    console.log(`      got ${got}, want ${test.want}`)
  }
}


/* ---- the week a condition was written into — `spec 026`, part 7 ---------

   The first build took *«актуально с текущей недели»* literally and broke the
   current week on the spot: a ceiling written into a week already three days
   spent is a promise nobody was in a position to keep, and the run that ends
   at today collapsed to one whatever the thirty behind it said.

   `spec 018` had already argued this out for a weekly rule's partial first
   week and answered it — drawn, never tallied. What it could not reach was a
   condition added to an **old** rule, whose `startedOn` is months ago, and a
   **mixed** rule, which was exempted by its own daily half: `countsOn` was a
   boolean beside the drawn state, and a boolean can only say *all of this
   counts* or *none of it does*.
-------------------------------------------------------------------------- */

const F_TODAY: DayKey = "2026-09-09" // a Wednesday
const F_START: DayKey = "2026-07-27" // a Monday, weeks earlier

const F_DAILY = () =>
  ({ id: "f1", ...target("activity", "a-les"), min: 60 }) as unknown as StreakClause
/** At most ten hours a week of the other activity. */
const F_WEEKLY = () =>
  ({
    id: "f2",
    scope: "week",
    ...target("activity", "a-idle"),
    max: 600,
  }) as unknown as StreakClause

/** Every day: an hour and a half promised, four hours of the other thing. */
const F_DAYS: Record<DayKey, Day> = (() => {
  const out: Record<DayKey, Day> = {}
  for (
    let d = fromKey(F_START);
    toKey(d) <= "2026-09-20";
    d = addDays(d, 1)
  )
    out[toKey(d)] = {
      cells: {
        "s-am": [
          { id: "e1", activity: "a-les", minutes: 90 },
          { id: "e2", activity: "a-idle", minutes: 240 },
        ],
      },
    } as unknown as Day
  return out
})()

const F_RULE = (clauses: StreakClause[], startedOn = F_START): StreakRule =>
  ({
    ...ruleOf(clauses[0], "day"),
    clauses,
    startedOn,
    lockedUntil: startedOn,
    inDayVerdict: true,
  }) as StreakRule

const fProject = (rule: StreakRule): Project => {
  const base = project(rule, F_DAYS)
  return {
    ...base,
    activities: [
      ...ACTIVITIES,
      { id: "a-idle", label: "Did nothing", color: "#888", iconName: "Circle" },
    ],
  } as unknown as Project
}

/** The rule after a weekly ceiling is added to it today. */
const F_ADDED = (): StreakRule => {
  const prev = F_RULE([F_DAILY()])
  return ruleEdit(
    prev,
    { ...prev, clauses: [F_DAILY(), F_WEEKLY()] },
    streakContext(fProject(prev)),
    new Date(`${F_TODAY}T12:00:00`),
  ).next
}

const fRead = (rule: StreakRule, on: DayKey) =>
  dayReport(fProject(rule), on, on).readings[0]

const IN_FORCE: { name: string; got: () => unknown; want: unknown }[] = [
  {
    // The report, exactly: thirty-odd days, a ceiling written into a week
    // already over it, and the run must not notice.
    name: "the week it was written into does not break the run",
    got: () =>
      keptDays(fProject(F_ADDED()), new Date(`${F_TODAY}T12:00:00`))?.current,
    want: 45,
  },
  {
    /* And it is still **drawn**. `spec 018` argued that out: a ceiling is
       broken the moment something lands in the wrong slot, and hiding it
       would be a rule that says nothing on the day you most want it to. */
    name: "but it is still drawn as broken on the day it was crossed",
    got: () => {
      const r = fRead(F_ADDED(), F_TODAY)
      return `${r?.state} / ${r?.counted}`
    },
    want: "missed / met",
  },
  {
    name: "the first whole week under it is judged like any other",
    got: () => {
      const r = fRead(F_ADDED(), "2026-09-16")
      return `${r?.state} / ${r?.counted}`
    },
    want: "missed / missed",
  },
  {
    // The hole a mixed rule fell through: `countsOn` said "a rule with any
    // daily condition always counts", so the weekly half's partial week was
    // carried into the tally by the daily half standing beside it.
    name: "a mixed rule's daily half votes through its weekly half's first week",
    got: () => {
      // Written on a Wednesday, so its first week is three days long; the
      // ceiling is crossed on the Friday.
      const r = fRead(F_RULE([F_DAILY(), F_WEEKLY()], "2026-09-02"), "2026-09-04")
      return `${r?.state} / ${r?.counted}`
    },
    want: "missed / met",
  },
  {
    // And the case that was already right stays right: nothing left to vote,
    // so the same break is drawn and the day has no verdict at all.
    name: "a purely weekly rule's partial first week is unchanged",
    got: () => {
      const r = fRead(F_RULE([F_WEEKLY()], "2026-09-02"), "2026-09-04")
      return `${r?.state} / ${r?.counted}`
    },
    want: "missed / watching",
  },
  {
    name: "a condition present from the start has no partial week of its own",
    got: () =>
      clauseInForceFrom(F_RULE([F_DAILY()]), "f1", V_CTX),
    want: F_START,
  },
  {
    name: "and one added today came into force today",
    got: () => clauseInForceFrom(F_ADDED(), "f2", V_CTX),
    want: F_TODAY,
  },
  {
    /* Dropped and written again is a **new** promise: the removal was a
       loosening and had to wait out the clock, and what it left behind is not
       a history the new one inherits. So the walk takes the current run of
       revisions carrying it, not its first appearance. */
    name: "a condition dropped and written again gets its grace back",
    got: () => {
      const rule = {
        ...F_RULE([F_DAILY(), F_WEEKLY()]),
        revisions: [
          { from: F_START, scope: "day", clauses: [F_DAILY(), F_WEEKLY()], freezesPerWeek: 0, freezeCap: 0 },
          { from: "2026-08-10", scope: "day", clauses: [F_DAILY()], freezesPerWeek: 0, freezeCap: 0 },
          { from: F_TODAY, scope: "day", clauses: [F_DAILY(), F_WEEKLY()], freezesPerWeek: 0, freezeCap: 0 },
        ],
      } as unknown as StreakRule
      return clauseInForceFrom(rule, "f2", V_CTX)
    },
    want: F_TODAY,
  },
]

/* ---- a lost week — `spec 027` -------------------------------------------

   The report, exactly: *at most 3 Pinterest a week, of which none at night*.
   A night slip on the Monday, paid for; the fourth on the Thursday, with
   nothing left to pay. The app drew the **Monday** red — `weekLostOn` filed
   the whole week on the first day any ceiling broke, then asked whether the
   week *as it now stands* was paid for — and the Thursday green, and counted
   the run from the day after the Monday.

   Every day that made a site worse now carries its own break, covered by what
   was paid on that site; a day after an unpaid one that added nothing is
   grey. Two of the first three cases fail against the old code. */

const FRI = KEYS[4]
const SAT = KEYS[5]
const SUN = KEYS[6]

/** One slip in a slot. */
const slip = (slotId = "s-am", n = 1): Day => counted("u-yt", slotId, n)

/** A day carrying receipts against rule `r`. */
const paidOn = (
  day: Day,
  ...receipts: { clauseId: string; slotId?: string; cost: number }[]
): Day =>
  ({
    ...day,
    ruleFreezes: receipts.map((r) => ({ ruleId: "r", boughtAt: "x", ...r })),
  }) as unknown as Day

/** What each day of the fixture week reads, Monday first. */
const weekRow = (rule: StreakRule, days: Record<DayKey, Day>): string => {
  const ctx = streakContext(project(rule, days))
  return KEYS.map((k) => ruleWeekDayState(rule, ctx, days, k, TODAY)).join(" ")
}

const PIN_RULE = ruleOf(
  {
    id: "c",
    ...target("unit", "u-yt"),
    max: 3,
    slots: { "s-pm": { max: 0 } },
  } as unknown as StreakClause,
  "week",
)
const PIN_DAYS: Record<DayKey, Day> = {
  [MON]: paidOn(slip("s-pm"), { clauseId: "c", slotId: "s-pm", cost: 1 }),
  [TUE]: slip(),
  [WED]: slip(),
  [THU]: slip(),
  [SAT]: slip(),
}

const ZERO = { id: "c", ...target("unit", "u-yt"), max: 0 } as unknown as StreakClause
const ZERO_WEEK = { ...ruleOf(ZERO, "week"), freezesPerWeek: 1 } as StreakRule

const TIME_WEEK = ruleOf(
  { id: "c", ...target("activity", "a-les"), max: 120 } as unknown as StreakClause,
  "week",
)
const TIME_DAYS: Record<DayKey, Day> = {
  [MON]: paidOn(studied(150), { clauseId: "c", cost: 1 }),
  [WED]: studied(30),
}

/** A rule's own figure on a Monday afternoon, four days in. */
const ruleRun = (clause: object, days: Record<DayKey, Day>): string => {
  const rule = {
    ...ruleOf(clause as StreakClause, "day"),
    startedOn: S_START,
    lockedUntil: S_START,
    freezesPerWeek: 1,
  } as StreakRule
  const s = ruleStatus(rule, project(rule, days), new Date(`${S_TODAY}T14:00:00`))
  return `${s.atStake}→${s.facing} (${s.current})`
}

const LOST: { name: string; got: () => unknown; want: unknown }[] = [
  {
    name: "the report's week, day by day — the bought night stays blue",
    got: () => weekRow(PIN_RULE, PIN_DAYS),
    want: "frozen met met missed lost missed lost",
  },
  {
    name: "six freezes, a slip a day: six blue days and the seventh red",
    got: () =>
      weekRow(ZERO_WEEK, {
        [MON]: paidOn(
          slip(),
          ...Array.from({ length: 6 }, () => ({ clauseId: "c", cost: 1 })),
        ),
        [TUE]: slip(),
        [WED]: slip(),
        [THU]: slip(),
        [FRI]: slip(),
        [SAT]: slip(),
        [SUN]: slip(),
      }),
    want: "frozen frozen frozen frozen frozen frozen missed",
  },
  {
    // It was listed as `already frozen` and could not be bought at all.
    name: "a paid site that grew is offered at the difference",
    got: () => {
      // Two a week: the first receipt spends one, and the top-up needs the other.
      const rule = { ...ZERO_WEEK, freezesPerWeek: 2 } as StreakRule
      const days = { [MON]: paidOn(slip(), { clauseId: "c", cost: 1 }), [TUE]: slip() }
      const proj = project(rule, days)
      const now = new Date(`${SUN}T12:00:00`)
      const status = ruleStatus(rule, proj, now)
      return freezeOffers(rule, proj, MON, SUN, status)
        .map((o) => `${o.cost}/${o.frozen}/${o.ok}`)
        .join(" ")
    },
    want: "1/false/true",
  },
  {
    name: "a weekly time ceiling costs one per day that made it worse",
    got: () =>
      weekViolationsOn(
        TIME_WEEK,
        streakContext(project(TIME_WEEK, TIME_DAYS)),
        TIME_DAYS,
        WEEK,
        TODAY,
      )[0]?.cost,
    want: 2,
  },
  {
    name: "and the day that added nothing costs nothing",
    got: () => weekRow(TIME_WEEK, TIME_DAYS).split(" ").slice(0, 3).join(" "),
    want: "frozen met missed",
  },
  {
    name: "a weekly floor breaks on the day it stopped being reachable",
    got: () =>
      weekRow(
        ruleOf(
          { id: "c", ...target("unit", "u-gym"), min: 3 } as unknown as StreakClause,
          "week",
        ),
        {},
      ),
    want: "met met met met missed lost lost",
  },
  {
    name: "grey days neither grow the composite nor break it",
    got: () =>
      keptDays(project(ZERO_WEEK, { [TUE]: slip() }), new Date(`${TODAY}T12:00:00`))
        ?.current,
    want: 8,
  },
  {
    name: "a grey day gets no mark, so it pays nothing",
    got: () => {
      const base = project(ZERO_WEEK, { [TUE]: slip() })
      const proj = {
        ...base,
        settings: { ...base.settings, balanceStart: MON },
      } as unknown as Project
      return dueMarks(proj, new Date(`${TODAY}T12:00:00`))
        .filter((m) => m.date <= SUN)
        .map((m) => `${m.date === MON ? "MON" : m.date === TUE ? "TUE" : m.date}:${m.kept}`)
        .join(" ")
    },
    want: "MON:true TUE:false",
  },
  {
    name: "a rule's own streak says what a spent break has at stake",
    got: () => ruleRun(ZERO, { [S_TODAY]: slip() }),
    want: "4→0 (4)",
  },
  {
    name: "and drops the pair once nothing can buy it back",
    got: () => {
      const rule = {
        ...ruleOf(ZERO, "day"),
        startedOn: S_START,
        lockedUntil: S_START,
      } as StreakRule
      const days = { [S_TODAY]: slip() }
      const s = ruleStatus(rule, project(rule, days), new Date(`${S_TODAY}T14:00:00`))
      return JSON.stringify([runShown(s, false), runShown(s, true)])
    },
    want: '[{"now":0,"was":4},{"now":0,"was":null}]',
  },
  {
    // Only a settled break draws the pair; a floor still owed is an errand.
    name: "a floor still owed this afternoon is not a break",
    got: () =>
      ruleRun(
        { id: "c", ...target("activity", "a-les"), min: 60 },
        Object.fromEntries(
          [0, 1, 2, 3].map((i) => [toKey(addDays(fromKey(S_START), i)), studied(90)]),
        ),
      ),
    want: "4→4 (4)",
  },
]

console.log("")
for (const test of SEALED) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  sealed: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  sealed: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of REVISIONS) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  revision: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  revision: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of IGNORED) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  ignored: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  ignored: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of IN_FORCE) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  in force: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  in force: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
for (const test of LOST) {
  const got = test.got()
  if (got === test.want) {
    console.log(`${GREEN}  ok${OFF}  lost week: ${test.name}`)
  } else {
    failed += 1
    console.log(`${RED}FAIL${OFF}  lost week: ${test.name}`)
    console.log(`      got ${JSON.stringify(got)}, want ${JSON.stringify(test.want)}`)
  }
}

console.log("")
if (failed) {
  console.log(`${RED}${failed} failing${OFF}${deferred ? `, ${deferred} deferred` : ""}`)
  process.exit(1)
}
console.log(
  `${GREEN}all ${REMOVALS.length + BALANCES.length + CASES.length + RISKS.length + MASKS.length + DUES.length + READS.length + LOCKS.length + PROGRESS.length + A_LOCKS.length + SEALS.length + FROZEN.length + REFUSED.length + IMPOSSIBLE.length + POSSIBLE.length + PARTIALS.length + WEEK_READS.length + FRESH.length + SPLITS.length + WEEK_SPLITS.length + PAID.length + OFFERS.length + LEDGERS.length + ADDITIONS.length + BENCHMARKS.length + ACCEPTED.length + SENTENCES.length + FOLDS.length + RUNNING.length + REWARDS.length + MIXED.length + STREAKS.length + SEALED.length + REVISIONS.length + IGNORED.length + IN_FORCE.length + LOST.length} pass${OFF}${deferred ? `, ${deferred} deferred` : ""}`,
)
