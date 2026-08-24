/* ---------------------------------------------------------------
   A weekly rule's week, as a burn-down — `spec 010`, part 2, the drawing.

   `weekLostOn` has known the day a week stopped being winnable since stage 3,
   and the day's colour has used it. That is the right answer to the wrong
   question: by the time the app can say "lost", the week that could have been
   saved is behind you. **The useful question is asked on the Wednesday** —
   three trips wanted, one done, two days left — and it is the only question
   here that changes what you do this evening.

   So: one bar per weekday, the week's own seven columns, with the summary
   above it in the same words a person would use. Green while you are ahead of
   an even split, amber while you are behind but could still make it, red from
   the day the arithmetic stopped allowing it.

   **Amber is the point of the whole card.** Green and red were already
   drawable — the strip has always had them. Neither is actionable: green says
   nothing is wrong, red says nothing can be done. A weekly rule spends most of
   its life in the state between, and the app had no colour for it.

   **The two operators burn in opposite directions.** Under `atLeast` the bar
   is a debt and should reach nothing by Sunday; under `atMost` it is a budget
   and should not fill. Forcing one shape onto both would put "good" at the top
   of the chart for one rule and at the bottom for the next.
--------------------------------------------------------------- */

import type { ClausePace, PaceState } from "../lib/customStreaks"
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "../lib/date"
import { fmtHours } from "../lib/time"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** Tall enough to compare two bars by eye, short enough to sit above a strip. */
const HEIGHT = 34

export function PaceCard({ pace }: { pace: ClausePace }) {
  const c = usePalette()
  const fmt = (n: number) =>
    pace.measure === "time" ? fmtHours(n) : String(n)

  const colourFor = (state: PaceState) =>
    state === "ahead"
      ? c.goalMet
      : state === "behind"
        ? c.warn
        : state === "lost"
          ? c.exam
          : `${c.ink}12`

  // Bars are drawn against the tallest thing on the chart, not against the
  // limit: an `atMost` week that went over has bars past the limit, and
  // clipping them would hide the one fact the card exists to report.
  const peak = Math.max(pace.limit, ...pace.days.map((d) => d.bar), 1)

  const done = pace.op === "atLeast" && pace.value >= pace.limit
  const status = pace.lostOn
    ? "lost"
    : done
      ? "done"
      : `${pace.daysLeft} ${pace.daysLeft === 1 ? "day" : "days"} left`

  const statusColour = pace.lostOn
    ? c.exam
    : done
      ? c.goalMet
      : `${c.ink}70`

  return (
    <div className="rounded-xl bg-ink/[0.04] px-3 py-2.5 mb-2">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink/55 truncate">
          {pace.label} · {pace.op === "atMost" ? "at most" : "at least"}{" "}
          {fmt(pace.limit)} a week
        </span>
        <span
          className="text-[10px] font-mono shrink-0 tabular-nums"
          style={{ color: statusColour }}
        >
          {fmt(pace.value)} / {fmt(pace.limit)} · {status}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-[3px]" style={{ height: HEIGHT }}>
        {pace.days.map((day, i) => {
          const height = peak > 0 ? Math.round((day.bar / peak) * 100) : 0
          const label =
            day.state === "outside"
              ? `${WEEKDAY_LABELS[WEEKDAY_ORDER[i]]} — not judged by this condition`
              : `${WEEKDAY_LABELS[WEEKDAY_ORDER[i]]} — ${fmt(day.cumulative)} of ${fmt(
                  pace.limit,
                )}${
                  day.state === "lost"
                    ? ", already lost"
                    : day.state === "future"
                      ? ", still to come"
                      : day.state === "behind"
                        ? ", behind the pace"
                        : ", on pace"
                }`
          return (
            <Tip key={day.key} text={label} className="flex items-end h-full">
              {/* The track is drawn even where the bar is nothing, so a week of
                  zeroes reads as seven kept days rather than as no data — the
                  same trap the streak chart's dots were added to avoid. */}
              <span className="block w-full h-full flex items-end rounded-[2px] bg-ink/[0.03]">
                <span
                  className="block w-full rounded-[2px]"
                  style={{
                    height: `${Math.max(height, day.state === "outside" ? 0 : 4)}%`,
                    backgroundColor: colourFor(day.state),
                  }}
                />
              </span>
            </Tip>
          )
        })}
      </div>

      {/* No weekday row of its own. `StreakStrip` renders immediately below
          this in the panel and carries one, over seven Monday-first columns in
          the same order — two rows of the same seven letters four lines apart
          is a label drawn twice, not a label. With several conditions the
          cards stack directly on each other, so that single header still reads
          down all of them. */}
      <p className="text-[9px] font-mono text-ink/35 mt-1.5">
        {pace.op === "atMost"
          ? "The bar is what you have spent of the week's allowance."
          : "The bar is what is still owed. It should reach nothing by Sunday."}
      </p>
    </div>
  )
}
