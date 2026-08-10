/* ---------------------------------------------------------------
   "Where the time went" — per-slot and per-category totals for whichever
   range is selected, each with its per-day average once the period covers
   more than one day.
--------------------------------------------------------------- */

import { useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { Category, Day, DayKey, IsIgnored, Slot } from "../types/model"
import { elapsedDayCount, periodBreakdown } from "../lib/stats"
import { fmtHours, fmtHoursFixed1, toHours } from "../lib/time"
import { CARD } from "../lib/theme"
import { ChartCard } from "../ui/ChartCard"

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
  const data = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        label: r.label,
        color: r.color,
        hours: toHours(r.minutes),
        minutes: r.minutes,
        share: total > 0 ? (r.minutes / total) * 100 : 0,
      })),
    [rows, total],
  )

  if (!data.length) {
    return (
      <p className="text-[10px] font-mono text-[#1E2A33]/40 py-6 text-center">
        Nothing logged in this period.
      </p>
    )
  }

  return (
    // Side by side only once the card is genuinely wide; in the two-column
    // grid the legend would otherwise get ~180px and chop the longer category
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
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 11, fontFamily: "monospace" }}
              formatter={(value, name) => [
                `${fmtHours(Number(value))}${
                  divisor > 1
                    ? ` · ${fmtHoursFixed1(Number(value) / divisor)}/day`
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
          <span className="text-[8px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
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
            <span className="text-[#1E2A33]/70 truncate">{d.label}</span>
            <span className="flex-1 border-b border-dotted border-[#1E2A33]/15 min-w-[8px]" />
            <span className="font-bold shrink-0">{fmtHours(d.minutes)}</span>
            <span className="text-[#1E2A33]/40 tabular-nums w-8 text-right shrink-0">
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
  categories,
  isIgnored,
}: {
  dates: Date[]
  days: Record<DayKey, Day>
  slots: Slot[]
  categories: Category[]
  isIgnored: IsIgnored
}) {
  const { total, slotRows, categoryRows } = useMemo(
    () => periodBreakdown(dates, days, slots, categories, isIgnored),
    [dates, days, slots, categories, isIgnored],
  )
  const divisor = useMemo(
    () => elapsedDayCount(dates, days, isIgnored),
    [dates, days, isIgnored],
  )

  const perDay = divisor > 1 ? ` · ${fmtHoursFixed1(total / divisor)}/day` : ""

  if (total === 0) {
    return (
      <div className={`${CARD} mb-4 text-[10px] font-mono text-[#1E2A33]/40`}>
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
        title="Time by category"
        subtitle={`What the ${fmtHours(total)}${perDay} went on`}
      >
        <TotalsDonut rows={categoryRows} total={total} divisor={divisor} />
      </ChartCard>
    </div>
  )
}
