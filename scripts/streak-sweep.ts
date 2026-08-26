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
  clauseAsksNothing,
  clauseSentence,
  readDay,
  readWeek,
  ruleDayState,
  ruleWeekState,
  streakContext,
} from "../src/lib/customStreaks"
import { toKey, weekDates } from "../src/lib/date"
import type {
  Activity,
  CounterUnit,
  Day,
  DayKey,
  Project,
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
  { id: "a-les", label: "Lessons", color: "#888", iconName: "Circle" },
] as Activity[]
const SLOTS = [
  { id: "s-am", label: "Morning", color: "#888", iconName: "Circle" },
  { id: "s-pm", label: "Evening", color: "#888", iconName: "Circle" },
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
    settings: { streakRules: [rule], dailyGoals: {} },
    slots: SLOTS,
    activities: ACTIVITIES,
    counterUnits: UNITS,
    days,
    weekNotes: {},
    monthNotes: {},
    weekIgnore: {},
    monthIgnore: {},
  }) as unknown as Project

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

const CASES: Case[] = [
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
]

/* ---- conditions that must be refused rather than judged ---------------- */

const REFUSED: { name: string; clause: object }[] = [
  { name: "no bound at all", clause: { id: "c", ...target("unit", "u-yt") } },
  { name: "a floor of nought", clause: { id: "c", ...target("unit", "u-yt"), min: 0 } },
  { name: "a floor of nought in time", clause: { id: "c", ...target("activity", "a-les"), min: 0 } },
  { name: "no accepted answer on any day", clause: { id: "c", ...checks("u-wake"), allow: {} } },
  { name: "a per-weekday map with nothing in it", clause: { id: "c", ...target("activity", "a-les"), days: {} } },
]

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
if (failed) {
  console.log(`${RED}${failed} failing${OFF}${deferred ? `, ${deferred} deferred` : ""}`)
  process.exit(1)
}
console.log(`${GREEN}all ${CASES.length + REFUSED.length} pass${OFF}${deferred ? `, ${deferred} deferred` : ""}`)
