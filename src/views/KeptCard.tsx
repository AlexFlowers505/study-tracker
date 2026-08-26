/* ---------------------------------------------------------------
   The composite's two figures, as pieces the streaks row composes.

   Every rule you write judges its own thing and keeps its own run. The
   composite is what they add up to: **a day is kept when every rule that gets
   a vote held**, and this is the run of those days. It is the one number in
   the app that belongs to no single promise, which is why it wears the
   project's own tint rather than any streak's.

   **Two scales, because a run of days has exactly one point of loss.** Twenty
   goes to nought, and while it is short there is almost nothing there to
   protect — so the first week of a new rule is the week you are least invested
   in and the likeliest to drop, which is precisely backwards. A week-sized
   unit fixes it from the other end: a bad Tuesday costs you the week rather
   than everything, and on Monday there is always something to start again.

   **One verb at both sizes.** `days kept` and `weeks kept`, not "streak" and
   "perfect weeks" — a design with two words for one idea is a design nobody
   can keep straight, and the week is exactly the day's rule applied to seven
   of them.

   **This was a card of its own and is not any more.** It sat above the streaks
   row as a second block saying the same sort of thing, and two stacked
   surfaces for *how am I doing* is one too many. The days figure is now the
   first thing on the streaks row itself, and the weeks — the busiest part,
   a dozen squares — moved inside the fold, where detail belongs.
--------------------------------------------------------------- */

import { Flame } from "lucide-react"
import type { KeptWeeks, WeekMark } from "../lib/dayVerdict"
import { fromKey, toKey } from "../lib/date"
import { btnBase } from "../lib/theme"
import type { Palette } from "../lib/theme"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/**
 * How many weeks the row of squares shows.
 *
 * The squares follow the period bar, not the project: they were the last twelve
 * weeks whatever the page showed, and in Week mode that is eleven weeks nobody
 * asked about — most of them, on any real history, red. **A wall of old
 * failures is not information, it is a mood.** A cap survives for the long
 * periods, where a year is 52 squares and stops being a row you read.
 */
const CAP = 26

const fmtWeek = (start: string): string => {
  const d = fromKey(start)
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const weekTip = (mark: WeekMark): string => {
  const week = `Week of ${fmtWeek(mark.start)}`
  if (mark.state === "kept") return `${week} — every day held`
  if (mark.state === "frozen") return `${week} — held, with a freeze spent`
  if (mark.state === "missed") return `${week} — a day was missed`
  if (mark.state === "pending") return `${week} — still in play`
  return `${week} — nothing judged it`
}

const weekColour = (mark: WeekMark, c: Palette): string | undefined => {
  if (mark.state === "kept") return c.goalMet
  if (mark.state === "frozen") return c.freeze
  if (mark.state === "missed") return c.exam
  return undefined
}

/**
 * One week as a square.
 *
 * The week in play is drawn as an outline, never as a fill or a gap: filled it
 * would claim something that has not been earned, and absent it would take
 * away the only thing worth seeing on a Wednesday, which is that there is
 * still a square there to lose.
 */
function WeekSquare({ mark }: { mark: WeekMark }) {
  const c = usePalette()
  const fill = weekColour(mark, c)
  return (
    <Tip text={weekTip(mark)}>
      <span
        className="block w-2.5 h-2.5 rounded-[3px]"
        style={
          fill
            ? { backgroundColor: fill }
            : { border: `1px dashed ${c.ink}59` }
        }
      />
    </Tip>
  )
}

/**
 * **The run of kept days** — the number this whole design exists to make you
 * afraid of losing, and therefore the first thing on the row.
 *
 * A button, because it opens the breakdown: on a bad month the question stops
 * being *how am I doing* and becomes *which promise keeps doing this to me*,
 * and that is a different panel. It is not the row's own disclosure — the
 * chevron at the far end is — so the two live side by side rather than nested,
 * which a button inside a button could not do.
 */
export function KeptFigure({
  days,
  onOpen,
  open,
}: {
  days: { current: number; best: number }
  onOpen: () => void
  open: boolean
}) {
  const c = usePalette()
  return (
    <Tip text="What the streak is made of — which rules broke which days">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className={`${btnBase} flex items-baseline gap-1.5 rounded-full px-1 -mx-1 hover:bg-ink/5`}
      >
        <Flame
          size={12}
          strokeWidth={3}
          className="self-center shrink-0"
          style={{ color: c.project }}
        />
        <span
          className="text-[15px] font-mono font-bold tabular-nums leading-none"
          style={{ color: c.project }}
        >
          {days.current}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45">
          days
        </span>
      </button>
    </Tip>
  )
}

/**
 * **This period's weeks**, and how many of them held.
 *
 * The days half is the *streak* — project-wide, the thing you are guarding.
 * This half is the period's record, `3/4`, and its squares are the period's
 * weeks. Both said "in a row" once, which was one fact drawn twice.
 *
 * Inside the fold rather than on the row: a dozen squares is the busiest thing
 * here, and it answers a question you ask on purpose rather than one you need
 * answered every time the page loads.
 */
export function WeeksRow({
  weeks,
  rangeStart,
  rangeEnd,
}: {
  weeks: KeptWeeks
  rangeStart: Date
  rangeEnd: Date
}) {
  const c = usePalette()
  const from = toKey(rangeStart)
  const to = toKey(rangeEnd)
  /* By the Monday, so a week counts as this period's when it *starts* inside
     it. Overlap would put January's last week under February as well, and one
     week appearing twice in the same row is the kind of thing you only notice
     after trusting the count for a month. */
  const inRange = weeks.weeks.filter((w) => w.start >= from && w.start <= to)
  if (!inRange.length) return null
  const shown = inRange.slice(-CAP)
  const kept = inRange.filter(
    (w) => w.state === "kept" || w.state === "frozen",
  ).length

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="text-[11px] font-mono font-bold tabular-nums leading-none"
        style={{ color: kept === inRange.length ? c.goalMet : c.ink }}
      >
        {kept}
        <span className="text-ink/30">/{inRange.length}</span>
      </span>
      <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40 shrink-0">
        {inRange.length === 1 ? "week kept" : "weeks kept"}
      </span>
      {weeks.current > 0 && (
        <span className="text-[9px] font-mono text-ink/30 tabular-nums shrink-0">
          run {weeks.current}
        </span>
      )}
      {/* Oldest first, so the row reads left to right like everything else
          that has a date on it. */}
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        {shown.map((mark) => (
          <WeekSquare key={mark.start} mark={mark} />
        ))}
      </div>
    </div>
  )
}
