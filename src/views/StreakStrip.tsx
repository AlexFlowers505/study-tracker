/* ---------------------------------------------------------------
   The selected period as cells, one per day, and the only place a freeze is
   spent.

   Shared by the goal streak and every custom one, because they are the same
   question drawn twice: which days did this rule keep, and which one am I
   about to pay for. Two strips that could drift apart would be two answers.

   **A calendar grid, not a row.** Seven columns with the weekdays fixed, so a
   month stacks into weeks and a rule that only judges Mondays reads down a
   column. A single row would work for a week and for nothing else, and the
   period bar can hand this a year.

   Days outside the period still take their cell, blank. Dropping them would
   shift every row's weekday alignment, which is the one thing the grid is for.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import { Snowflake } from "lucide-react"
import type { DayKey } from "../types/model"
import { WEEKDAY_ORDER, addDays, fromKey, startOfWeek, toKey } from "../lib/date"
import { btnBase } from "../lib/theme"
import { PopoverMenu } from "../ui/PopoverMenu"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** The five things a day can be to a streak. `unjudged` covers both "the rule
 *  does not apply" and "outside the period". */
export type StripState = "met" | "frozen" | "missed" | "pending" | "unjudged"

export interface StripCell {
  key: DayKey
  state: StripState
  /** Printed in the cell. A count, an "h" figure, or nothing. */
  value?: ReactNode
  tooltip: string
  /** Present only when a freeze can actually be spent here. */
  freeze?: {
    cost: number
    available: number
    label: string
    onSpend: () => void
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** One letter per weekday at these sizes — three would wrap in a month grid. */
const INITIALS: Record<number, string> = {
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
  0: "S",
}

export function StreakStrip({
  cells,
  note,
}: {
  /** In date order. Gaps are fine; the grid fills the rest of each week. */
  cells: StripCell[]
  /** The line under the grid saying when a freeze can be spent at all. */
  note?: ReactNode
}) {
  const c = usePalette()
  if (!cells.length) return null

  const byKey = new Map(cells.map((cell) => [cell.key, cell]))
  const first = startOfWeek(fromKey(cells[0].key))
  const last = fromKey(cells[cells.length - 1].key)

  const grid: DayKey[] = []
  for (let d = first; d <= last || grid.length % 7 !== 0; d = addDays(d, 1))
    grid.push(toKey(d))

  // One row is a week you can read across; twelve is a block you scan. The
  // taller cells only make sense while there are few enough of them to look
  // at one at a time.
  const weeks = grid.length / 7
  const roomy = weeks <= 1

  const tintFor = (state: StripState) =>
    state === "met"
      ? c.goalMet
      : state === "frozen"
        ? c.freeze
        : state === "missed"
          ? c.exam
          : null

  return (
    <div className="mb-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_ORDER.map((wd) => (
          <span
            key={wd}
            className="text-[9px] font-mono uppercase tracking-widest text-ink/35 text-center"
          >
            {INITIALS[wd]}
          </span>
        ))}
      </div>

      {/* Capped and scrollable: "all time" is a year of rows, and a panel that
          pushes the log off the screen to show it is worse than one you
          scroll inside. */}
      <div className="grid grid-cols-7 gap-1 max-h-64 overflow-y-auto">
        {grid.map((key) => {
          const cell = byKey.get(key)
          if (!cell)
            return (
              <span
                key={key}
                className="rounded-lg"
                style={{ backgroundColor: `${c.ink}05`, minHeight: roomy ? 40 : 26 }}
              />
            )

          const tint = tintFor(cell.state)
          /* **A freezable day says so at rest.**

             It used to differ from its neighbours only by `hover:brightness`,
             which is no affordance at all: you had to already know that some
             of these cells do something in order to go looking for the one
             that does. An inset hairline in the freeze colour is the cheapest
             mark that survives being 26 pixels tall, and it uses the colour
             that already means "freeze" everywhere else in the app. */
          const body = (
            <div
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg"
              style={{
                backgroundColor: tint ? `${tint}24` : `${c.ink}0A`,
                color: tint || `${c.ink}55`,
                minHeight: roomy ? 40 : 26,
                ...(cell.freeze
                  ? { boxShadow: `inset 0 0 0 1.5px ${c.freeze}80` }
                  : {}),
              }}
            >
              <span
                className={`font-mono font-bold ${roomy ? "text-[11px]" : "text-[9px]"}`}
              >
                {cell.state === "frozen" ? (
                  <Snowflake size={roomy ? 11 : 9} strokeWidth={3} />
                ) : (
                  (cell.value ?? "·")
                )}
              </span>
            </div>
          )

          // Both branches sit in the same shell — a flex item, so the wrapper
          // `Tip` and `PopoverMenu` each put around their child is a flex item
          // too and stops being an inline box. Without it the freezable day
          // renders half a line below its neighbours.
          if (!cell.freeze)
            return (
              <div key={key} className="flex min-w-0">
                {/* `multiline`, because a cell's tooltip is now a list: the
                    date, then one line per thing that condition had to say.
                    `whitespace-pre-line` is what turns the newlines into
                    lines, and without it they collapse to spaces and the
                    splitting was for nothing. */}
                <Tip
                  multiline
                  text={cell.tooltip}
                  className="flex-1 min-w-0 flex"
                >
                  {body}
                </Tip>
              </div>
            )

          const { cost, available, label, onSpend } = cell.freeze
          return (
            <div key={key} className="flex min-w-0">
              <PopoverMenu
                width={210}
                label={cell.tooltip}
                multiline
                wrapClassName="flex-1 min-w-0 flex"
                triggerClassName={`${btnBase} flex w-full rounded-lg cursor-pointer hover:brightness-110`}
                trigger={body}
              >
                {(close) => (
                  <div>
                    <p className="px-2.5 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40">
                      {label}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onSpend()
                        close()
                      }}
                      className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono hover:bg-ink/5`}
                      style={{ color: c.freeze }}
                    >
                      Freeze this day
                      <span className="block text-[10px] text-ink/45">
                        costs {plural(cost, "freeze")} of {available} available
                      </span>
                    </button>
                  </div>
                )}
              </PopoverMenu>
            </div>
          )
        })}
      </div>

      {/* Why a red day offers nothing. Silence there reads as a broken button,
          and the reasons behind it are completely different problems. */}
      {note && <p className="mt-1.5 text-[10px] font-mono text-ink/35">{note}</p>}
    </div>
  )
}
