/* ---------------------------------------------------------------
   The rule, drawn against the period.

   The strip above it says *which* days were kept; this says *by how much*, and
   that is the number the whole freeze economy runs on. "Missed" is a colour;
   "three when the limit was nought" is the thing you can do something about.

   **The same shape as Daily study time**: a filled area for what happened and
   a dashed line for what was asked, so crossing the rule is literally crossing
   the line. It was a bar per period for a while, which said the same thing in
   a shape nothing else in the app uses — and the goal streak's panel plots
   exactly the data that chart plots, hours against the day's goal, so the two
   were one question drawn two ways. One shape means the reader learns it once.

   **The dots carry the verdict.** An area is one fill and cannot be red on
   Tuesday, and losing that would be a real loss: this is what tells you a day
   was frozen rather than kept. So each point is drawn in its own state's
   colour — missed red, frozen blue, kept in the streak's own tint — the same
   palette the strip and the day cards use. They also do the work
   `minPointSize` used to: half these rules are "at most 0", a kept week is a
   week of zeroes, and an area lying flat on the axis with no dots on it reads
   as no data rather than as nothing happening, which was the point.

   Shared by the goal streak and the custom ones. For the goal streak the area
   is hours and the line is that weekday's goal, which is why the limit is per
   row rather than a single constant: seven different goals is the normal case.
--------------------------------------------------------------- */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { chartTooltip } from "../lib/theme"
import type { Palette } from "../lib/theme"
import { usePalette } from "../ui/useTheme"

export interface StreakChartRow {
  label: string
  value: number
  /** The line this row has to clear, or stay under. Null where none applies. */
  limit: number | null
  /** Did this row break the rule? The panel decides; the chart only paints. */
  broken: boolean
  /** Frozen rows are neither kept nor broken — they were paid for. */
  frozen?: boolean
}

/** A period's verdict as a colour — the same three the strip and the cards use. */
const dotColor = (row: StreakChartRow, c: Palette, tint: string) =>
  row.frozen ? c.freeze : row.broken ? c.exam : tint

/**
 * What Recharts hands a custom dot. Typed here rather than imported: its own
 * dot props are a union wide enough that every field is optional anyway, and
 * this says exactly what the renderer reads.
 */
interface DotArgs {
  cx?: number
  cy?: number
  index?: number
  payload?: StreakChartRow
}

export function StreakChart({
  rows,
  tint,
  valueName,
  limitName,
  formatter,
}: {
  rows: StreakChartRow[]
  tint: string
  valueName: string
  limitName: string
  /**
   * Hours want "2h 30m"; counts want the plain number. Used for the tooltip
   * *and* the axis, so a chart cannot label its ticks in one unit and its
   * area in another.
   */
  formatter?: (n: number) => string
}) {
  const c = usePalette()
  // One point and a limit line is a perfectly readable answer to "how did
  // today go"; only nothing at all is worth withholding. A day-long period, or
  // a rule written this morning, would otherwise show an empty gap.
  if (!rows.length) return null

  const anyLimit = rows.some((r) => r.limit != null)
  // A year of days is 365 dots on a 150px chart, which is a smear rather than
  // a reading. Past that the area's own shape is the signal and the tooltip
  // carries the verdict.
  const dots = rows.length <= 45
  // A period of one — the day view, or a rule written this morning — has no
  // line and no area, only where the two points sit. So both of them are
  // drawn larger and the limit gets a dot of its own, since a step line
  // through a single point renders nothing at all.
  const lone = rows.length === 1

  const renderDot = ({ cx, cy, index, payload }: DotArgs) => {
    if (!payload || cx == null || cy == null)
      return <g key={`gap-${index}`} />
    return (
      <circle
        key={payload.label}
        cx={cx}
        cy={cy}
        // The two that cost you something are drawn bigger. A kept day is a
        // point on a line; a missed one is a thing to look at.
        r={lone ? 5 : payload.broken || payload.frozen ? 3.5 : 2.5}
        fill={dotColor(payload, c, tint)}
        stroke={c.card}
        strokeWidth={1}
      />
    )
  }

  return (
    <div className="mb-3">
      {/* `min-w-0` on the wrapper: a Recharts container carries its own
          minimum width, and inside a grid that turns into page-level
          horizontal overflow rather than a chart that shrinks. */}
      <div className="min-w-0" style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
          >
            {/* Horizontal only. The analytics charts rule both ways, but they
                are 260px tall in a card of their own; at 150px in a panel a
                line per day stands between you and the shape. */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={`${c.ink}22`}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}66` }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}66` }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
              // A rule about hours carries minutes, so an unformatted axis
              // would read "180" against a point the tooltip calls "3h". Zero
              // stays bare: the origin is a scale mark, and "0m" is a
              // duration nobody spent.
              tickFormatter={
                formatter && ((v) => (v === 0 ? "0" : formatter(v)))
              }
            />
            <Tooltip
              contentStyle={chartTooltip(c)}
              formatter={(value, name) => [
                formatter ? formatter(Number(value)) : `${value}`,
                name,
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={valueName}
              stroke={tint}
              fill={tint}
              fillOpacity={0.25}
              strokeWidth={2}
              dot={dots ? renderDot : false}
              activeDot={{ r: 4 }}
            />
            {anyLimit && (
              /* `stepAfter`, not the `monotone` the analytics goal line uses:
                 the limit really is a step — seven weekday goals, or a rule
                 whose number you changed — and sloping between two of them
                 draws values that were never anybody's limit. */
              <Line
                type="stepAfter"
                dataKey="limit"
                name={limitName}
                stroke={c.ink}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={lone ? { r: 3, fill: c.ink, stroke: "none" } : false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
