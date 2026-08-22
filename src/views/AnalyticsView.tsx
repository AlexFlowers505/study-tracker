/* ---------------------------------------------------------------
   Analytics — the charts half of the page.

   Bounds come in from the shared period bar; this view owns no range picker
   of its own, and the all-time totals are passed in because the panel that
   shows them lives above, next to the log.
--------------------------------------------------------------- */

import { useCallback, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CounterUnit, Project, Slot, Tag } from '../types/model'
import { computeOverviewStats } from '../lib/analytics'
import type {
  CounterGroupBy,
  CounterPick,
  CounterSeries,
} from '../lib/counterSeries'
import { counterSeries, counterThings, seriesValue } from '../lib/counterSeries'
import {
  WEEKDAY_LABELS,
  addDays,
  WEEKDAY_ORDER,
  datesInRange,
  fmtShort,
  fromKey,
  pad,
  startOfWeek,
  toKey,
} from '../lib/date'
import { fmtAxisHours, fmtHoursChart, toHours } from '../lib/time'
import { dayBreakdown, goalForDate, makeIsIgnored } from '../lib/stats'
import { PALETTE, chartTooltip } from '../lib/theme'
import { ChartCard } from '../ui/ChartCard'
import { SegmentedControl } from '../ui/controls'
import { segBtn, segBtnStyle } from '../ui/buttonStyles'
import type { ChipItem } from '../ui/ToggleChips'
import { ToggleChips } from '../ui/ToggleChips'
import type { SeriesToggle } from '../ui/useSeriesToggle'
import { bulkToggleFor, useSeriesToggle } from '../ui/useSeriesToggle'
import { CountSeriesPicker } from './CountSeriesPicker'
import { AveragesStats } from './AveragesStats'
import { OverviewStats } from './OverviewStats'
import { PeriodTotals } from './PeriodTotals'
import { RemarkableStats } from './RemarkableStats'
import { TabbedSection } from './TabbedSection'

import { usePalette } from "../ui/useTheme"
/**
 * A chart row: the fixed axis fields plus one numeric series per slot or
 * category, keyed by id. Recharts reads them by string key, so the shape is
 * genuinely dynamic.
 */
type ChartRow = Record<string, string | number>

/** Accumulator keyed by slot or category id. */
type Sums = Record<string, number>

/* The Lessons series left with `spec 008`: lessons became a user-defined
   counter unit, and charting one hard-coded unit is exactly what that change
   was undoing. Per-unit series come back with the new statistics. */
const CHART_MODES = [
  { id: "hours", label: "Hours" },
  { id: "category", label: "Categories" },
  { id: "slot", label: "Slots" },
  { id: "tag", label: "Tags" },
  { id: "counter", label: "Counters" },
]

/** Counts, not minutes — a different axis, so it formats differently too. */
const isCount = (mode: string) => mode === "tag" || mode === "counter"

/** Count series carry their own; slots and categories all share one. */
const seriesOpacity = (s: object) =>
  "fillOpacity" in s ? (s as CounterSeries).fillOpacity : 0.55

const countSubtitle = (
  mode: string,
  groupBy: CounterGroupBy,
  bySlot: boolean,
  per: string,
) => {
  const what =
    mode === "counter"
      ? "Counts per counter"
      : groupBy === "tag"
        ? "Counts summed per tag"
        : "Counts per tagged counter"
  return `${what}, per ${per}${bySlot ? ", split by slot" : ""}`
}

/* The two sections this half of the page is made of.
 *
 * Named for what you learn, not for what you look at: everything in Summary is
 * the whole period collapsed into one figure, everything in Trends is the same
 * period spread across time. "Stats" and "Analytics" would have been two words
 * for the same thing — both halves are statistics; they differ only in how
 * they are drawn, and that is not the useful distinction to hang a heading on.
 */
const SUMMARY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "averages", label: "Averages" },
  { id: "remarkable", label: "Remarkable" },
]

const SUMMARY_CAPTIONS: Record<string, string> = {
  overview: "Totals for the selected period",
  averages: "Pace over the selected period",
  remarkable: "Best & worst, within the selected period, in hours",
}

const SUMMARY_HELP =
  "The selected period as single figures: how much time it holds and where " +
  "that time went, the average pace, and its best and worst days, weeks and " +
  "months. Days marked ignored count towards none of it."

const TREND_TABS = [
  { id: "daily", label: "Daily" },
  { id: "weekday", label: "Weekday" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]

const TRENDS_HELP =
  "The same period spread over time: hours per day, how the weekdays compare " +
  "with one another, and totals week by week and month by month. Each chart " +
  "can be split by slot or by category."

// Bounds come in from the shared period bar — analytics no longer owns a
// range picker of its own.
/**
 * The two extra questions a counter chart raises, and only it.
 *
 * "By tag or by counter" is absent in counter mode: grouping counters by
 * counter is the mode itself, so offering it would be a control with one
 * answer. "Split by slot" applies to both, because when in the day something
 * happened is a fair question about any count.
 */
/**
 * The two extra questions a counter chart raises, and only it.
 *
 * "By tag or by counter" is absent in counter mode: grouping counters by
 * counter is the mode itself, so offering it would be a control with one
 * answer. "Split by slot" applies to both, because when in the day something
 * happened is a fair question about any count.
 *
 * **One recessed track, divided down the middle**, and that shape is doing two
 * separate jobs. Against the mode control it reads as subordinate — that one
 * is raised off the card, this one is sunk into it — where a second identical
 * row of pills read as the same control drawn twice, which is the same trap
 * `TabbedSection` avoids by not being pills at all. And the hairline inside
 * separates the two questions from each other, which no amount of gap between
 * two identical tracks was ever going to do.
 */
function CountOptions({
  mode,
  groupBy,
  onGroupBy,
  bySlot,
  onBySlot,
}: {
  mode: string
  groupBy: CounterGroupBy
  onGroupBy: (g: CounterGroupBy) => void
  bySlot: boolean
  onBySlot: (v: boolean) => void
}) {
  const c = usePalette()
  const pill = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      aria-pressed={active}
      style={segBtnStyle(active, c)}
      className={segBtn(active)}
    >
      {label}
    </button>
  )

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
      {mode === "tag" && (
        <>
          {pill(groupBy === "tag", "By tag", () => onGroupBy("tag"))}
          {pill(groupBy === "counter", "By counter", () =>
            onGroupBy("counter"),
          )}
          <span className="self-stretch w-px my-1 mx-1 bg-ink/20" />
        </>
      )}
      {pill(!bySlot, "Whole day", () => onBySlot(false))}
      {pill(bySlot, "By slot", () => onBySlot(true))}
    </div>
  )
}

/**
 * What sits under a chart: its legend, and the control that shapes it.
 *
 * Two different controls, because the two modes ask opposite questions. A
 * whole-day chart draws every series there is, so the legend's job is taking
 * some away — chips you strike out. A by-slot chart draws only what you asked
 * for, so its job is adding — see `CountSeriesPicker` for why thirty-six chips
 * was not a legend.
 *
 * The choice lives here rather than at each of the four charts, which would be
 * the same three lines written four times and drifting apart on the fifth.
 */
function SeriesLegend({
  mode,
  series,
  toggle,
  groupBy,
  bySlot,
  units,
  tags,
  slots,
  picks,
  onPicks,
}: {
  mode: string
  series: ChipItem[]
  toggle: SeriesToggle
  groupBy: CounterGroupBy
  bySlot: boolean
  units: CounterUnit[]
  tags: Tag[]
  slots: Slot[]
  picks: CounterPick[]
  onPicks: (next: CounterPick[]) => void
}) {
  if (isCount(mode) && bySlot)
    return (
      <CountSeriesPicker
        things={counterThings(mode as "tag" | "counter", groupBy, units, tags)}
        slots={slots}
        picks={picks}
        onChange={onPicks}
      />
    )
  return (
    <ToggleChips
      items={series}
      hidden={toggle.hidden}
      onToggle={toggle.toggle}
      onBulk={bulkToggleFor(series, toggle)}
    />
  )
}

export function AnalyticsView({
  data,
  rangeStart,
  rangeEnd,
}: {
  data: Project
  rangeStart: Date
  rangeEnd: Date
}) {
  const c = usePalette()
  const {
    slots,
    categories,
    days,
    settings,
    counterUnits = [],
    weekIgnore = {},
    monthIgnore = {},
  } = data
  // Memoised because `seriesFor` depends on it: `settings.tags || []` is a
  // fresh array every render, which would rebuild every chart's series on
  // every keystroke anywhere on the page.
  const tags = useMemo(() => settings.tags || [], [settings.tags])

  // Applied once, up front, so every downstream stat and chart respects it.
  // Same predicate the log above uses — see makeIsIgnored.
  const isDayIgnored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )
  const rangeDates = useMemo(
    () => datesInRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  )
  const [summaryTab, setSummaryTab] = useState("overview")
  const [trendTab, setTrendTab] = useState("daily")
  // 'slot' | 'category' | 'hours'
  const [rawDailyMode, setDailyMode] = useState('slot')
  const [rawWeekdayMode, setWeekdayMode] = useState('hours')
  const [rawWeeklyMode, setWeeklyMode] = useState('hours')
  const [rawMonthlyMode, setMonthlyMode] = useState('hours')

  const goalsEnabled = settings?.goalsEnabled !== false

  // A stored choice can still say 'lessons' from before that mode existed, so
  // anything unrecognised falls back rather than rendering an empty chart.
  const known = (mode: string, to: string) =>
    CHART_MODES.some((m) => m.id === mode) ? mode : to
  const dailyMode = known(rawDailyMode, 'slot')
  const weekdayMode = known(rawWeekdayMode, 'hours')
  const weeklyMode = known(rawWeeklyMode, 'hours')
  const monthlyMode = known(rawMonthlyMode, 'hours')

  // Shared by all four charts rather than one pair each. They are not a
  // property of a chart, they are how you want counters read — and answering
  // the same question four times over is how two controls become eight.
  const [countGroupBy, setCountGroupBy] = useState<CounterGroupBy>("tag")
  const [countBySlot, setCountBySlot] = useState(false)
  /**
   * Which `thing × slot` pairs the by-slot charts draw, in the order they were
   * added. Shared with the two controls above for the same reason they are:
   * this is how you want counters read, not a property of one chart.
   *
   * One flat list across both modes. Tag ids and unit ids cannot collide, so a
   * pick simply does not apply to a mode that has no such thing, and switching
   * between Tags and Counters shows the half that does rather than starting
   * over.
   */
  const [countPicks, setCountPicks] = useState<CounterPick[]>([])

  const seriesFor = useCallback(
    (mode: string) =>
      isCount(mode)
        ? counterSeries(
            mode as "tag" | "counter",
            countGroupBy,
            countBySlot,
            counterUnits,
            tags,
            slots,
            countPicks,
          )
        : [],
    [countGroupBy, countBySlot, counterUnits, tags, slots, countPicks],
  )

  /**
   * Sums a set of days into one row's worth of keys, one per series.
   *
   * Returns a fresh object rather than filling one in place: React Compiler
   * cannot keep a `useMemo` when a callback it depends on mutates something
   * passed into it, and the whole file loses its memoization to that.
   */
  const countRow = useCallback(
    (keys: string[], series: CounterSeries[]): ChartRow => {
      const out: ChartRow = {}
      let total = 0
      series.forEach((se) => {
        const n = keys.reduce((sum, k) => sum + seriesValue(days[k], se), 0)
        out[se.id] = n
        total += n
      })
      out.total = total
      return out
    },
    [days],
  )

  const dailyToggle = useSeriesToggle()
  const weekdayToggle = useSeriesToggle()
  const weeklyToggle = useSeriesToggle()
  const monthlyToggle = useSeriesToggle()

  // One per chart, declared before the rows that read them: a stable array is
  // something React Compiler can keep a memo around, where a callback called
  // inside four different memos is not.
  const dailyCountSeries = useMemo(
    () => (isCount(dailyMode) ? seriesFor(dailyMode) : []),
    [dailyMode, seriesFor],
  )
  const weekdayCountSeries = useMemo(
    () => (isCount(weekdayMode) ? seriesFor(weekdayMode) : []),
    [weekdayMode, seriesFor],
  )
  const weeklyCountSeries = useMemo(
    () => (isCount(weeklyMode) ? seriesFor(weeklyMode) : []),
    [weeklyMode, seriesFor],
  )
  const monthlyCountSeries = useMemo(
    () => (isCount(monthlyMode) ? seriesFor(monthlyMode) : []),
    [monthlyMode, seriesFor],
  )

  const dayKeysSorted = useMemo(
    () =>
      Object.keys(days)
        .sort()
        .filter((k) => !isDayIgnored(k, days[k])),
    [days, isDayIgnored],
  )

  const rangedKeys = useMemo(() => {
    const s = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth(),
      rangeStart.getDate(),
    )
    const e = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
    )
    return dayKeysSorted.filter((k) => {
      const d = fromKey(k)
      return d >= s && d <= e
    })
  }, [dayKeysSorted, rangeStart, rangeEnd])

  // Everything else (Stats, Averages, Remarkable) is scoped to the chosen
  // analytics period, same as the charts below.
  const periodStats = useMemo(() => {
    const today = new Date()
    const cutoffEnd = rangeEnd < today ? rangeEnd : today
    return computeOverviewStats(rangedKeys, days, slots, rangeStart, cutoffEnd)
  }, [rangedKeys, days, slots, rangeStart, rangeEnd])

  // Best/worst day, week, and month — scoped to the chosen analytics period
  // (same as the charts). Only counts periods with at least some study logged
  // (an untouched day isn't a "worst day", it's just an empty day, already
  // tracked above).
  const remarkable = useMemo(() => {
    const dayVals = rangedKeys
      .map((k) => ({ key: k, hours: dayBreakdown(days[k], slots).total / 60 }))
      .filter((d) => d.hours > 0)

    const weekMap = new Map<string, number>()
    const monthMap = new Map<string, number>()
    rangedKeys.forEach((k) => {
      const { total } = dayBreakdown(days[k], slots)
      if (total <= 0) return
      const d = fromKey(k)
      const wk = toKey(startOfWeek(d))
      const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      weekMap.set(wk, (weekMap.get(wk) || 0) + total / 60)
      monthMap.set(mk, (monthMap.get(mk) || 0) + total / 60)
    })
    const weekVals = [...weekMap.entries()].map(([key, hours]) => ({
      key,
      hours,
    }))
    const monthVals = [...monthMap.entries()].map(([key, hours]) => ({
      key,
      hours,
    }))

    const pick = <T extends { hours: number }>(
      arr: T[],
      dir: 'max' | 'min',
    ): T | null =>
      arr.length
        ? arr.reduce(
            (best, cur) =>
              (dir === "max" ? cur.hours > best.hours : cur.hours < best.hours)
                ? cur
                : best,
            arr[0],
          )
        : null

    return {
      bestDay: pick(dayVals, "max"),
      worstDay: pick(dayVals, "min"),
      bestWeek: pick(weekVals, "max"),
      worstWeek: pick(weekVals, "min"),
      bestMonth: pick(monthVals, "max"),
      worstMonth: pick(monthVals, "min"),
    }
  }, [rangedKeys, days, slots])

  const dailyTotals = useMemo(
    () =>
      rangedKeys.map((k) => {
        const entry = days[k]
        const { bySlot, byCategory, total } = dayBreakdown(entry, slots)
        const row: ChartRow = {
          date: fmtShort(k),
          total: toHours(total),
          lessons: Number(entry.lessons) || 0,
          goal: toHours(goalForDate(settings, fromKey(k))),
        }
        if (dailyMode === "slot") {
          slots.forEach((s) => (row[s.id] = toHours(bySlot[s.id])))
        } else if (dailyMode === "category") {
          categories.forEach(
            (c) => (row[c.id] = toHours(byCategory[c.id] || 0)),
          )
        } else if (isCount(dailyMode)) {
          return { ...row, ...countRow([k], dailyCountSeries) }
        }
        return row
      }),
    [rangedKeys, days, slots, categories, dailyMode, settings, dailyCountSeries, countRow],
  )
  const dailySeries = useMemo(
    () =>
      dailyMode === "slot"
        ? slots
        : dailyMode === "category"
          ? categories
          : isCount(dailyMode)
            ? dailyCountSeries
            : [],
    [dailyMode, slots, categories, dailyCountSeries],
  )

  const weeklyBuckets = useMemo(() => {
    const map = new Map<string, string[]>()
    rangedKeys.forEach((k) => {
      const wk = toKey(startOfWeek(fromKey(k)))
      if (!map.has(wk)) map.set(wk, [])
      map.get(wk)!.push(k)
    })
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1))
  }, [rangedKeys])

  const weeklySeries = useMemo(
    () =>
      weeklyMode === "slot"
        ? slots
        : weeklyMode === "category"
          ? categories
          : isCount(weeklyMode)
            ? weeklyCountSeries
            : [],
    [weeklyMode, slots, categories, weeklyCountSeries],
  )

  const weeklyModeData = useMemo(() => {
    return weeklyBuckets.map(([wk, keys]) => {
      if (isCount(weeklyMode)) {
        return {
          week: fmtShort(wk),
          ...countRow(keys, weeklyCountSeries),
        }
      }
      const row: ChartRow = { week: fmtShort(wk) }
      if (weeklyMode === "slot" || weeklyMode === "category") {
        const list = weeklyMode === "slot" ? slots : categories
        const sums: Sums = {}
        list.forEach((s) => (sums[s.id] = 0))
        keys.forEach((k) => {
          const { bySlot, byCategory } = dayBreakdown(days[k], slots)
          list.forEach(
            (s) =>
              (sums[s.id] +=
                weeklyMode === "slot" ? bySlot[s.id] : byCategory[s.id] || 0),
          )
        })
        list.forEach((s) => (row[s.id] = toHours(sums[s.id])))
      } else {
        let minutes = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
        })
        row.hours = Number((minutes / 60).toFixed(2))
        // Target hours for the whole week (Mon–Sun), from the per-weekday
        // goals set in Setup — independent of which days actually have
        // logged entries, since it's a target, not an actual.
        let goalMinutes = 0
        const weekStart = fromKey(wk)
        for (let i = 0; i < 7; i++) {
          goalMinutes += goalForDate(settings, addDays(weekStart, i))
        }
        row.goal = Number((goalMinutes / 60).toFixed(2))
      }
      return row
    })
  }, [weeklyBuckets, days, slots, categories, weeklyMode, settings, weeklyCountSeries, countRow])

  const monthlyBuckets = useMemo(() => {
    const map = new Map<string, string[]>()
    rangedKeys.forEach((k) => {
      const d = fromKey(k)
      const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      if (!map.has(mk)) map.set(mk, [])
      map.get(mk)!.push(k)
    })
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1))
  }, [rangedKeys])

  const fmtMonthLabel = (mk: string) => {
    const [y, m] = mk.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    })
  }

  const monthlySeries = useMemo(
    () =>
      monthlyMode === "slot"
        ? slots
        : monthlyMode === "category"
          ? categories
          : isCount(monthlyMode)
            ? monthlyCountSeries
            : [],
    [monthlyMode, slots, categories, monthlyCountSeries],
  )

  const monthlyModeData = useMemo(() => {
    return monthlyBuckets.map(([mk, keys]) => {
      if (isCount(monthlyMode)) {
        return {
          month: fmtMonthLabel(mk),
          ...countRow(keys, monthlyCountSeries),
        }
      }
      const row: ChartRow = { month: fmtMonthLabel(mk) }
      if (monthlyMode === "slot" || monthlyMode === "category") {
        const list = monthlyMode === "slot" ? slots : categories
        const sums: Sums = {}
        list.forEach((s) => (sums[s.id] = 0))
        keys.forEach((k) => {
          const { bySlot, byCategory } = dayBreakdown(days[k], slots)
          list.forEach(
            (s) =>
              (sums[s.id] +=
                monthlyMode === "slot" ? bySlot[s.id] : byCategory[s.id] || 0),
          )
        })
        list.forEach((s) => (row[s.id] = toHours(sums[s.id])))
      } else {
        let minutes = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
        })
        row.hours = Number((minutes / 60).toFixed(2))
        // Target hours for the whole calendar month, from the per-weekday
        // goals set in Setup — independent of which days actually have
        // logged entries, since it's a target, not an actual.
        const [y, m] = mk.split("-").map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        let goalMinutes = 0
        for (let d = 1; d <= daysInMonth; d++) {
          goalMinutes += goalForDate(settings, new Date(y, m - 1, d))
        }
        row.goal = Number((goalMinutes / 60).toFixed(2))
      }
      return row
    })
  }, [monthlyBuckets, days, slots, categories, monthlyMode, settings, monthlyCountSeries, countRow])

  // Weekday effectiveness — compares the same weekday (Mon, Tue, …) across the
  // different weeks in range. In Slot/Category mode we instead show the hours
  // breakdown per weekday, summed across the whole range (matching the toggle
  // options on the Daily study time chart above).
  const weekLabelsList = useMemo(
    () => weeklyBuckets.map(([wk]) => fmtShort(wk)),
    [weeklyBuckets],
  )

  const weekdaySeries = useMemo(() => {
    if (weekdayMode === "slot") return slots
    if (weekdayMode === "category") return categories
    if (isCount(weekdayMode)) return weekdayCountSeries
    return weeklyBuckets.map(([,], idx) => ({
      id: `w${idx}`,
      label: `Wk of ${weekLabelsList[idx]}`,
      color: PALETTE[idx % PALETTE.length],
    }))
  }, [weekdayMode, slots, categories, weeklyBuckets, weekLabelsList, weekdayCountSeries])

  const weekdayData = useMemo(() => {
    return WEEKDAY_ORDER.map((wd) => {
      if (isCount(weekdayMode)) {
        return {
          weekday: WEEKDAY_LABELS[wd],
          ...countRow(
            rangedKeys.filter((k) => fromKey(k).getDay() === wd),
            weekdayCountSeries,
          ),
        }
      }
      const row: ChartRow = { weekday: WEEKDAY_LABELS[wd] }
      if (weekdayMode === "slot" || weekdayMode === "category") {
        const matching = rangedKeys.filter((k) => fromKey(k).getDay() === wd)
        if (weekdayMode === "slot") {
          slots.forEach((s) => {
            let sum = 0
            matching.forEach((k) => {
              const { bySlot } = dayBreakdown(days[k], slots)
              sum += bySlot[s.id]
            })
            row[s.id] = toHours(sum)
          })
        } else {
          categories.forEach((c) => {
            let sum = 0
            matching.forEach((k) => {
              const { byCategory } = dayBreakdown(days[k], slots)
              sum += byCategory[c.id] || 0
            })
            row[c.id] = toHours(sum)
          })
        }
      } else {
        weeklyBuckets.forEach(([, keys], idx) => {
          const dayKey = keys.find((k) => fromKey(k).getDay() === wd)
          const { total } = dayBreakdown(dayKey ? days[dayKey] : undefined, slots)
          row[`w${idx}`] = toHours(total)
        })
        if (weekdayMode === "hours") {
          row.goal = goalsEnabled
            ? toHours(Number(settings.dailyGoals?.[wd]) || 0)
            : 0
        }
      }
      return row
    })
  }, [
    rangedKeys,
    weeklyBuckets,
    days,
    slots,
    categories,
    weekdayMode,
    settings,
    goalsEnabled,
    weekdayCountSeries,
    countRow,
  ])

  return (
    <div className="space-y-8">
      <TabbedSection
        title="Summary"
        help={SUMMARY_HELP}
        tabs={SUMMARY_TABS}
        activeId={summaryTab}
        onChange={setSummaryTab}
        caption={SUMMARY_CAPTIONS[summaryTab]}
      >
        {summaryTab === "overview" && (
          <OverviewStats period={periodStats}>
            {/* First in the Overview tab: "where did the period's time go" is
                one of the period's numbers, not a heading of its own. */}
            <PeriodTotals
              dates={rangeDates}
              days={days}
              slots={slots}
              categories={categories}
              isIgnored={isDayIgnored}
            />
          </OverviewStats>
        )}
        {summaryTab === "averages" && <AveragesStats period={periodStats} />}
        {summaryTab === "remarkable" && (
          <RemarkableStats remarkable={remarkable} />
        )}
      </TabbedSection>

      <TabbedSection
        title="Trends"
        help={TRENDS_HELP}
        tabs={TREND_TABS}
        activeId={trendTab}
        onChange={setTrendTab}
      >
        {trendTab === "daily" && (
        <ChartCard
          title="Daily study time"
          subtitle={
            dailyMode === "hours"
              ? "Total hours logged per day"
              : isCount(dailyMode)
                ? countSubtitle(dailyMode, countGroupBy, countBySlot, "day")
                : `Hours logged per day, split by ${dailyMode} — dashed line is the day's total`
          }
          action={
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              <SegmentedControl
                items={CHART_MODES}
                activeId={dailyMode}
                onChange={setDailyMode}
              />
              {isCount(dailyMode) && (
                <CountOptions
                  mode={dailyMode}
                  groupBy={countGroupBy}
                  onGroupBy={setCountGroupBy}
                  bySlot={countBySlot}
                  onBySlot={setCountBySlot}
                />
              )}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                tickFormatter={isCount(dailyMode) ? undefined : fmtAxisHours}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={chartTooltip(c)}
                formatter={(value, name) =>
                  isCount(dailyMode)
                    ? [`${value}`, name]
                    : [fmtHoursChart(Number(value)), name]
                }
              />
              {dailyMode === "hours" ? (
                [
                  <Area
                    key="total"
                    type="monotone"
                    dataKey="total"
                    stroke={c.accent}
                    fill={c.accent}
                    fillOpacity={0.25}
                    strokeWidth={2}
                    name="Hours studied"
                    dot={{ r: 3 }}
                  />,
                  ...(goalsEnabled
                    ? [
                        <Line
                          key="goal-line"
                          type="monotone"
                          dataKey="goal"
                          stroke={c.ink}
                          strokeWidth={1.5}
                          strokeDasharray="6 3"
                          dot={false}
                          name="Goal"
                        />,
                      ]
                    : []),
                ]
              ) : (
                // NOTE: recharts inspects its direct children by type — wrapping these in a
                // <Fragment> hides them from it entirely, so we return a flat array instead.
                [
                  ...dailySeries
                    .filter((s) => !dailyToggle.hidden.has(s.id))
                    .map((s) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stackId="a"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={seriesOpacity(s)}
                        name={s.label}
                      />
                    )),
                  <Line
                    key="total-line"
                    type="monotone"
                    dataKey="total"
                    stroke={c.ink}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    name="Total hours"
                  />,
                ]
              )}
            </ComposedChart>
          </ResponsiveContainer>
          {dailyMode !== "hours" && (
            <SeriesLegend
              mode={dailyMode}
              series={dailySeries}
              toggle={dailyToggle}
              groupBy={countGroupBy}
              bySlot={countBySlot}
              units={counterUnits}
              tags={tags}
              slots={slots}
              picks={countPicks}
              onPicks={setCountPicks}
            />
          )}
        </ChartCard>
        )}
        {trendTab === "weekday" && (
        <ChartCard
          title="Weekday effectiveness"
          subtitle={
            weekdayMode === "hours"
              ? goalsEnabled
                ? "Hours studied per weekday, compared week over week"
                : "Hours studied per weekday"
              : isCount(weekdayMode)
                ? countSubtitle(weekdayMode, countGroupBy, countBySlot, "weekday")
                : `Hours per weekday in this range, split by ${weekdayMode}`
          }
          action={
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              <SegmentedControl
                items={CHART_MODES}
                activeId={weekdayMode}
                onChange={setWeekdayMode}
              />
              {isCount(weekdayMode) && (
                <CountOptions
                  mode={weekdayMode}
                  groupBy={countGroupBy}
                  onGroupBy={setCountGroupBy}
                  bySlot={countBySlot}
                  onBySlot={setCountBySlot}
                />
              )}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
              <XAxis
                dataKey="weekday"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                tickFormatter={
                  isCount(weekdayMode) ? undefined : fmtAxisHours
                }
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={chartTooltip(c)}
                formatter={(value, name) =>
                  isCount(weekdayMode)
                    ? [`${value}`, name]
                    : [fmtHoursChart(Number(value)), name]
                }
              />
              {weekdaySeries
                .filter((s) => !weekdayToggle.hidden.has(s.id))
                .map((s) =>
                  weekdayMode === "slot" || weekdayMode === "category" ? (
                    <Area
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stackId="a"
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={seriesOpacity(s)}
                      name={s.label}
                    />
                  ) : (
                    <Area
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      name={s.label}
                      dot={{ r: 2 }}
                    />
                  ),
                )}
              {goalsEnabled && weekdayMode === "hours" && (
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke={c.ink}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Goal"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          <SeriesLegend
            mode={weekdayMode}
            series={weekdaySeries}
            toggle={weekdayToggle}
            groupBy={countGroupBy}
            bySlot={countBySlot}
            units={counterUnits}
            tags={tags}
            slots={slots}
            picks={countPicks}
            onPicks={setCountPicks}
          />
        </ChartCard>
        )}
        {trendTab === "weekly" && (
        <ChartCard
          title="Weekly effectiveness"
          subtitle={
            weeklyMode === "hours"
              ? goalsEnabled
                ? "Total hours studied, aggregated per week"
                : "Total hours studied per week"
              : isCount(weeklyMode)
                ? countSubtitle(weeklyMode, countGroupBy, countBySlot, "week")
                : `Hours per week, split by ${weeklyMode}`
          }
          action={
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              <SegmentedControl
                items={CHART_MODES}
                activeId={weeklyMode}
                onChange={setWeeklyMode}
              />
              {isCount(weeklyMode) && (
                <CountOptions
                  mode={weeklyMode}
                  groupBy={countGroupBy}
                  onGroupBy={setCountGroupBy}
                  bySlot={countBySlot}
                  onBySlot={setCountBySlot}
                />
              )}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyModeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                tickFormatter={
                  isCount(weeklyMode) ? undefined : fmtAxisHours
                }
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={chartTooltip(c)}
                formatter={(value, name) =>
                  isCount(weeklyMode)
                    ? [`${value}`, name]
                    : [fmtHoursChart(Number(value)), name]
                }
              />
              {weeklyMode !== "hours"
                ? weeklySeries
                    .filter((s) => !weeklyToggle.hidden.has(s.id))
                    .map((s) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stackId="a"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={seriesOpacity(s)}
                        name={s.label}
                      />
                    ))
                : [
                    <Area
                      key="value"
                      type="monotone"
                      dataKey="hours"
                      stroke={c.accent}
                      fill={c.accent}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name="Hours"
                      dot={{ r: 3 }}
                    />,
                    goalsEnabled && weeklyMode === "hours" && (
                      <Line
                        key="goal-line"
                        type="monotone"
                        dataKey="goal"
                        stroke={c.ink}
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        name="Goal"
                      />
                    ),
                  ]}
            </AreaChart>
          </ResponsiveContainer>
          {weeklyMode !== "hours" && (
            <SeriesLegend
              mode={weeklyMode}
              series={weeklySeries}
              toggle={weeklyToggle}
              groupBy={countGroupBy}
              bySlot={countBySlot}
              units={counterUnits}
              tags={tags}
              slots={slots}
              picks={countPicks}
              onPicks={setCountPicks}
            />
          )}
        </ChartCard>
        )}
        {trendTab === "monthly" && (
          <ChartCard
            title="Monthly effectiveness"
            subtitle={
              monthlyMode === "hours"
                ? goalsEnabled
                  ? "Total hours studied, aggregated per month"
                  : "Total hours studied per month"
                : isCount(monthlyMode)
                  ? countSubtitle(monthlyMode, countGroupBy, countBySlot, "month")
                  : `Hours per month, split by ${monthlyMode}`
            }
            action={
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                <SegmentedControl
                  items={CHART_MODES}
                  activeId={monthlyMode}
                  onChange={setMonthlyMode}
                />
                {isCount(monthlyMode) && (
                  <CountOptions
                    mode={monthlyMode}
                    groupBy={countGroupBy}
                    onGroupBy={setCountGroupBy}
                    bySlot={countBySlot}
                    onBySlot={setCountBySlot}
                  />
                )}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyModeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  tickFormatter={
                    isCount(monthlyMode) ? undefined : fmtAxisHours
                  }
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={chartTooltip(c)}
                  formatter={(value, name) =>
                    isCount(monthlyMode)
                      ? [`${value}`, name]
                      : [fmtHoursChart(Number(value)), name]
                  }
                />
                {monthlyMode !== "hours"
                  ? monthlySeries
                      .filter((s) => !monthlyToggle.hidden.has(s.id))
                      .map((s) => (
                        <Area
                          key={s.id}
                          type="monotone"
                          dataKey={s.id}
                          stackId="a"
                          stroke={s.color}
                          fill={s.color}
                          fillOpacity={seriesOpacity(s)}
                          name={s.label}
                        />
                      ))
                  : // Flat array, not a Fragment — see the note on the daily chart.
                    [
                      <Area
                        key="value"
                        type="monotone"
                        dataKey="hours"
                        stroke={c.accent}
                        fill={c.accent}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        name="Hours"
                        dot={{ r: 3 }}
                      />,
                      goalsEnabled && monthlyMode === "hours" && (
                        <Line
                          key="goal-line"
                          type="monotone"
                          dataKey="goal"
                          stroke={c.ink}
                          strokeWidth={1.5}
                          strokeDasharray="6 3"
                          dot={false}
                          name="Goal"
                        />
                      ),
                    ]}
              </AreaChart>
            </ResponsiveContainer>
            {monthlyMode !== "hours" && (
              <SeriesLegend
                mode={monthlyMode}
                series={monthlySeries}
                toggle={monthlyToggle}
                groupBy={countGroupBy}
                bySlot={countBySlot}
                units={counterUnits}
                tags={tags}
                slots={slots}
                picks={countPicks}
                onPicks={setCountPicks}
              />
            )}
          </ChartCard>
        )}
      </TabbedSection>
    </div>
  )
}
