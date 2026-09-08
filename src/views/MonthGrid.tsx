/* ---------------------------------------------------------------
   Month grid — one rounded block per week, its seven compact day cells
   below a summary strip.
--------------------------------------------------------------- */

import { EyeOff, Snowflake } from "lucide-react"
import type {
  Activity,
  Category,
  CounterUnit,
  Day,
  DayKey,
  Settings,
  Slot,
} from "../types/model"
import { t, useLocale } from "../lib/i18n"
import type { Palette } from "../lib/theme"
import {
  fromKey,
  pad,
  startOfWeek,
  toKey,
  toRoman,
} from "../lib/date"
import { fmtHours } from "../lib/time"
import type { DayReport, DayVerdict } from "../lib/dayVerdict"
import { asOutcome, foldVerdicts } from "../lib/dayVerdict"
import {
  buildTooltip,
  dayBreakdown,
  goalForDate,
  makeIsIgnored,
  rangeStats,
} from "../lib/stats"
import { counterTotalsIn } from "../lib/counters"
import { activityMinutesIn } from "../lib/stats"
import { btnBase, cellSurface, dayStateSurface } from "../lib/theme"
import { unitDayTotal } from "../lib/counters"
import { RenderIcon } from "../ui/icons"
import { VerdictBar } from "./VerdictRing"

/** How many counter dots a month cell can carry before the rest become a
 *  count. Three fits beside the freeze and sleep marks at every width the
 *  grid is drawn at, including a phone column. */
const DOTS_SHOWN = 3
import { Tip } from "../ui/Tip"
import { CounterGroupList } from "./CounterTotals"
import { periodCounterGroups } from "../lib/periodCounters"
import type {
  CounterGroup,
  CounterGrouping,
} from "../lib/periodCounters"
import { usePalette } from "../ui/useTheme"

/* A getter: a module-level array is built once at import and would stay
   English for the life of the page. */
const weekdayHeads = () =>
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => t(d))

const stateColor = (
  c: Palette,
): Record<"met" | "frozen" | "missed", string> => ({
  met: c.goalMet,
  frozen: c.freeze,
  missed: c.exam,
})

const weekDotTip = (state: "met" | "frozen" | "missed"): string =>
  t(
    {
      met: "Every day of this week hit its goal",
      frozen: "A day was missed, but a streak freeze covered it",
      missed: "A day was missed with no freeze on it",
    }[state],
  )

/**
 * The caption above each week row — and, under it, what the week counted.
 *
 * A line for as long as it could be one. Once activities, tallies and checks
 * all reported, a flat run of chips on the end of that line ran off the right
 * edge of the grid, so the counters moved underneath and took the same
 * arrangement the period's own heading gives them: grouped, one heading per
 * line, obeying the same folds. It is a block now rather than a strip, which
 * is also what the extra room between the weeks is for.
 *
 * No fill of its own — the goal outcome reads as a dot beside the hours,
 * which leaves the rounded corners to the block of days below where they
 * belong.
 */
function WeekSummaryStrip({
  total,
  goal,
  ignored,
  state,
  ordinal,
  groups,
}: {
  /** Null when no benchmark is nominated: no hours are drawn at all. */
  total: number | null
  goal: number
  ignored: boolean
  /** By days, not by summed hours — see lib/dayVerdict. */
  state: DayVerdict
  ordinal: number
  /** Grouped and folded from the period heading, which owns both switches. */
  groups: CounterGroup[]
}) {
  const c = usePalette()
  const met = !ignored && goal > 0 && total !== null && total >= goal
  const goalOutcome = ignored ? null : asOutcome(state)
  return (
    <div className={`px-1 pb-1.5 ${ignored ? "opacity-60" : ""}`}>
    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
      {/* Everything that describes the week sits on the left, so the eye finds
          the same information in the same place on every row; the rule fills
          whatever is left over. */}
      <span className="text-ink/45 flex items-center gap-1 shrink-0">
        Week {toRoman(ordinal)} {ignored && <EyeOff size={9} />}
      </span>
      <span
        className="font-bold shrink-0"
        style={met ? { color: c.goalMet } : undefined}
      >
        {total === null ? "" : total > 0 ? fmtHours(total) : "—"}
      </span>
      {goal > 0 && total !== null && (
        <span className="text-ink/40 shrink-0">of {fmtHours(goal)}</span>
      )}
      {goalOutcome && (
        <Tip text={weekDotTip(goalOutcome)}>
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: stateColor(c)[goalOutcome] }}
          />
        </Tip>
      )}
      {/* The rule runs out to the right edge, which is what makes the week's
          summary read as a heading for the days under it. */}
      <span className="flex-1 border-b border-dotted border-ink/15" />
    </div>
      {/* The same groups as the period heading's, obeying the same folds and
          wearing the same recessed surface — one pair of switches for both,
          since they are one question asked twice, and one surface so a week's
          counters read as the same sort of block wherever they appear. */}
      {groups.length > 0 && (
        <div className="mt-2 rounded-2xl bg-ink/[0.04] px-3 py-2.5">
          <CounterGroupList groups={groups} />
        </div>
      )}
    </div>
  )
}

function CompactDayCell({
  date,
  entry,
  slots,
  activities,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  ignored,
  counterUnits,
  verdict,
  measured,
  onEdit,
}: {
  date: Date
  entry?: Day
  slots: Slot[]
  activities: Activity[]
  counterUnits: CounterUnit[]
  goal: number
  isToday: boolean
  isFuture: boolean
  isBeforeStart: boolean
  ignored: boolean
  /** How the day came out, across every rule with a vote on it. */
  verdict: DayReport
  /** The benchmark's own reading of this day, or null when nothing is
   *  nominated — see `benchmarkDayOf`. */
  measured: number | null
  /** Absent for a day that has not happened — nothing to open, so the cell
   *  is inert rather than opening an editor for a day you cannot log. */
  onEdit?: () => void
}) {
  const c = usePalette()
  if (isBeforeStart) {
    return (
      <div
        className="h-16 sm:h-28 flex items-start p-1 sm:p-2 sm:rounded-xl"
        style={cellSurface(`${c.ink}0A`, c.page)}
      >
        <span className="font-mono text-[10px] sm:text-xs text-ink/25">
          {date.getDate()}
        </span>
      </div>
    )
  }

  /* The slot split is always everything — it answers *where did the time go*.
     The headline figure is the benchmark's, for the reason `DayCard` gives. */
  const { bySlot, total: logged } = dayBreakdown(entry, slots)
  const total = measured ?? logged
  const tooltip = ignored
    ? `${buildTooltip(entry, slots, activities, counterUnits)}\n\nIgnored in statistics`
    : buildTooltip(entry, slots, activities, counterUnits)
  const metGoal = !ignored && goal > 0 && total >= goal
  const goalOutcome = ignored ? null : asOutcome(verdict.state)
  const touched = counterUnits.filter(
    (u) => unitDayTotal(entry?.counters, u.id) > 0,
  )

  return (
    <Tip text={tooltip} multiline className="w-full">
      <div
        role={onEdit ? "button" : undefined}
        tabIndex={onEdit ? 0 : undefined}
        onClick={onEdit}
        onKeyDown={onEdit ? (e) => e.key === "Enter" && onEdit() : undefined}
        className={`${btnBase} text-left w-full p-1 sm:p-2 h-16 sm:h-28 flex flex-col justify-between sm:rounded-xl ${
          onEdit ? "hover:brightness-95 sm:hover:shadow-md cursor-pointer" : ""
        } ${ignored ? "grayscale opacity-60" : ""} ${
          isFuture ? "opacity-50" : ""
        }`}
        // The goal tint is translucent, so it needs an opaque base of its own.
        // Without one it picked up whatever sat behind the cell — the page on
        // desktop, the seam colour of the phone grid — and the same day came
        // out two different shades on the two layouts.
        style={{
          ...dayStateSurface(c, goalOutcome, ignored),
          ...(isToday
            ? { outline: `2px solid ${c.accent}`, outlineOffset: "-2px" }
            : {}),
        }}
      >
        <div className="flex items-start justify-between">
          <span
            className={`font-mono text-xs ${isToday ? "font-extrabold" : ""}`}
            style={isToday ? { color: c.accent } : undefined}
          >
            {date.getDate()}
          </span>
          <div className="flex items-center gap-1">
            {ignored && <EyeOff size={11} className="text-ink/35" />}
            {verdict.state === "frozen" && (
              <Tip text={t("Streak freeze used")}>
                <Snowflake size={11} style={{ color: c.freeze }} />
              </Tip>
            )}
            {/* A dot per unit the day touched, in the unit's own colour. A
                month cell has no room for numbers, so the count is in the
                tooltip and the presence is the signal.

                **Capped, with the rest as a count.** A project with a dozen
                counters put a dozen dots on one 16px line and they marched
                straight out of the cell. Scrolling was the other option and is
                worse here: a scroll strip that narrow has no affordance, and
                nobody scrolls a calendar square. The cell's own tooltip
                already lists everything, so the overflow only has to say that
                there *is* more. */}
            {touched.slice(0, DOTS_SHOWN).map((u) => (
                <Tip
                  key={u.id}
                  text={`${unitDayTotal(entry?.counters, u.id)} × ${u.label}`}
                >
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded-full"
                    style={{ backgroundColor: u.color }}
                  >
                    <RenderIcon
                      name={u.iconName}
                      size={9}
                      style={{ color: c.onFill }}
                    />
                  </span>
                </Tip>
            ))}
            {touched.length > DOTS_SHOWN && (
              <span className="text-[8px] font-mono text-ink/40 shrink-0">
                +{touched.length - DOTS_SHOWN}
              </span>
            )}
          </div>
        </div>

        {/* Which rules held, one segment each, directly under the number.

            The ring the day cards wear cannot come here: at the sixteen pixels
            a month cell can spare, five arcs and their gaps are a smudge. A
            bar survives being small, and it gains something the ring can never
            have — a fixed left edge, so a column of days reads vertically and
            "the second rule broke three times this week" becomes a thing you
            can see rather than a thing you count. */}
        <VerdictBar report={verdict} />

        {/* Per-slot minutes need more room than a phone column has; on small
            screens the slots collapse to coloured dots and the hours below
            carry the number. */}
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          {slots.map((s) =>
            bySlot[s.id] > 0 ? (
              <span
                key={s.id}
                className="flex items-center gap-0.5 text-[8px] font-mono font-bold"
                style={{ color: s.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="hidden sm:inline">{bySlot[s.id]}</span>
              </span>
            ) : null,
          )}
          {/* The dash means *nothing on this day*, which is `logged` — the
              benchmark's own figure can be nought on a day that is full. */}
          {logged === 0 && (
            <span className="text-[8px] font-mono text-ink/25">—</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono text-ink/70">
          <span
            className="truncate"
            style={
              metGoal ? { color: c.goalMet, fontWeight: 700 } : undefined
            }
          >
            {total > 0 ? fmtHours(total) : ""}
            {goal > 0 && (
              <span className="hidden sm:inline text-ink/30">
                /{fmtHours(goal)}
              </span>
            )}
          </span>

        </div>
      </div>
    </Tip>
  )
}

export function MonthGrid({
  cursor,
  days,
  slots,
  activities,
  settings,
  todayKey,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
  counterUnits,
  grouping,
  hiddenGroups,
  categories,
  verdictOf,
  benchmarkDayOf,
  benchmarkOf,
}: {
  cursor: Date
  days: Record<DayKey, Day>
  slots: Slot[]
  activities: Activity[]
  settings: Settings
  counterUnits: CounterUnit[]
  /** All three set from the period heading — see `CounterTotals`. */
  grouping: CounterGrouping
  hiddenGroups: Set<string>
  categories: Category[]
  todayKey: DayKey
  /** How each day came out — see `lib/dayVerdict`. Read, never computed here. */
  verdictOf: (key: DayKey) => DayReport
  /**
   * **One day, measured through the benchmark rule.** Null when nothing is
   * nominated, and then the day totals everything — the only answer there is.
   *
   * The same argument `benchmarkOf` makes for a week, and it became
   * load-bearing when `spec 024` moved sleep into the log: a card totalling
   * every minute against a goal one rule supplied reads `goal 3h (+3h 25m)`
   * on a day whose only entry was a night's sleep, which is the drawing
   * congratulating you for having gone to bed.
   */
  benchmarkDayOf: (dayKey: DayKey, day: Day | undefined) => number | null
  /**
   * A stretch of days as the **benchmark rule** counted it — `spec 019`.
   *
   * Null when nothing is nominated, and then the hours are not drawn at all.
   * Handed in rather than computed here, like `verdictOf`: this component sees
   * days and slots, not the project, and threading a whole project through it
   * to answer one question is how a drawing starts making judgements.
   */
  benchmarkOf: (dates: Date[]) => number | null
  onEditDay: (key: DayKey) => void
  weekIgnore?: Record<DayKey, boolean>
  monthIgnore?: Record<DayKey, boolean>
}) {
  // Nothing here reads `t` directly — `weekdayHeads` and `weekDotTip` do, and
  // they are plain functions. This is the subscription that re-runs them.
  useLocale()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${pad(month + 1)}`
  const monthIgnored = !!monthIgnore[monthKey]

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weekRows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7))

  const startDate = settings.startDate ? fromKey(settings.startDate) : null

  // Each week is its own block — summary and counters on top, its seven days
  // below — with real air between the weeks. The gaps sit *between* weeks
  // rather than around every cell: a per-cell gap plus inner padding on all
  // four sides is what left no room for seven columns on a phone, while one
  // gap per week costs almost nothing. Inside a week the days are still
  // separated by hairline seams (a 1px grid gap showing the tint through).
  //
  // The gap is wide because a week's summary now carries its counters as well:
  // at two lines of spacing the counters of one week sat closer to the next
  // week's days than to their own.
  return (
    <div>
      <div className="grid grid-cols-7 rounded-xl bg-ink/[0.04] text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-ink/45 text-center">
        {weekdayHeads().map((d) => (
          <div key={d} className="py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="space-y-6 mt-2">
      {weekRows.map((row, ri) => {
        /* **The numerator comes from the same rule as the denominator** —
           `spec 019`. `rangeStats` totals every minute logged whatever it went
           on, so `12h of 15h` compared a figure the benchmark promised against
           one nobody promised anything about: an activity called *Did nothing*
           with twenty hours in it reported twenty hours of work. Measured
           through the benchmark's own target instead, and absent entirely when
           nothing is nominated — the same silence the goal line already keeps,
           for the same reason. */
        const wTotal = benchmarkOf(row.filter(Boolean) as Date[])
        const { goal: wGoal } = rangeStats(
          row.filter(Boolean) as Date[],
          days,
          slots,
          settings,
          makeIsIgnored(weekIgnore, monthIgnore),
        )
        const firstDate = row.find(Boolean)
        const weekKey = firstDate ? toKey(startOfWeek(firstDate)) : null
        const weekIgnored =
          monthIgnored || (weekKey ? !!weekIgnore[weekKey] : false)
        // Only the days of this month that fall in the row, so a row split
        // across two months is judged on what it actually shows.
        const weekDatesInRow = row.filter(Boolean) as Date[]
        const weekState = foldVerdicts(
          weekDatesInRow.map((d) => verdictOf(toKey(d)).state),
        )
        const isIgnored = makeIsIgnored(weekIgnore, monthIgnore)
        const weekGroups = periodCounterGroups({
          activities,
          activityMinutes: activityMinutesIn(
            weekDatesInRow,
            days,
            slots,
            isIgnored,
          ),
          units: counterUnits,
          totals: counterTotalsIn(weekDatesInRow, days, isIgnored),
          categories,
          grouping,
        }).filter((g) => !hiddenGroups.has(g.id))
        return (
          <div key={ri}>
            <WeekSummaryStrip
              total={wTotal}
              goal={wGoal}
              ignored={weekIgnored}
              state={weekState}
              ordinal={ri + 1}
              groups={weekGroups}
            />
            {/* Phone: one rounded block, days separated by hairline seams —
                there is no width to spare for per-cell gaps. Desktop: real
                gaps and each day rounded on its own. */}
            <div className="grid grid-cols-7 gap-px sm:gap-2 rounded-xl overflow-hidden sm:overflow-visible sm:rounded-none bg-ink/10 sm:bg-transparent">
              {row.map((date, di) => {
                // Days outside the month read as absent on both layouts: on a
                // phone they take the page colour so they sit flush with the
                // background rather than showing as white tiles.
                if (!date)
                  return (
                    <div key={di} className="bg-page sm:bg-transparent" />
                  )
                const entry = days[toKey(date)]
                const dayIgnored = weekIgnored || !!entry?.ignore
                return (
                  <CompactDayCell
                    key={toKey(date)}
                    date={date}
                    entry={entry}
                    slots={slots}
                    activities={activities}
                    counterUnits={counterUnits}
                    goal={goalForDate(settings, date)}
                    isToday={toKey(date) === todayKey}
                    isFuture={toKey(date) > todayKey}
                    isBeforeStart={startDate ? date < startDate : false}
                    ignored={dayIgnored}
                    verdict={verdictOf(toKey(date))}
                    measured={benchmarkDayOf(toKey(date), entry)}
                    // Withheld for a day that has not happened: there is
                    // nothing to record about it, so the grid does not offer a
                    // way in. Same rule the week cards follow.
                    onEdit={
                      toKey(date) > todayKey
                        ? undefined
                        : () => onEditDay(toKey(date))
                    }
                  />
                )
              })}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
