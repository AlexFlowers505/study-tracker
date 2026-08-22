/* ---------------------------------------------------------------
   "Where the time went" — per-slot and per-activity totals for whichever
   range is selected, each with its per-day average once the period covers
   more than one day.
--------------------------------------------------------------- */

import { useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { Activity, Day, DayKey, IsIgnored, Slot } from "../types/model"
import { elapsedDayCount, periodBreakdown } from "../lib/stats"
import { fmtHours, toHours } from "../lib/time"
import { CARD, chartTooltip } from "../lib/theme"
import { ChartCard } from "../ui/ChartCard"
import { usePalette } from "../ui/useTheme"

export interface TotalsRow {
  id: string
  label: string
  color: string
  minutes: number
}

/**
 * Part-of-whole, so a donut: the ring shows the split at a glance and the
 * hole carries the total, which the bar version had nowhere to put. The
 * legend beside it does the work an axis would — every entry pairs a swatch
 * with its name, hours and share, so identity never rests on colour alone and
 * the small slices stay readable instead of vanishing into slivers.
 */
export function TotalsDonut({
  rows,
  total,
  divisor,
}: {
  rows: TotalsRow[]
  total: number
  divisor: number
}) {
  const c = usePalette()
  const data = useMemo(
    () =>
      rows
        .map((r) => ({
          id: r.id,
          label: r.label,
          color: r.color,
          hours: toHours(r.minutes),
          minutes: r.minutes,
          share: total > 0 ? (r.minutes / total) * 100 : 0,
        }))
        // Biggest first, in the ring and the legend alike. The question a
        // part-of-whole answers is "what took the most", and configured order
        // (morning, daytime, evening) makes you compare slices by eye to work
        // that out. Sorting is stable, so equal totals keep that order.
        // `periodBreakdown` still returns them configured — the ordering is a
        // property of this drawing, not of the numbers.
        .sort((a, b) => b.minutes - a.minutes),
    [rows, total],
  )

  if (!data.length) {
    return (
      <p className="text-[10px] font-mono text-ink/40 py-6 text-center">
        Nothing logged in this period.
      </p>
    )
  }

  return (
    // Side by side only once the card is genuinely wide; in the two-column
    // grid the legend would otherwise get ~180px and chop the longer activity
    // names down to nothing.
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="label"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke={c.card}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltip(c)}
              formatter={(value, name) => [
                `${fmtHours(Number(value))}${
                  divisor > 1
                    ? ` · ${fmtHours(Number(value) / divisor)}/day`
                    : ""
                } · ${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-base font-extrabold">
            {fmtHours(total)}
          </span>
          <span className="text-[8px] font-mono uppercase tracking-widest text-ink/40">
            total
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-1">
        {data.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-1.5 text-[10px] font-mono"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-ink/70 truncate">{d.label}</span>
            <span className="flex-1 border-b border-dotted border-ink/15 min-w-[8px]" />
            <span className="font-bold shrink-0">{fmtHours(d.minutes)}</span>
            <span className="text-ink/40 tabular-nums w-8 text-right shrink-0">
              {Math.round(d.share)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PeriodTotals({
  dates,
  days,
  slots,
  activities,
  isIgnored,
}: {
  dates: Date[]
  days: Record<DayKey, Day>
  slots: Slot[]
  activities: Activity[]
  isIgnored: IsIgnored
}) {
  const { total, slotRows, activityRows } = useMemo(
    () => periodBreakdown(dates, days, slots, activities, isIgnored),
    [dates, days, slots, activities, isIgnored],
  )
  const divisor = useMemo(
    () => elapsedDayCount(dates, days, isIgnored),
    [dates, days, isIgnored],
  )

  const perDay = divisor > 1 ? ` · ${fmtHours(total / divisor)}/day` : ""

  if (total === 0) {
    return (
      <div className={`${CARD} mb-4 text-[10px] font-mono text-ink/40`}>
        No study logged in this period.
      </div>
    )
  }

  // Two separate cards side by side, the same shape the analytics charts use
  // further down the page — one card holding two charts read as a single
  // muddled figure.
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <ChartCard
        title="Time by slot"
        subtitle={`When the ${fmtHours(total)}${perDay} went`}
      >
        <TotalsDonut rows={slotRows} total={total} divisor={divisor} />
      </ChartCard>
      <ChartCard
        title="Time by activity"
        subtitle={`What the ${fmtHours(total)}${perDay} went on`}
      >
        <TotalsDonut rows={activityRows} total={total} divisor={divisor} />
      </ChartCard>
    </div>
  )
}
