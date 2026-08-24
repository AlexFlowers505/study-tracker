/* ---------------------------------------------------------------
   The day's verdict as a ring — `spec 010`, part 1, the drawing half.

   One arc per rule that had a vote. **Closed means kept**, and that is the
   whole idea: a day becomes an object you *shut*, the way Apple's rings are
   shut, rather than a tint you notice. The tint on the card says the same
   thing and says it well from across the room; what it cannot say is which of
   the five you dropped, and "which one" is the only part you can act on.

   **It draws partial; it does not mean partial.** Four arcs of five is drawn
   as one segment short of closed, which is honest and useful — but the verdict
   underneath is still a miss, and the streak and the balance treat it as one.
   That split is deliberate and is Decision 1 of the spec: the moment 4/5
   almost counts, the verdict stops being a verdict. So the centre figure goes
   red at four out of five, and the gap in the ring says where it went.

   **Not in the month grid.** At the sixteen pixels a month cell can spare,
   five arcs and their gaps are a smudge; the grid gets a segment bar instead,
   which is the same information in a shape that survives being small. This is
   for the places a day has room: the week's cards, the day view, the dialog.
--------------------------------------------------------------- */

import type { RuleState } from "../lib/customStreaks"
import type { DayReport } from "../lib/dayVerdict"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** How wide the empty part of the track is, as a fraction of one arc's slot. */
const GAP_SHARE = 0.18

/** Below this many rules the gaps can be generous; above it they must not be. */
const CROWDED = 8

export function VerdictRing({
  report,
  size = 40,
}: {
  report: DayReport
  /** The outer box. The stroke scales with it, not the other way round. */
  size?: number
}) {
  const c = usePalette()
  const n = report.judged
  if (!n) return null

  const stroke = Math.max(3, Math.round(size * 0.12))
  const r = size / 2 - stroke / 2 - 1
  const circumference = 2 * Math.PI * r
  const slot = circumference / n
  // Crowded rings lose most of their gap rather than most of their arc: an arc
  // too short to see is a rule that has silently stopped reporting.
  const gap = slot * (n > CROWDED ? GAP_SHARE / 2 : GAP_SHARE)
  const arc = slot - gap

  const colourFor = (state: RuleState) =>
    state === "met"
      ? c.goalMet
      : state === "frozen"
        ? c.freeze
        : state === "missed"
          ? c.exam
          : `${c.ink}1F`

  // The centre figure carries the verdict, not the count of what held: a day
  // at four of five is a missed day, and printing "4" in the kept colour would
  // be the drawing quietly disagreeing with the ledger.
  const centre =
    report.state === "missed"
      ? c.exam
      : report.state === "frozen"
        ? c.freeze
        : report.state === "kept"
          ? c.goalMet
          : `${c.ink}55`

  const missed = report.readings.filter((x) => x.state === "missed")
  const frozen = report.readings.filter((x) => x.state === "frozen")
  const tip =
    report.state === "kept"
      ? `All ${n} kept`
      : [
          missed.length
            ? `Missed: ${missed.map((x) => x.rule.label).join(", ")}`
            : "",
          frozen.length
            ? `Frozen: ${frozen.map((x) => x.rule.label).join(", ")}`
            : "",
          `${report.kept} of ${n} kept`,
        ]
          .filter(Boolean)
          .join(String.fromCharCode(10))

  return (
    <Tip text={tip} className="shrink-0 flex items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={tip}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`${c.ink}0F`}
          strokeWidth={stroke}
        />
        {/* Rotated so the first arc starts at twelve o'clock — a ring read from
            anywhere else has no beginning, and the order is the rule order. */}
        <g
          fill="none"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        >
          {report.readings.map((reading, i) => (
            <circle
              key={reading.rule.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colourFor(reading.state)}
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={-(i * slot + gap / 2)}
            />
          ))}
        </g>
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-monospace, monospace"
          fontSize={Math.round(size * 0.28)}
          fontWeight={700}
          fill={centre}
        >
          {report.kept}
        </text>
      </svg>
    </Tip>
  )
}

/* ---------------------------------------------------------------
   The same reading as a bar — for the month grid, where the ring cannot go.

   Segments in the rule's own order, so a column of days can be read
   vertically: "the second rule broke three times this week" is a question the
   ring cannot answer at any size, because a ring has no fixed left edge.
--------------------------------------------------------------- */

export function VerdictBar({ report }: { report: DayReport }) {
  const c = usePalette()
  if (!report.judged) return null

  const colourFor = (state: RuleState) =>
    state === "met"
      ? c.goalMet
      : state === "frozen"
        ? c.freeze
        : state === "missed"
          ? c.exam
          : `${c.ink}26`

  return (
    <span className="flex gap-[1.5px] w-full h-[3px]" aria-hidden>
      {report.readings.map((reading) => (
        <span
          key={reading.rule.id}
          className="flex-1 rounded-[1px]"
          style={{ backgroundColor: colourFor(reading.state) }}
        />
      ))}
    </span>
  )
}
