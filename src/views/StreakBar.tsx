/* ---------------------------------------------------------------
   The row of streaks — the main one and every rule you wrote yourself.

   Its own row rather than a toggle inside the period bar, because these are
   the one project-wide thing on a page that is otherwise period-scoped, and
   because there can now be several of them.

   **Quiet when everything holds, loud exactly when acting still changes
   something** — `spec 010`, part 3. The row used to draw all five the same
   size and at the same volume, permanently, and that is what made each of them
   matter less: at any moment the number really at risk is zero, one,
   occasionally two, so a row where everything shouts is a dashboard, and a
   dashboard is inspected rather than feared.

   So a streak in trouble grows into a block that says what happened and what
   it costs, and everything holding collapses into one line. The line opens
   into the full row on a click, because "how is the gym streak doing" is still
   a question worth being able to ask — it is just not a question worth
   answering unprompted five times over.

   Each chip in the opened row carries its numbers inline rather than as a
   corner badge, because a custom streak has **three** and they mean different
   things:

       [icon]   12 days running   2 this week   3 banked

   The two freeze counts have to be told apart at a glance, since one is gone
   on Sunday night and the other is not. The weekly allowance is bare and dim —
   it is transient; the banked reward sits in a tinted pill in the freeze
   colour, because it is the thing you earned and the thing spending costs.
--------------------------------------------------------------- */

import { useState } from "react"
import { ChevronDown, Flame, Snowflake } from "lucide-react"
import type { RuleStatus } from "../lib/customStreaks"
import type { Balance } from "../lib/balance"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import type { KeptWeeks } from "../lib/dayVerdict"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { KeptFigure, WeeksRow } from "./KeptCard"

/** `"main"` is the goal streak; anything else is a rule id. */
export type StreakId = string | null

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** Everything the row needs about one streak, whichever kind it is. */
interface Entry {
  id: string
  tint: string
  /** An icon name from the library, or `null` for the main streak's flame. */
  icon: string | null
  label: string
  days: number
  weekly: number | null
  banked: number
  tip: string
}

function StreakButton({
  entry,
  active,
  onClick,
}: {
  entry: Entry
  active: boolean
  onClick: () => void
}) {
  const c = usePalette()
  const { tint, icon, label, days, weekly, banked, tip } = entry
  return (
    <Tip text={tip}>
      <button
        onClick={onClick}
        aria-pressed={active}
        style={
          active
            ? { backgroundColor: `${tint}1F`, boxShadow: `inset 0 0 0 1px ${tint}66` }
            : undefined
        }
        /* Raised off the page, always — this row is the one thing here you
           are trying not to lose, and it used to be the only row *without* a
           surface while the counters under it were saturated pills. */
        className={`${btnBase} flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full whitespace-nowrap ${
          active ? "" : "bg-card shadow-sm hover:brightness-105"
        }`}
      >
        <span style={{ color: tint }} className="flex items-center">
          {icon ? <RenderIcon name={icon} size={13} /> : <Flame size={13} />}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-ink/70 max-w-28 truncate">
          {label}
        </span>

        <span
          className="flex items-center gap-0.5 text-[10px] font-mono font-bold"
          style={{ color: tint }}
        >
          <Flame size={9} strokeWidth={3} />
          {days}
        </span>

        {/* Bare and dim: this one expires on Sunday night. */}
        {weekly != null && (
          <span className="flex items-center gap-0.5 text-[10px] font-mono text-ink/40">
            <Snowflake size={9} />
            {weekly}
          </span>
        )}

        {/* Tinted: this one you earned, and spending it is what costs. */}
        <span
          className="flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
          style={{ color: c.freeze, backgroundColor: `${c.freeze}1A` }}
        >
          <Snowflake size={9} strokeWidth={3} />
          {banked}
        </span>
      </button>
    </Tip>
  )
}

/** The row's own view of a rule. */
const entriesFrom = (statuses: RuleStatus[]): Entry[] =>
  statuses.map((s) => ({
    id: s.rule.id,
    tint: s.rule.color,
    icon: s.rule.iconName,
    label: s.rule.label,
    days: s.current,
    weekly: s.freezes.weeklyLeft,
    banked: s.freezes.banked,
    tip: `${plural(s.current, s.rule.scope === "week" ? "week" : "day")} in a row · ${s.freezes.weeklyLeft} of ${s.freezes.weeklyTotal} left this week · ${plural(s.freezes.banked, "freeze")} banked`,
  }))

export function StreakBar({
  statuses,
  balance,
  days,
  keptWeeks,
  rangeStart,
  rangeEnd,
  keptOpen,
  onOpenKept,
  troubled,
  active,
  onSelect,
}: {
  /** One per rule, already computed — see `ruleStatus`. */
  statuses: RuleStatus[]
  /**
   * The account, in points. Deliberately the quietest thing in this row:
   * it does not motivate — the streak does — and given equal weight it would
   * win, because watching a number grow is pleasanter than guarding one that
   * can be zeroed. It moves beside the shop once there is one.
   */
  balance: Balance | null
  /** The composite's run, and the longest there has ever been. */
  days: { current: number; best: number }
  /** Its weeks, for the strip inside the fold. Null before any rule votes. */
  keptWeeks: KeptWeeks | null
  /** The period the page is showing. The week squares follow it. */
  rangeStart: Date
  rangeEnd: Date
  /** Whether the composite's own panel is open, and how to toggle it. */
  keptOpen: boolean
  onOpenKept: () => void
  /**
   * How many rules have a `danger` or a `warning` on the board — `spec 016`.
   *
   * A figure rather than the notices themselves: this row draws no alarms any
   * more and must not start again. All it needs is the one number behind
   * `3 of 5 holding`, and taking it as a number is what stops the row growing
   * a second opinion about what counts as trouble.
   */
  troubled: number
  active: StreakId
  onSelect: (id: StreakId) => void
}) {
  const c = usePalette()
  // Opening the full row is a look, not a preference: it closes again on
  // reload, like the counter folds and the entry comments.
  const [open, setOpen] = useState(false)

  const entries = entriesFrom(statuses)
  if (!entries.length) return null

  const holding = entries.length - troubled
  const pick = (id: string) => onSelect(active === id ? null : id)

  return (
    /* **One row, not two.** The composite had a card of its own above this,
       and two stacked surfaces both answering *how am I doing* is one too
       many. Everything that must always be visible is on this line now — the
       run you are guarding, what you have to spend, and whether anything is in
       trouble — and everything else is behind the chevron.

       Not one big button, because the row has two different destinations: the
       days figure opens the breakdown, the rest opens the fold. Nesting them
       is invalid and hiding one of them behind the other costs a click. */
    <div className="rounded-2xl bg-card shadow-sm">
      <div className="flex items-center gap-3 px-3.5 py-2">
        <KeptFigure days={days} onOpen={onOpenKept} open={keptOpen} />

        {/* **The account, always on screen.** It used to appear only on the
            collapsed line, so it vanished the moment anyone opened the row —
            and a currency you cannot see is one you never spend, which makes
            the shop decorative. Quiet, though: it does not motivate, the
            streak does, and given equal weight the pleasanter number wins. */}
        {balance && (
          <Tip
            multiline
            text={`${balance.total} points to spend${
              balance.pendingKept || balance.pendingMissed
                ? ` · ${balance.pendingKept + balance.pendingMissed} day(s) still inside the writing window and not counted yet`
                : ""
            }.${String.fromCharCode(10, 10)}A finished day pays 10, a missed one takes 20, and it never resets. Your streak is a separate number and is never spent.`}
          >
            <span className="flex items-baseline gap-1 cursor-help">
              <span
                className="text-[13px] font-mono font-bold tabular-nums leading-none"
                style={balance.total < 0 ? { color: c.exam } : undefined}
              >
                {balance.total}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
                pts
              </span>
            </span>
          </Tip>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`${btnBase} ml-auto flex items-center gap-2 rounded-full px-2 py-1 -mr-1 hover:bg-ink/5`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: troubled ? c.warn : c.goalMet,
            }}
          />
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45">
            {troubled
              ? `${holding} of ${entries.length} holding`
              : plural(holding, "streak")}
          </span>
          <ChevronDown
            size={13}
            aria-hidden
            className={`text-ink/30 shrink-0 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Grows to whatever is inside it — `interpolate-size`, so nothing has
          to measure the chips. Where that is unsupported it snaps open, which
          is what it did before. */}
      <div className="grow-open" data-open={open}>
        <div className="px-3.5 pb-3 space-y-2">
          <div className="h-px bg-ink/[0.07]" />

          {keptWeeks && (
            <WeeksRow
              weeks={keptWeeks}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
            />
          )}

          {/* Scrolls rather than wraps: the row keeps one line at any width,
              and the padding is inside the scroll box because the buttons' own
              ring would otherwise be shaved off by `overflow-x-auto`. */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 -m-1 [&>*]:shrink-0">
            {entries.map((entry) => (
              <StreakButton
                key={entry.id}
                entry={entry}
                active={active === entry.id}
                onClick={() => pick(entry.id)}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
