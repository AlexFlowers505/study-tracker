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
import { pluralOf, t, useT } from "../lib/i18n"
import { WEEKDAY_ORDER, addDays, fromKey, startOfWeek, toKey } from "../lib/date"
import { btnBase } from "../lib/theme"
import { PopoverMenu } from "../ui/PopoverMenu"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { Sentence } from "../ui/Sentence"

/** The six things a day can be to a streak. `unjudged` covers both "the rule
 *  does not apply" and "outside the period"; `watching` is a rule in force on
 *  a period it can neither win nor lose — a weekly rule's partial first week,
 *  `spec 018` — and wears no tint for the same reason `pending` does not.
 *  `lost` is a day inside a week that can no longer be won — `spec 027` —
 *  and wears `gone`, because both mean *nothing left to do here*. */
export type StripState =
  | "met"
  | "frozen"
  | "missed"
  | "pending"
  | "unjudged"
  | "watching"
  | "lost"

export interface StripCell {
  key: DayKey
  state: StripState
  /** Printed in the cell. A count, an "h" figure, or nothing. */
  value?: ReactNode
  tooltip: string
  /**
   * **What can be frozen here, one violation at a time** — `spec 017`.
   *
   * A list rather than a price, because a freeze is bought against one named
   * site that broke and not against the whole rule at once. Already-frozen
   * ones stay in it, marked: without them there is no way to see what you have
   * already paid for, and paying twice for one thing is the failure mode of
   * every ledger drawn as a button.
   */
  freeze?: {
    label: string
    items: {
      key: string
      /** Already quoted, for `Sentence`. */
      line: string
      cost: number
      available: number
      /** Affordable **on its own**: they are bought one at a time. */
      ok: boolean
      frozen: boolean
      /**
       * A weekly condition's site — `spec 027`. Its receipt is drawn by the
       * colour of the days it covered, never by this cell's corner: the
       * week's list rides on every day the week broke, and a Monday purchase
       * listed on the Thursday did not buy anything for the Thursday.
       */
      week?: boolean
      onSpend: () => void
    }[]
  }
}

const nFreezes = (n: number) =>
  pluralOf(n, ["freeze", "freezes"], ["заморозка", "заморозки", "заморозок"])

/** One letter per weekday at these sizes — three would wrap in a month grid.
 *  A getter, so the letters follow the language rather than freezing at
 *  import; `М В С Ч П С В` is what a Russian reader is looking for. */
const initial = (weekday: number): string =>
  t(
    {
      1: "wd:M",
      2: "wd:T",
      3: "wd:W",
      4: "wd:Th",
      5: "wd:F",
      6: "wd:Sa",
      0: "wd:Su",
    }[weekday] ?? "",
  )

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
  const t = useT()
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
          : state === "lost"
            ? c.gone
            : null

  return (
    <div className="mb-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_ORDER.map((wd) => (
          <span
            key={wd}
            className="text-[9px] font-mono uppercase tracking-widest text-ink/35 text-center"
          >
            {initial(wd)}
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
          /* **What has been paid for, on the cell itself.**

             Only a *fully* covered period turns colour — half a freeze saves
             nothing, and a blue cell that still breaks is the same lie as
             *four of five almost counts*. But a period can now be partly paid
             for, and until this mark the only way to find that out was to open
             the popover on every red cell in the row and read it. So the
             colour still answers *is this saved*, and a small snowflake in the
             corner answers *is anything here bought* — two different questions
             that were sharing one signal, with the second one silent. */
          const paid =
            cell.freeze?.items.filter((i) => i.frozen && !i.week).length ?? 0
          const part = paid > 0 && cell.state !== "frozen"
          /* **A freezable day says so at rest.**

             It used to differ from its neighbours only by `hover:brightness`,
             which is no affordance at all: you had to already know that some
             of these cells do something in order to go looking for the one
             that does. An inset hairline in the freeze colour is the cheapest
             mark that survives being 26 pixels tall, and it uses the colour
             that already means "freeze" everywhere else in the app. */
          const body = (
            <div
              className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg"
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
              {/* The figure stays: what the period *did* is still the thing
                  the cell reports, and a mark that replaced it would trade one
                  fact for another. It sits in the corner, in the freeze colour
                  the inset hairline round the same cell already uses, so the
                  two read as one sentence — *something can be bought here, and
                  some of it has been*. */}
              {part && (
                <span
                  /* Inside the cell, not on its edge. The same hairline ring
                     that says *something can be bought here* runs round that
                     corner in this very colour, and a mark sitting on it read
                     as a thickening of the border rather than as a mark. */
                  className="absolute top-[3px] right-[3px] leading-none"
                  style={{ color: c.freeze }}
                >
                  <Snowflake size={roomy ? 9 : 7} strokeWidth={3} />
                </span>
              )}
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

          const { label, items } = cell.freeze
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
                    {items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        disabled={item.frozen || !item.ok}
                        onClick={() => {
                          item.onSpend()
                          close()
                        }}
                        className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono ${
                          item.frozen || !item.ok
                            ? "cursor-default"
                            : "hover:bg-ink/5"
                        }`}
                        style={{
                          color: item.frozen ? `${c.ink}55` : c.freeze,
                          opacity: !item.frozen && !item.ok ? 0.45 : 1,
                        }}
                      >
                        <Sentence text={item.line} />
                        <span className="block text-[10px] text-ink/45">
                          {item.frozen
                            ? t("already frozen — {cost} spent", {
                                cost: nFreezes(item.cost),
                              })
                            : item.ok
                              ? t("freeze this — {cost} of {available} available", {
                                  cost: nFreezes(item.cost),
                                  available: item.available,
                                })
                              : t("needs {cost} and you have {available}", {
                                  cost: nFreezes(item.cost),
                                  available: item.available,
                                })}
                        </span>
                      </button>
                    ))}
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
