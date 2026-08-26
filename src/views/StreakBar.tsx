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
import type { StreakRisk } from "../lib/streakRisk"
import { byRisk } from "../lib/streakRisk"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Sentence } from "../ui/Sentence"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** `"main"` is the goal streak; anything else is a rule id. */
export type StreakId = string | null

/** One rule's "here is what today needs of you" line. */
export interface DueLine {
  id: string
  tint: string
  label: string
  /** Already quoted, so `Sentence` can pick out the names and figures. */
  text: string
}

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

/**
 * A streak in trouble. It opens the same panel the chip does — the freeze is
 * spent from the strip in there, so this is not a fourth way to spend one.
 */
function RiskBlock({
  entry,
  risk,
  active,
  onClick,
}: {
  entry: Entry
  risk: StreakRisk
  active: boolean
  onClick: () => void
}) {
  const c = usePalette()
  /* **Three levels, three colours, and none of them the streak's own.**
   *
   * Danger takes the miss colour whatever the rule's tint is: it is the same
   * red as a broken day everywhere else, and that is a word the reader already
   * knows. A warning takes `c.warn`, the amber added for exactly this state —
   * *behind but not lost* — and it had never reached this block, which drew a
   * warning in the streak's own colour. That colour says nothing about danger:
   * a rule tinted green or blue read as an ordinary row, and `“--Pinterest”
   * “3” of “3” used — one more ends it` is not an ordinary row.
   *
   * The rule's own tint loses its place here as a result, and that is the
   * trade: on a block that only ever appears when something is wrong, the
   * level is the thing worth colouring. Its icon and its name are still there
   * to say which rule. */
  const tint = risk.level === "danger" ? c.exam : c.warn
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        backgroundColor: `${tint}14`,
        boxShadow: `inset 0 0 0 1px ${tint}${active ? "AA" : "55"}`,
      }}
      className={`${btnBase} w-full text-left rounded-2xl px-3.5 py-2.5 hover:brightness-105`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: tint }} className="flex items-center shrink-0">
          {entry.icon ? (
            <RenderIcon name={entry.icon} size={13} />
          ) : (
            <Flame size={13} />
          )}
        </span>
        <span
          className="text-[11px] font-mono font-bold uppercase tracking-wide truncate"
          style={{ color: tint }}
        >
          {entry.label}
        </span>
        <span className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-mono text-ink/45">
          <Flame size={9} strokeWidth={3} />
          {entry.days}
        </span>
      </div>
      {/* **A line each, not a dot between them.** Two conditions — or two
          checks inside one — are two things to look at, and running them
          together behind a `·` made the reader do the separating before they
          could start reading. The lead keeps its own line, so `Today` sits
          over the list rather than in front of the first item, which is what
          makes them read as a set rather than as a sentence and its tail. */}
      {risk.headline && (
        <p className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
          {risk.headline}
        </p>
      )}
      {risk.lines?.map((line, i) => (
        <p
          key={i}
          className="text-[11px] font-mono text-ink/75 leading-relaxed"
        >
          <Sentence text={line} />
        </p>
      ))}
      {risk.detail && (
        <p className="text-[10px] font-mono text-ink/45 leading-relaxed mt-0.5">
          {risk.detail}
        </p>
      )}
    </button>
  )
}

/**
 * The row's own view of a rule. Shared, so the alarms above the composite and
 * the row below it can never disagree about a figure.
 */
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

/**
 * **The alarms, and they sit above the composite rather than under it.**
 *
 * They were part of `StreakBar`, which put them below the card — so the page
 * opened with the run you are guarding, then the thing threatening it, in that
 * order. That is the wrong way round for something you can still act on: a
 * warning under the number it is about reads as a footnote to it, and a
 * footnote is something you finish reading rather than something you do.
 *
 * Split out rather than reordered inside one component, because the composite
 * card belongs to neither half and had to go between them.
 */
export function StreakAlarms({
  statuses,
  risks,
  active,
  onSelect,
}: {
  statuses: RuleStatus[]
  risks: StreakRisk[]
  active: StreakId
  onSelect: (id: StreakId) => void
}) {
  const entries = entriesFrom(statuses)
  const byId = new Map(entries.map((e) => [e.id, e]))
  // Sorted by danger, never by the order they were created in.
  const troubled = risks
    .filter((r) => r.level !== "safe" && byId.has(r.id))
    .slice()
    .sort(byRisk)
  if (!troubled.length) return null

  return (
    <div className="space-y-1.5 mb-1.5">
      {troubled.map((risk) => (
        <RiskBlock
          key={risk.id}
          entry={byId.get(risk.id) as Entry}
          risk={risk}
          active={active === risk.id}
          onClick={() => onSelect(active === risk.id ? null : risk.id)}
        />
      ))}
    </div>
  )
}

export function StreakBar({
  statuses,
  balance,
  due,
  risks,
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
  /** One per streak, keyed by the same ids — see `lib/streakRisk`. */
  risks: StreakRisk[]
  /**
   * What today still asks, one entry per rule that asks anything. Computed by
   * `App` from `dueToday`, since it is the only place that holds the project.
   */
  due: DueLine[]
  active: StreakId
  onSelect: (id: StreakId) => void
}) {
  const c = usePalette()
  // Opening the full row is a look, not a preference: it closes again on
  // reload, like the counter folds and the entry comments.
  const [open, setOpen] = useState(false)

  const entries = entriesFrom(statuses)
  if (!entries.length) return null

  const byId = new Map(entries.map((e) => [e.id, e]))
  const troubled = risks
    .filter((r) => r.level !== "safe" && byId.has(r.id))
    .slice()
    .sort(byRisk)
  const holding = entries.length - troubled.length
  const pick = (id: string) => onSelect(active === id ? null : id)

  return (
    <div className="space-y-1.5">
      {open ? (
        <>
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${btnBase} p-1.5 rounded-full text-ink/40 hover:text-ink hover:bg-ink/5`}
              aria-label="Collapse the streaks"
            >
              <ChevronDown size={14} className="rotate-180" />
            </button>
          </div>

          {/* **What today still asks of you — under the chevron, not above
              it.** Everything owed today is knowable at breakfast, and the
              alarms deliberately say none of it until the evening, because one
              that fires every morning is one nobody reads. This is the other
              half of that: not an alarm, and not nothing. You open the row and
              it is there; it never comes and finds you, which is the whole
              reason it can afford to appear on a day where everything holds.

              No surface, no border, no red — a reminder wearing the volume of
              a caption. The rule's own tint on the dot is the only colour, and
              it is there to pair the line with its chip above rather than to
              raise an alarm. */}
          {due.length > 0 && (
            <ul className="pt-0.5 space-y-0.5">
              {due.map(({ id, tint, label, text }) => (
                <li
                  key={id}
                  className="flex items-baseline gap-2 text-[10px] font-mono text-ink/45 leading-relaxed"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px]"
                    style={{ backgroundColor: tint }}
                  />
                  <span className="text-ink/35 shrink-0">{label}</span>
                  <span className="min-w-0">
                    <Sentence text={text} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        holding > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`${btnBase} w-full flex items-center gap-2 rounded-full bg-card shadow-sm px-3.5 py-2 hover:brightness-105`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: c.goalMet }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink/50">
              {troubled.length
                ? `${holding} more holding`
                : `${plural(holding, "streak")} holding`}
            </span>
            {balance && (
              <Tip
                className="ml-auto"
                text={`${balance.total} points banked${
                  balance.pendingKept || balance.pendingMissed
                    ? ` · ${balance.pendingKept + balance.pendingMissed} day(s) still inside the writing window and not counted yet`
                    : ""
                }. A finished day pays 10, a missed one takes 20, and it never resets. Your streak is a separate number and is never spent.`}
              >
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    balance.total < 0 ? "text-ink/45" : "text-ink/35"
                  }`}
                  style={balance.total < 0 ? { color: c.exam } : undefined}
                >
                  {balance.total > 0 ? "+" : ""}
                  {balance.total}
                </span>
              </Tip>
            )}
            <ChevronDown
              size={14}
              className={`text-ink/30 shrink-0 ${balance ? "" : "ml-auto"}`}
            />
          </button>
        )
      )}
    </div>
  )
}
