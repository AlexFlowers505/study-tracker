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

   **Arcs are as long as the rule is heavy** — `StreakRule.weight`, 1 to 5,
   heaviest first at twelve o'clock so the same rule sits in the same place on
   every day of the month. A missed arc keeps a **floor** on its length, and
   that floor is what keeps the weighting honest: a ring 90% green on a broken
   day says "basically fine" far more loudly than five equal segments with one
   red one, and nothing here may read as a score.

   **Not in the month grid.** At the sixteen pixels a month cell can spare,
   five arcs and their gaps are a smudge; the grid gets a segment bar instead,
   which is the same information in a shape that survives being small. This is
   for the places a day has room: the week's cards, the day view, the dialog.

   **It opens.** Clicking it shows the day rule by rule — what each asked for
   and what it got. On a kept day that is the thing worth looking at, which is
   half the reason to keep one.

   **Today is drawn as provisional, never as kept.** A rule like *no YouTube
   after six* is satisfied at nine in the morning by having done nothing yet,
   and drawing that as a closed green ring congratulates you for a day you have
   not lived. So while the day is still running, a held arc is the kept colour
   turned down and the centre figure stays neutral: the ring says *so far*,
   which is the only thing anybody can honestly say before midnight.

   It is a **drawing** and nothing else — the verdict, the streak and the
   balance are untouched. Making today genuinely unjudged would drop the
   headline number by one every morning and restore it at midnight, which is a
   worse lie than the one it fixes.
--------------------------------------------------------------- */

import type { RuleState } from "../lib/customStreaks"
import type { DayReport } from "../lib/dayVerdict"
import { ruleWeight } from "../lib/dayVerdict"
import { PopoverMenu } from "../ui/PopoverMenu"
import { RenderIcon } from "../ui/icons"
import { usePalette } from "../ui/useTheme"

/** How wide the empty part of the track is, as a fraction of one arc's slot. */
const GAP_SHARE = 0.1

/** Below this many rules the gaps can be generous; above it they must not be. */
const CROWDED = 8

/**
 * The least of the circle a single arc may take, as a fraction.
 *
 * Only a missed one is held to it. A light rule that held can shrink away
 * quietly — nothing is lost by not noticing it — but a light rule that broke
 * must stay visible, or a weighted ring starts reading as "how much of the day
 * did I get", which is exactly the score it must never be.
 */
const MISS_FLOOR = 0.12

export function VerdictRing({
  report,
  size = 40,
  provisional = false,
}: {
  report: DayReport
  /** The outer box. The stroke scales with it, not the other way round. */
  size?: number
  /** The day is still running, so nothing it holds is settled. */
  provisional?: boolean
}) {
  const c = usePalette()
  const n = report.judged
  if (!n) return null

  const stroke = Math.max(3, Math.round(size * 0.12))
  const r = size / 2 - stroke / 2 - 1
  const circumference = 2 * Math.PI * r

  /* Each rule's share of the circle, by weight — then a floor applied to the
     ones that missed, and the rest rescaled to make room for it. Rescaling
     rather than overflowing is what keeps the circle a circle. */
  const raw = report.readings.map((x) => ruleWeight(x.rule))
  const total = raw.reduce((a, b) => a + b, 0) || 1
  const floored = report.readings.map((x, i) =>
    x.state === "missed" ? Math.max(raw[i] / total, MISS_FLOOR) : raw[i] / total,
  )
  const scale = floored.reduce((a, b) => a + b, 0)
  const shares = floored.map((f) => f / scale)

  /* **One rule is a closed circle, with no gap at all.**

     The gaps divide one arc from the next, and with a single arc there is
     nothing to divide — so a kept day under a single rule was drawing a ring
     with a bite out of the top, which reads as "something is missing" when the
     whole message is that nothing is. A divider needs two things to stand
     between. */
  const gap =
    n === 1
      ? 0
      : (circumference / n) * (n > CROWDED ? GAP_SHARE / 2 : GAP_SHARE)

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
  // be the drawing quietly disagreeing with the ledger. A miss is a miss even
  // today — nothing undoes it — so only the *kept* reading waits for midnight.
  const centre =
    report.state === "missed"
      ? c.exam
      : report.state === "frozen"
        ? c.freeze
        : report.state === "kept" && !provisional
          ? c.goalMet
          : `${c.ink}55`

  const missed = report.readings.filter((x) => x.state === "missed")
  const frozen = report.readings.filter((x) => x.state === "frozen")
  // Said in words as well as drawn, since a screen reader gets the label and
  // not the opacity.
  const sofar = provisional ? " so far — the day is not over" : ""
  const tip =
    report.state === "kept"
      ? `All ${n} kept${sofar}`
      : [
          missed.length
            ? `Missed: ${missed.map((x) => x.rule.label).join(", ")}`
            : "",
          frozen.length
            ? `Frozen: ${frozen.map((x) => x.rule.label).join(", ")}`
            : "",
          `${report.kept} of ${n} kept${sofar}`,
        ]
          .filter(Boolean)
          .join(String.fromCharCode(10))

  const svg = (
    <>
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
          {report.readings.map((reading, i) => {
            const start =
              shares.slice(0, i).reduce((a, b) => a + b, 0) * circumference
            const arc = Math.max(shares[i] * circumference - gap, 0.5)
            return (
              <circle
                key={reading.rule.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={colourFor(reading.state)}
                /* Turned down while the day can still turn. Only what is
                   *held* is provisional: a miss cannot be un-missed by the
                   afternoon, and a freeze is already spent. */
                strokeOpacity={
                  provisional && reading.state === "met" ? 0.45 : 1
                }
                strokeDasharray={`${arc} ${circumference - arc}`}
                strokeDashoffset={-(start + gap / 2)}
              />
            )
          })}
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
    </>
  )

  /* A popover rather than a dialog: the day dialog already exists for editing,
     and this is for reading. Everything in it is already in `readings` — this
     is a drawing, not a mechanism. */
  return (
    <PopoverMenu
      width={230}
      label={tip}
      wrapClassName="shrink-0 flex items-center"
      triggerClassName="flex items-center rounded-full"
      trigger={svg}
    >
      {() => <VerdictDetail report={report} />}
    </PopoverMenu>
  )
}

/** The day, rule by rule. Worth looking at on a kept day, which is the point. */
function VerdictDetail({ report }: { report: DayReport }) {
  const c = usePalette()
  const colourFor = (state: RuleState) =>
    state === "met"
      ? c.goalMet
      : state === "frozen"
        ? c.freeze
        : state === "missed"
          ? c.exam
          : `${c.ink}55`
  const word = (state: RuleState) =>
    state === "met"
      ? "kept"
      : state === "frozen"
        ? "frozen"
        : state === "missed"
          ? "missed"
          : "not yet"

  return (
    <div className="p-1">
      <p className="px-2 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40">
        {report.kept} of {report.judged} kept
      </p>
      {report.readings.map(({ rule, state }) => (
        <div
          key={rule.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
        >
          <span
            className="flex items-center shrink-0"
            style={{ color: rule.color }}
          >
            <RenderIcon name={rule.iconName} size={12} />
          </span>
          <span className="text-[11px] font-mono truncate text-ink/75">
            {rule.label}
          </span>
          <span
            className="ml-auto shrink-0 text-[10px] font-mono uppercase tracking-widest"
            style={{ color: colourFor(state) }}
          >
            {word(state)}
          </span>
        </div>
      ))}
    </div>
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
