/* ---------------------------------------------------------------
   The row of streaks — the main one and every rule you wrote yourself.

   Its own row rather than a toggle inside the period bar, because these are
   the one project-wide thing on a page that is otherwise period-scoped, and
   because there can now be several of them. The main streak moved in as the
   first button: it is the same sort of thing, and leaving it behind would have
   made "your streaks" two places.

   Each button carries its numbers rather than a corner badge, because a custom
   streak has **three** and they mean different things:

       [icon]   12 days running   2 this week   3 banked

   The two freeze counts have to be told apart at a glance, since one of them
   is gone on Sunday night and the other is not. The weekly allowance is bare
   and dim — it is transient; the banked reward sits in a tinted pill in the
   freeze colour, because it is the thing you have actually earned and the
   thing you lose by spending. The main streak has no weekly allowance, so it
   simply shows two.
--------------------------------------------------------------- */

import { Flame, Snowflake } from "lucide-react"
import type { RuleStatus } from "../lib/customStreaks"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** `"main"` is the goal streak; anything else is a rule id. */
export type StreakId = string | null

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function StreakButton({
  tint,
  icon,
  label,
  days,
  weekly,
  banked,
  active,
  tip,
  onClick,
}: {
  tint: string
  /** An icon name from the library, or `null` for the main streak's flame. */
  icon: string | null
  label: string
  days: number | null
  weekly: number | null
  banked: number
  active: boolean
  tip: string
  onClick: () => void
}) {
  const c = usePalette()
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
        className={`${btnBase} flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full whitespace-nowrap ${
          active ? "" : "hover:bg-ink/5"
        }`}
      >
        <span style={{ color: tint }} className="flex items-center">
          {icon ? <RenderIcon name={icon} size={13} /> : <Flame size={13} />}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-ink/70 max-w-28 truncate">
          {label}
        </span>

        {days != null && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-mono font-bold"
            style={{ color: tint }}
          >
            <Flame size={9} strokeWidth={3} />
            {days}
          </span>
        )}

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

export function StreakBar({
  statuses,
  mainDays,
  mainFreezes,
  active,
  onSelect,
}: {
  /** One per rule, already computed — see `ruleStatus`. */
  statuses: RuleStatus[]
  /** Null when the effectiveness meter is off: no metric, no streak. */
  mainDays: number | null
  mainFreezes: number
  active: StreakId
  onSelect: (id: StreakId) => void
}) {
  const c = usePalette()
  if (mainDays == null && !statuses.length) return null

  const pick = (id: string) => onSelect(active === id ? null : id)

  return (
    // Scrolls rather than wraps: the row keeps one line at any width, and the
    // padding is inside the scroll box because the buttons' own ring would
    // otherwise be shaved off by `overflow-x-auto`.
    <div className="flex items-center gap-1.5 overflow-x-auto p-1 -m-1 [&>*]:shrink-0">
      {mainDays != null && (
        <StreakButton
          tint={c.project}
          icon={null}
          label="Goal"
          days={mainDays}
          weekly={null}
          banked={mainFreezes}
          active={active === "main"}
          tip={`Hours against your daily goal — ${plural(mainDays, "day")} in a row, ${plural(mainFreezes, "freeze")} banked`}
          onClick={() => pick("main")}
        />
      )}
      {statuses.map((s) => (
        <StreakButton
          key={s.rule.id}
          tint={s.rule.color}
          icon={s.rule.iconName}
          label={s.rule.label}
          days={s.current}
          weekly={s.freezes.weeklyLeft}
          banked={s.freezes.banked}
          active={active === s.rule.id}
          tip={`${plural(s.current, s.rule.scope === "week" ? "week" : "day")} in a row · ${s.freezes.weeklyLeft} of ${s.freezes.weeklyTotal} left this week · ${plural(s.freezes.banked, "freeze")} banked`}
          onClick={() => pick(s.rule.id)}
        />
      ))}
    </div>
  )
}
