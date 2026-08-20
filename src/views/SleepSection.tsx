/* ---------------------------------------------------------------
   Sleep — opened from the period bar, and unlike the other panels it *is*
   period-scoped.

   It reads `project.days` rather than the filtered project: sleep has
   neither slots nor categories, so there is nothing for the count filter to
   act on. Every number comes from `lib/sleep`; this file only draws.
--------------------------------------------------------------- */

import { useMemo } from "react"
import { Clock, Moon, Sunrise } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DateRange, Day, DayKey } from "../types/model"
import { pad } from "../lib/date"
import { makeIsIgnored } from "../lib/stats"
import type { NightRow } from "../lib/sleep"
import { sleepStats } from "../lib/sleep"
import { DAY_START_HOUR, HOUR_TICKS, fmtAxisHours, fmtHours } from "../lib/time"

import { ChartCard } from "../ui/ChartCard"
import { StatTile } from "../ui/StatTile"
import { PanelSection } from "./PanelSection"

import { usePalette } from "../ui/useTheme"
/**
 * The row chart's Y axis: the label, plus a rule above any night that starts a
 * new week.
 *
 * Drawn from the tick rather than as a `ReferenceLine` because a category axis
 * positions a reference line *on* a category, never between two — and between
 * is the only place a week boundary exists. `band` is the row pitch, which the
 * chart knows because it sets its own height from the row count.
 */
function NightTick({
  x,
  y,
  payload,
  rows,
  band,
  ink,
}: {
  x?: number
  y?: number
  payload?: { value?: string; index?: number }
  rows: NightRow[]
  band: number
  ink: string
}) {
  const i = payload?.index ?? 0
  const row = rows[i]
  const prev = i > 0 ? rows[i - 1] : null
  const startsWeek = !!prev && !!row && prev.weekKey !== row.weekKey
  return (
    <g>
      <text
        x={x}
        y={y}
        dy={3}
        textAnchor="end"
        className="font-mono"
        style={{ fontSize: 9, fill: `${ink}A0` }}
      >
        {payload?.value}
      </text>
      {startsWeek && (
        // Runs off to the right and is clipped by the chart's own edge, which
        // is exactly as far as it should go.
        <line
          x1={(x ?? 0) - 64}
          x2={3000}
          y1={(y ?? 0) - band / 2}
          y2={(y ?? 0) - band / 2}
          stroke={`${ink}40`}
          strokeWidth={1}
        />
      )}
    </g>
  )
}

export function SleepSection({
  days,
  range,
  weekIgnore,
  monthIgnore,
  onClose,
}: {
  days: Record<DayKey, Day>
  range: DateRange
  weekIgnore: Record<DayKey, boolean>
  monthIgnore: Record<DayKey, boolean>
  onClose?: () => void
}) {
  const c = usePalette()
  const stats = useMemo(
    () => sleepStats(days, range, makeIsIgnored(weekIgnore, monthIgnore)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, range.start, range.end, weekIgnore, monthIgnore],
  )

  // The chart sets its own height from the row count, so it also knows the
  // row pitch — which is what the week rules are positioned against.
  const rowsHeight = Math.max(140, (stats?.perNight.length ?? 0) * 18 + 40)
  const rowBand = stats?.perNight.length
    ? (rowsHeight - 40) / stats.perNight.length
    : 18

  // One tick per hour. Left to itself Recharts picks ticks like 2.5 and 7.5
  // for a nights-long domain, and `fmtAxisHours` rounds those to "3" and "8" —
  // labels that are not the lines they sit on. Whole hours all the way up fix
  // the lie and give the eye an hour-by-hour ruler to read a night against.
  const nightTicks = useMemo(() => {
    const max = Math.max(0, ...(stats?.perNight ?? []).map((n) => n.hours))
    const top = Math.max(1, Math.ceil(max))
    return Array.from({ length: top + 1 }, (_, i) => i)
  }, [stats])

  return (
    <PanelSection
      tint={c.sleep}
      icon={Moon}
      title="Sleep"
      subtitle={
        stats
          ? `${stats.nights} nights logged across ${stats.daysWithSleep} days in this period`
          : "For the chosen period"
      }
      closeLabel="Hide sleep"
      onClose={onClose}
    >
      {!stats ? (
        // The normal case for any range that predates sleep tracking, so it
        // gets a sentence rather than an empty axis.
        <p className="text-xs font-mono text-ink/50">
          No sleep with a start and end time in this period yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatTile
              label="Average bedtime"
              value={stats.bedtime}
              icon={Moon}
            />
            <StatTile
              label="Average wake-up"
              value={stats.wake}
              icon={Sunrise}
            />
            <StatTile
              label="Average night"
              // No minutes sub-label any more — "7h 12m" is already the
              // whole answer, and "432m" underneath was the same number said
              // again in a unit nobody asked for.
              value={fmtHours(stats.duration)}
              icon={Clock}
            />
          </div>

          <div className="space-y-4">
            <ChartCard
              title="Nights, one row each"
              subtitle="Same clock as below — every logged night on its own line"
            >
              <ResponsiveContainer width="100%" height={rowsHeight}>
                <BarChart
                  data={stats.perNight}
                  layout="vertical"
                  barCategoryGap={2}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
                  <XAxis
                    type="number"
                    domain={[0, 1440]}
                    ticks={HOUR_TICKS}
                    tickFormatter={(v) => pad((v / 60 + DAY_START_HOUR) % 24)}
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  />
                  {/* The weekday earns its place: "was I sleeping badly on
                      weeknights" is the question this chart gets asked, and a
                      column of bare dates cannot answer it. The rule above the
                      first night of each week does the rest of that work —
                      seven rows read as a week, not as a list. */}
                  <YAxis
                    type="category"
                    dataKey="labelLong"
                    width={68}
                    tick={
                      <NightTick
                        rows={stats.perNight}
                        band={rowBand}
                        ink={c.ink}
                      />
                    }
                  />
                  <Tooltip
                    cursor={{ fill: `${c.ink}08` }}
                    formatter={(_value, name, props) =>
                      name === "span"
                        ? [
                            `${props.payload.start}–${props.payload.end} · ${fmtHours(props.payload.minutes)}`,
                            "Asleep",
                          ]
                        : null
                    }
                  />
                  {/* An invisible bar offsets each night to its start; the
                      second one is the night itself. Recharts has no range
                      bar, and this is the standard way to fake one. */}
                  <Bar dataKey="offset" stackId="n" fill="transparent" />
                  <Bar
                    dataKey="span"
                    stackId="n"
                    fill={c.sleep}
                    radius={[3, 3, 3, 3]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Hours slept per night"
              subtitle="One bar per logged night"
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.perNight}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
                  <XAxis
                    dataKey="labelLong"
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  />
                  <YAxis
                    ticks={nightTicks}
                    domain={[0, nightTicks[nightTicks.length - 1]]}
                    tickFormatter={fmtAxisHours}
                    tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      fmtHours(Number(value) * 60),
                      "Slept",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke={c.sleep}
                    fill={`${c.sleep}40`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="When you sleep"
              subtitle="Share of logged nights asleep at each hour"
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}% of nights`, "Asleep"]}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke={c.sleep}
                    fill={`${c.sleep}40`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </PanelSection>
  )
}
