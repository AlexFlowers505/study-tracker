/* ---------------------------------------------------------------
   The composite, at both of its sizes — `spec 010`, part 1, finished.

   Every rule you write judges its own thing and keeps its own run. The
   composite is what they add up to: **a day is kept when every rule that gets
   a vote held**, and this is the run of those days. It is the one number in
   the app that belongs to no single promise, which is why it wears the
   project's own tint rather than any streak's.

   It had no home. `keptDays` was a figure on the collapsed streaks line, so it
   vanished the moment that row was opened, and vanished again whenever every
   streak was in trouble — the two moments you are most likely to be looking.
   A number nobody is afraid of losing is not doing the job this design gives
   it, and one you have to go and find is a number nobody is afraid of.

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
--------------------------------------------------------------- */

import { ChevronDown, Flame } from "lucide-react"
import type { KeptWeeks, WeekMark } from "../lib/dayVerdict"
import { fromKey, toKey } from "../lib/date"
import { btnBase } from "../lib/theme"
import type { Palette } from "../lib/theme"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/**
 * **The squares are the period's, not the project's.**
 *
 * They were the last twelve weeks whatever the page was showing, and in Week
 * mode that is eleven weeks nobody asked about — most of them, on any real
 * history, red. A wall of old failures is not information, it is a mood, and
 * it is the wrong one to put at the top of the page every morning.
 *
 * So the strip answers the same question the rest of the page is answering:
 * how did *this* go. A week shows its week, a month its four or five, and the
 * longer periods are where you go when you do want the whole record — the
 * period bar is already the control for that, and it should not need a second
 * one hiding in a card.
 *
 * A cap survives for the long periods: a year is 52 squares and `all` is
 * however many there are, which at ten pixels each stops being a row you read
 * and becomes a texture. Past the cap it is the most recent that show, since
 * the end of a period is the part you can still do something about.
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
            : {
                border: `1px dashed ${c.ink}59`,
              }
        }
      />
    </Tip>
  )
}

export function KeptCard({
  days,
  weeks,
  rangeStart,
  rangeEnd,
  onOpen,
  open,
}: {
  /** The run of kept days, and the longest there has ever been. */
  days: { current: number; best: number }
  weeks: KeptWeeks
  /** The period the page is showing. The squares follow it. */
  rangeStart: Date
  rangeEnd: Date
  /** Opens the panel underneath. */
  onOpen?: () => void
  open?: boolean
}) {
  const c = usePalette()
  const from = toKey(rangeStart)
  const to = toKey(rangeEnd)
  /* By the Monday, so a week counts as this period's when it *starts* inside
     it. Overlap would put January's last week under February as well, and one
     week appearing twice in the same row is the kind of thing you only notice
     after trusting the count for a month. */
  const inRange = weeks.weeks.filter((w) => w.start >= from && w.start <= to)
  const shown = inRange.slice(-CAP)
  const keptHere = inRange.filter(
    (w) => w.state === "kept" || w.state === "frozen",
  ).length

  /* **The chevron is the only thing saying this opens.** A raised card with a
     hover lift is a card; the row of streaks under it carries the same
     chevron and opens the same way, so one glyph teaches both. It turns
     rather than swapping, because what is behind it is the same panel either
     way — a different icon would claim a different destination. */
  const body = (
    /* `@container`, not a breakpoint: this sits at the full width of the page
       on a phone and inside a column on a desktop, and what decides whether
       the two scales share a line is the room here, not the size of the
       window. */
    <div className="flex items-center gap-2 w-full">
      <div className="@container flex-1 min-w-0 flex flex-col @sm:flex-row @sm:items-center gap-2 @sm:gap-0">
        {/* Days. The figure is the loudest thing in the row because it is the
            one being guarded. */}
        <div className="flex items-baseline gap-2 @sm:pr-4 min-w-0">
          <Flame
            size={12}
            strokeWidth={3}
            className="self-center shrink-0"
            style={{ color: c.project }}
          />
          <span
            className="text-[17px] font-mono font-bold tabular-nums leading-none"
            style={{ color: c.project }}
          >
            {days.current}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45">
            days kept
          </span>
          {days.best > days.current && (
            <span className="text-[9px] font-mono text-ink/30 tabular-nums">
              best {days.best}
            </span>
          )}
        </div>

        {/* A hairline, and only where the two actually sit side by side —
            stacked, the gap already separates them and a rule across the
            middle would read as a second card. */}
        <div className="hidden @sm:block self-stretch w-px bg-ink/10" />

        <div className="flex items-center gap-2 @sm:pl-4 min-w-0">
          {/* **The period's count, not the running one.** The days half is a
              streak — a thing you are guarding — and the weeks half is this
              period's record, which is the question the page is already
              asking everywhere else. Two figures that both said "in a row"
              would be one fact drawn twice. */}
          <span
            className="text-[13px] font-mono font-bold tabular-nums leading-none"
            style={{ color: keptHere === inRange.length ? c.goalMet : c.ink }}
          >
            {keptHere}
            <span className="text-ink/30">/{inRange.length}</span>
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 shrink-0">
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
      </div>

      {/* Outside the two scales rather than a third one: stacked on a phone a
          chevron inside them would drop to a line of its own, where it reads
          as something the weeks row does. */}
      {onOpen && (
        <ChevronDown
          size={14}
          aria-hidden
          className={`shrink-0 text-ink/30 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      )}
    </div>
  )

  if (!onOpen) return <div className="rounded-2xl bg-card shadow-sm px-3.5 py-2.5">{body}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      className={`${btnBase} w-full text-left rounded-2xl bg-card shadow-sm px-3.5 py-2.5 hover:brightness-105`}
    >
      {body}
    </button>
  )
}
