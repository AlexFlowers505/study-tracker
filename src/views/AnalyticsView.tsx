/* ---------------------------------------------------------------
   Analytics — the charts half of the page.

   Bounds come in from the shared period bar; this view owns no range picker
   of its own, and the all-time totals are passed in because the panel that
   shows them lives above, next to the log.
--------------------------------------------------------------- */

import { useMemo, useState } from 'react'
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
import type { Project } from '../types/model'
import { computeOverviewStats } from '../lib/analytics'
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
import {
  ACCENT,
  GOAL_MET_COLOR,
  PALETTE,
} from '../lib/theme'
import { ChartCard } from '../ui/ChartCard'
import { SegmentedControl } from '../ui/controls'
import { ToggleChips } from '../ui/ToggleChips'
import { bulkToggleFor, useSeriesToggle } from '../ui/useSeriesToggle'
import { AveragesStats } from './AveragesStats'
import { OverviewStats } from './OverviewStats'
import { PeriodTotals } from './PeriodTotals'
import { RemarkableStats } from './RemarkableStats'

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
]

// Bounds come in from the shared period bar — analytics no longer owns a
// range picker of its own.
export function AnalyticsView({
  data,
  rangeStart,
  rangeEnd,
}: {
  data: Project
  rangeStart: Date
  rangeEnd: Date
}) {
  const {
    slots,
    categories,
    days,
    settings,
    weekIgnore = {},
    monthIgnore = {},
  } = data

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

  const dailyToggle = useSeriesToggle()
  const weekdayToggle = useSeriesToggle()
  const weeklyToggle = useSeriesToggle()
  const monthlyToggle = useSeriesToggle()

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
        }
        return row
      }),
    [rangedKeys, days, slots, categories, dailyMode, settings],
  )
  const dailySeries =
    dailyMode === "slot" ? slots : dailyMode === "category" ? categories : []

  const weeklyBuckets = useMemo(() => {
    const map = new Map<string, string[]>()
    rangedKeys.forEach((k) => {
      const wk = toKey(startOfWeek(fromKey(k)))
      if (!map.has(wk)) map.set(wk, [])
      map.get(wk)!.push(k)
    })
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1))
  }, [rangedKeys])

  const weeklySeries =
    weeklyMode === "slot" ? slots : weeklyMode === "category" ? categories : []

  const weeklyModeData = useMemo(() => {
    return weeklyBuckets.map(([wk, keys]) => {
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
      } else if (weeklyMode === "lessons") {
        row.lessons = keys.reduce(
          (sum: number, k: string) => sum + (Number(days[k].lessons) || 0),
          0,
        )
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
  }, [weeklyBuckets, days, slots, categories, weeklyMode, settings])

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

  const monthlySeries =
    monthlyMode === "slot"
      ? slots
      : monthlyMode === "category"
        ? categories
        : []

  const monthlyModeData = useMemo(() => {
    return monthlyBuckets.map(([mk, keys]) => {
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
      } else if (monthlyMode === "lessons") {
        row.lessons = keys.reduce(
          (sum: number, k: string) => sum + (Number(days[k].lessons) || 0),
          0,
        )
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
  }, [monthlyBuckets, days, slots, categories, monthlyMode, settings])

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
    return weeklyBuckets.map(([,], idx) => ({
      id: `w${idx}`,
      label: `Wk of ${weekLabelsList[idx]}`,
      color: PALETTE[idx % PALETTE.length],
    }))
  }, [weekdayMode, slots, categories, weeklyBuckets, weekLabelsList])

  const weekdayData = useMemo(() => {
    return WEEKDAY_ORDER.map((wd) => {
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
          if (weekdayMode === "lessons") {
            row[`w${idx}`] = dayKey ? Number(days[dayKey].lessons) || 0 : 0
          } else {
            const { total } = dayBreakdown(dayKey ? days[dayKey] : undefined, slots)
            row[`w${idx}`] = toHours(total)
          }
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
  ])

  return (
    <div className="space-y-8">
      <OverviewStats period={periodStats}>
        {/* Inside the Stats block and first in it, under the heading: "where
            did the period's time go" is one of the period's numbers, not a
            heading of its own. */}
        <PeriodTotals
          dates={rangeDates}
          days={days}
          slots={slots}
          categories={categories}
          isIgnored={isDayIgnored}
        />
      </OverviewStats>

      <AveragesStats period={periodStats} />

      <RemarkableStats remarkable={remarkable} />

      <ChartCard
        title="Daily study time"
        subtitle={
          dailyMode === "hours"
            ? "Total hours logged per day"
            : dailyMode === "lessons"
              ? "Lessons completed per day"
              : `Hours logged per day, split by ${dailyMode} — dashed line is the day's total`
        }
        action={
          <SegmentedControl
            items={CHART_MODES}
            activeId={dailyMode}
            onChange={setDailyMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={dailyTotals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={dailyMode === "lessons" ? undefined : fmtAxisHours}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                dailyMode === "lessons"
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
                  stroke={ACCENT}
                  fill={ACCENT}
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
                        stroke="#1E2A33"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        name="Goal"
                      />,
                    ]
                  : []),
              ]
            ) : dailyMode === "lessons" ? (
              <Area
                type="monotone"
                dataKey="lessons"
                stroke={GOAL_MET_COLOR}
                fill={GOAL_MET_COLOR}
                fillOpacity={0.25}
                strokeWidth={2}
                name="Lessons"
                dot={{ r: 3 }}
              />
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
                      fillOpacity={0.55}
                      name={s.label}
                    />
                  )),
                <Line
                  key="total-line"
                  type="monotone"
                  dataKey="total"
                  stroke="#1E2A33"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  name="Total hours"
                />,
              ]
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {(dailyMode === "slot" || dailyMode === "category") && (
          <ToggleChips
            items={dailySeries}
            hidden={dailyToggle.hidden}
            onToggle={dailyToggle.toggle}
            onBulk={bulkToggleFor(dailySeries, dailyToggle)}
          />
        )}
      </ChartCard>
      <ChartCard
        title="Weekday effectiveness"
        subtitle={
          weekdayMode === "hours"
            ? goalsEnabled
              ? "Hours studied per weekday, compared week over week"
              : "Hours studied per weekday"
            : weekdayMode === "lessons"
              ? "Lessons completed per weekday, compared week over week"
              : `Hours per weekday in this range, split by ${weekdayMode}`
        }
        action={
          <SegmentedControl
            items={CHART_MODES}
            activeId={weekdayMode}
            onChange={setWeekdayMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={weekdayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="weekday"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={
                weekdayMode === "lessons" ? undefined : fmtAxisHours
              }
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                weekdayMode === "lessons"
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
                    fillOpacity={0.55}
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
                stroke="#1E2A33"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name="Goal"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <ToggleChips
          items={weekdaySeries}
          hidden={weekdayToggle.hidden}
          onToggle={weekdayToggle.toggle}
          onBulk={bulkToggleFor(weekdaySeries, weekdayToggle)}
        />
      </ChartCard>
      <ChartCard
        title="Weekly effectiveness"
        subtitle={
          weeklyMode === "hours"
            ? goalsEnabled
              ? "Total hours studied, aggregated per week"
              : "Total hours studied per week"
            : weeklyMode === "lessons"
              ? "Lessons completed per week"
              : `Hours per week, split by ${weeklyMode}`
        }
        action={
          <SegmentedControl
            items={CHART_MODES}
            activeId={weeklyMode}
            onChange={setWeeklyMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyModeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={
                weeklyMode === "slot" ||
                weeklyMode === "category" ||
                weeklyMode === "hours"
                  ? fmtAxisHours
                  : undefined
              }
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                weeklyMode === "slot" ||
                weeklyMode === "category" ||
                weeklyMode === "hours"
                  ? [fmtHoursChart(Number(value)), name]
                  : [`${value}`, name]
              }
            />
            {weeklyMode === "slot" || weeklyMode === "category"
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
                      fillOpacity={0.55}
                      name={s.label}
                    />
                  ))
              : [
                  <Area
                    key="value"
                    type="monotone"
                    dataKey={weeklyMode === "lessons" ? "lessons" : "hours"}
                    stroke={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                    fill={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name={weeklyMode === "lessons" ? "Lessons" : "Hours"}
                    dot={{ r: 3 }}
                  />,
                  goalsEnabled && weeklyMode === "hours" && (
                    <Line
                      key="goal-line"
                      type="monotone"
                      dataKey="goal"
                      stroke="#1E2A33"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      name="Goal"
                    />
                  ),
                ]}
          </AreaChart>
        </ResponsiveContainer>
        {(weeklyMode === "slot" || weeklyMode === "category") && (
          <ToggleChips
            items={weeklySeries}
            hidden={weeklyToggle.hidden}
            onToggle={weeklyToggle.toggle}
            onBulk={bulkToggleFor(weeklySeries, weeklyToggle)}
          />
        )}
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly effectiveness"
          subtitle={
            monthlyMode === "hours"
              ? goalsEnabled
                ? "Total hours studied, aggregated per month"
                : "Total hours studied per month"
              : monthlyMode === "lessons"
                ? "Lessons completed per month"
                : `Hours per month, split by ${monthlyMode}`
          }
          action={
            <SegmentedControl
              items={CHART_MODES}
              activeId={monthlyMode}
              onChange={setMonthlyMode}
            />
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyModeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={
                  monthlyMode === "slot" ||
                  monthlyMode === "category" ||
                  monthlyMode === "hours"
                    ? fmtAxisHours
                    : undefined
                }
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
                formatter={(value, name) =>
                  monthlyMode === "slot" ||
                  monthlyMode === "category" ||
                  monthlyMode === "hours"
                    ? [fmtHoursChart(Number(value)), name]
                    : [`${value}`, name]
                }
              />
              {monthlyMode === "slot" || monthlyMode === "category"
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
                        fillOpacity={0.55}
                        name={s.label}
                      />
                    ))
                : // Flat array, not a Fragment — see the note on the daily chart.
                  [
                    <Area
                      key="value"
                      type="monotone"
                      dataKey={monthlyMode === "lessons" ? "lessons" : "hours"}
                      stroke={
                        monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT
                      }
                      fill={monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name={monthlyMode === "lessons" ? "Lessons" : "Hours"}
                      dot={{ r: 3 }}
                    />,
                    goalsEnabled && monthlyMode === "hours" && (
                      <Line
                        key="goal-line"
                        type="monotone"
                        dataKey="goal"
                        stroke="#1E2A33"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        name="Goal"
                      />
                    ),
                  ]}
            </AreaChart>
          </ResponsiveContainer>
          {(monthlyMode === "slot" || monthlyMode === "category") && (
            <ToggleChips
              items={monthlySeries}
              hidden={monthlyToggle.hidden}
              onToggle={monthlyToggle.toggle}
              onBulk={bulkToggleFor(monthlySeries, monthlyToggle)}
            />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
