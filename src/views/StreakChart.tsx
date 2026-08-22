/* ---------------------------------------------------------------
   The rule, drawn against the period.

   The strip above it says *which* days were kept; this says *by how much*, and
   that is the number the whole freeze economy runs on. "Missed" is a colour;
   "three when the limit was nought" is the thing you can do something about.

   One bar per judged period and a dashed line at the limit, so breaking the
   rule is literally crossing it. Bars that broke it take the miss colour and
   the rest take the streak's own, which means the chart reads the same way as
   the strip and the day cards without anything new to learn.

   Shared by the goal streak and the custom ones. For the goal streak the bar
   is hours and the line is that weekday's goal, which is why the limit is per
   row rather than a single constant: seven different goals is the normal case.
--------------------------------------------------------------- */

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { chartTooltip } from "../lib/theme"
import { usePalette } from "../ui/useTheme"

export interface StreakChartRow {
  label: string
  value: number
  /** The bar this row has to clear, or stay under. Null where none applies. */
  limit: number | null
  /** Did this row break the rule? The panel decides; the chart only paints. */
  broken: boolean
  /** Frozen rows are neither kept nor broken — they were paid for. */
  frozen?: boolean
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
  /** Hours want "2h 30m"; counts want the plain number. */
  formatter?: (n: number) => string
}) {
  const c = usePalette()
  // One bar and a limit line is a perfectly readable answer to "how did today
  // go"; only nothing at all is worth withholding. A day-long period, or a
  // rule written this morning, would otherwise show an empty gap.
  if (!rows.length) return null

  const anyLimit = rows.some((r) => r.limit != null)

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
            <CartesianGrid strokeDasharray="2 4" stroke={`${c.ink}14`} vertical={false} />
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
            />
            <Tooltip
              contentStyle={chartTooltip(c)}
              formatter={(value, name) => [
                formatter ? formatter(Number(value)) : `${value}`,
                name,
              ]}
            />
            {/* `minPointSize` so a zero still draws. Half these rules are
                "at most 0" — never oversleep, no youtube after nine — and a
                week of keeping one perfectly is a week of zeroes. Without a
                stub at the axis that chart is blank, which reads as "no data"
                rather than as "nothing happened, which was the point". */}
            <Bar
              dataKey="value"
              name={valueName}
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              minPointSize={2}
            >
              {rows.map((r, i) => (
                <Cell
                  key={i}
                  fill={r.frozen ? c.freeze : r.broken ? c.exam : tint}
                  fillOpacity={r.frozen ? 0.7 : r.broken ? 0.75 : 0.55}
                />
              ))}
            </Bar>
            {anyLimit && (
              <Line
                type="stepAfter"
                dataKey="limit"
                name={limitName}
                stroke={c.ink}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
