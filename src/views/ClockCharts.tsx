/* ---------------------------------------------------------------
   One activity's sessions on the rotated clock — the Trends tab that used to
   be the sleep panel.

   **It was three charts about sleep and it is the same three about anything**
   — `spec 024`. Nothing in them was ever about sleep except the list they read
   from: *when does this usually start, when does it end, how long does it run*
   are questions worth asking about a commute, a gym trip or an evening's
   reading, and the answers were locked inside a panel that only one axis could
   open.

   The clock runs 18:00 → 17:00 because a session that crosses midnight is
   otherwise split in two and thrown to opposite ends of the axis, where its
   shape is unreadable. That rotation is `time.ts`'s and it is what makes the
   averages right as well: the naive mean of 23:30 and 00:30 is midday.

   Every number comes from `lib/rotatedClock`; this file only draws. It reads
   `project.days` through the caller, so the count filter reaches it exactly as
   it reaches every other chart.
--------------------------------------------------------------- */

import { useMemo, useState } from "react"
import { Clock, LogIn, LogOut } from "lucide-react"
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
import type { Activity, DateRange, Day, DayKey } from "../types/model"
import { useT } from "../lib/i18n"
import { pad } from "../lib/date"
import { makeIsIgnored } from "../lib/stats"
import type { SessionRow } from "../lib/rotatedClock"
import { clockStats, entriesOfActivity } from "../lib/rotatedClock"
import { DAY_START_HOUR, HOUR_TICKS, fmtAxisHours, fmtHours } from "../lib/time"
import { FIELD_SOFT } from "../lib/theme"

import { ChartCard } from "../ui/ChartCard"
import { StatTile } from "../ui/StatTile"

import { usePalette } from "../ui/useTheme"

/**
 * The row chart's Y axis: the label, plus a rule above any session that starts
 * a new week.
 *
 * Drawn from the tick rather than as a `ReferenceLine` because a Recharts
 * category axis positions a reference line *on* a band, never between two —
 * and between is the only place a week boundary exists. `band` is the row
 * pitch, which the chart knows because it sets its own height from the count.
 */
function SessionTick({
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
  rows: SessionRow[]
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

export function ClockCharts({
  days,
  range,
  activities,
  weekIgnore,
  monthIgnore,
}: {
  days: Record<DayKey, Day>
  range: DateRange
  activities: Activity[]
  weekIgnore: Record<DayKey, boolean>
  monthIgnore: Record<DayKey, boolean>
}) {
  const c = usePalette()
  const t = useT()

  const ignored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )

  /* **It opens on something that has an answer.** A tab that opens empty on
     most projects reads as a broken chart rather than as a question you have
     not asked, so the first activity with a timed session in this period is
     the one it starts on. Only the *first* render: after that the choice is
     yours, and it must not jump when you step the period. */
  const firstWithData = useMemo(
    () =>
      activities.find(
        (a) => clockStats(days, range, ignored, entriesOfActivity(a.id)) !== null,
      )?.id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [chosen, setChosen] = useState<string | undefined>(
    firstWithData ?? activities[0]?.id,
  )
  const activity = activities.find((a) => a.id === chosen)
  const tint = activity?.color || c.accent

  const stats = useMemo(
    () =>
      chosen
        ? clockStats(days, range, ignored, entriesOfActivity(chosen))
        : null,
    [days, range, ignored, chosen],
  )

  // The chart sets its own height from the row count, so it also knows the
  // row pitch — which is what the week rules are positioned against.
  const rowsHeight = Math.max(140, (stats?.perNight.length ?? 0) * 18 + 40)
  const rowBand = stats?.perNight.length
    ? (rowsHeight - 40) / stats.perNight.length
    : 18

  // One tick per hour. Left to itself Recharts picks ticks like 2.5 and 7.5
  // for a long domain, and `fmtAxisHours` rounds those to "3" and "8" —
  // labels that are not the lines they sit on. Whole hours all the way up fix
  // the lie and give the eye an hour-by-hour ruler to read a session against.
  const hourTicks = useMemo(() => {
    const max = Math.max(0, ...(stats?.perNight ?? []).map((n) => n.hours))
    const top = Math.max(1, Math.ceil(max))
    return Array.from({ length: top + 1 }, (_, i) => i)
  }, [stats])

  const picker = (
    <label className="flex items-center gap-2">
      <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
        {t("field:Activity")}
      </span>
      <select
        value={chosen ?? ""}
        onChange={(e) => setChosen(e.target.value)}
        className={`${FIELD_SOFT} text-[11px] w-auto`}
      >
        {activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
    </label>
  )

  if (!activities.length)
    return (
      <p className="text-xs font-mono text-ink/50">
        {t("This project has no activities to read a clock on yet.")}
      </p>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">{picker}</div>

      {!stats ? (
        /* The normal case for most activities — a session only lands here when
           it carries both a start and an end — so it gets a sentence rather
           than three empty axes. */
        <p className="text-xs font-mono text-ink/50">
          {t("Nothing with both a start and an end time in this period yet.")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile
              label={t("Usual start")}
              value={stats.from}
              icon={LogIn}
              inset
            />
            <StatTile
              label={t("Usual finish")}
              value={stats.to}
              icon={LogOut}
              inset
            />
            <StatTile
              label={t("Average length")}
              value={fmtHours(stats.duration)}
              icon={Clock}
              inset
            />
          </div>

          <ChartCard
            title={t("One row each")}
            subtitle={t(
              "Same clock as below — every logged session on its own line",
            )}
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
                {/* The weekday earns its place: "is this worse on weeknights"
                    is the question this chart gets asked, and a column of bare
                    dates cannot answer it. The rule above the first session of
                    each week does the rest — seven rows read as a week rather
                    than as a list. */}
                <YAxis
                  type="category"
                  dataKey="labelLong"
                  width={68}
                  tick={
                    <SessionTick
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
                          activity?.label ?? "",
                        ]
                      : null
                  }
                />
                {/* An invisible bar offsets each session to its start; the
                    second one is the session itself. Recharts has no range
                    bar, and this is the standard way to fake one. */}
                <Bar dataKey="offset" stackId="n" fill="transparent" />
                <Bar
                  dataKey="span"
                  stackId="n"
                  fill={tint}
                  radius={[3, 3, 3, 3]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("Length, session by session")}
            subtitle={t("One point per logged session")}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.perNight}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} />
                <XAxis
                  dataKey="labelLong"
                  tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}A0` }}
                />
                <YAxis
                  ticks={hourTicks}
                  domain={[0, hourTicks[hourTicks.length - 1]]}
                  tickFormatter={fmtAxisHours}
                  tick={{ fontSize: 10, fontFamily: "monospace", fill: `${c.ink}A0` }}
                />
                <Tooltip
                  formatter={(value) => [
                    fmtHours(Number(value) * 60),
                    activity?.label ?? "",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke={tint}
                  fill={`${tint}40`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("When it happens")}
            subtitle={t("Share of logged days busy with it at each hour")}
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
                  formatter={(value) => [
                    t("{n}% of days", { n: String(value) }),
                    activity?.label ?? "",
                  ]}
                  labelFormatter={(label) => `${label}:00`}
                />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke={tint}
                  fill={`${tint}40`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
