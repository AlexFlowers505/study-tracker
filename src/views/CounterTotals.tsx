/* ---------------------------------------------------------------
   What a period counted — activities, tallies and checks — under its heading.

   Hours answer "how long" and these answer "how many" and "whether", and a
   period reporting only the first was reporting a fraction of itself.

   **The chips are filled, and they sit under a heading of their own.** The
   fill went away for a while, to stop them shouting over the streak row that
   had none — and a long list of unfilled chips turned out to have no shape at
   all, because the fill was the only thing separating one from the next. The
   answer was a section rather than a diet: `Counters` is a subsection of the
   period, said so by a heading, and the streak row keeps the raised surface it
   gained. Hierarchy comes from the heading; the fill goes back to doing the
   one job it was good at.

   **Each group folds on its own, from a row of its own names.** One chevron
   for everything was a switch with one thing to say, and the answer was
   usually "some of it": a project defining forty things reports six in a week,
   and which six is what the row is for. Hiding a group hides nothing from the
   figures — this is a view preference, unlike the count filter, which is why
   neither carries a dot on the period bar.

   The chips arrive already filtered, so striking a counter, a tag or a
   category out of the filter takes it out of here with everything else.
--------------------------------------------------------------- */

import type { CounterChip, CounterGroup, CounterGrouping } from "../lib/periodCounters"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

/** The chips alone — what a week strip inside the month grid shows. */
export function CounterChips({
  chips,
  className = "",
}: {
  chips: CounterChip[]
  className?: string
}) {
  if (!chips.length) return null
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {chips.map((chip) => (
        <Tip key={chip.id} text={chip.tip}>
          <span
            className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ color: chip.color, backgroundColor: `${chip.color}1F` }}
          >
            <RenderIcon name={chip.iconName} size={10} />
            <span className="font-bold">{chip.value}</span>
            <span className="uppercase tracking-wide">{chip.label}</span>
          </span>
        </Tip>
      ))}
    </span>
  )
}

export function CounterTotals({
  groups,
  grouping,
  onGrouping,
  hidden,
  onToggle,
  onSetAll,
  className = "",
}: {
  groups: CounterGroup[]
  grouping: CounterGrouping
  onGrouping: (next: CounterGrouping) => void
  /** Group ids whose chips are folded away. */
  hidden: Set<string>
  onToggle: (id: string) => void
  onSetAll: (hideAll: boolean) => void
  className?: string
}) {
  const c = usePalette()
  if (!groups.length) return null
  const allHidden = groups.every((g) => hidden.has(g.id))

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* Recessed, like Setup's: this is a sub-question about the row below
            it, not a control of the same standing as the period pills. */}
        <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
          {(["kind", "category"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onGrouping(id)}
              aria-pressed={grouping === id}
              style={segBtnStyle(grouping === id, c)}
              className={`${segBtn(grouping === id)} !text-[10px] !px-2 !py-0.5`}
            >
              {id === "kind" ? "By kind" : "By category"}
            </button>
          ))}
        </div>

        {/* The names double as the legend. A struck-out one is a group you
            folded, not a group with nothing in it — those are absent. */}
        {groups.map((g) => {
          const off = hidden.has(g.id)
          return (
            <Tip
              key={g.id}
              text={`${off ? "Show" : "Hide"} ${g.label.toLowerCase()} — ${g.chips.length} in this period`}
            >
              <button
                type="button"
                onClick={() => onToggle(g.id)}
                aria-pressed={!off}
                style={off ? undefined : { color: g.color }}
                className={`${btnBase} text-[9px] font-mono uppercase tracking-widest ${
                  off ? "text-ink/30 line-through" : "text-ink/70"
                }`}
              >
                {g.label}
                <span className="ml-1 opacity-50">{g.chips.length}</span>
              </button>
            </Tip>
          )
        })}

        <button
          type="button"
          onClick={() => onSetAll(!allHidden)}
          className={`${btnBase} text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full text-ink/40 hover:text-ink hover:bg-ink/5`}
        >
          {allHidden ? "Show all" : "Hide all"}
        </button>
      </div>

      {/* The heading takes the whole line and the chips start the next one.
          Sharing a line meant the first chip sat wherever the heading happened
          to end, and with eight of them wrapping underneath there was no left
          edge to read down. */}
      {groups
        .filter((g) => !hidden.has(g.id))
        .map((g) => (
          <div key={g.id}>
            <div
              className="text-[9px] font-mono uppercase tracking-widest mb-1"
              style={{ color: g.color || `${c.ink}55` }}
            >
              {g.label}
            </div>
            <CounterChips chips={g.chips} className="w-full" />
          </div>
        ))}
    </div>
  )
}
