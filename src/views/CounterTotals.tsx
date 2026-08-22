/* ---------------------------------------------------------------
   A period's counters, as a row of chips.

   Shown under a period's hours — the week heading, the month heading, and each
   week's strip inside the month grid. Hours answer "how long", counters answer
   "how many", and a period that has both was only ever reporting half of
   itself.

   **Only what is above zero appears.** A unit that was never touched in this
   period has nothing to say about it, and a row of zeroes would push the ones
   that matter off the end.

   The units come in already filtered — the caller hands it `visibleProject`'s
   list — so striking a counter or a tag out of the filter takes it out of here
   with everything else.

   **The row folds**, given `onToggle`. Every chip is a saturated pill sitting
   directly under the period's title, which is the loudest thing on the page
   and is loud whether or not you came here to read it — and unlike the filter,
   folding it hides nothing from the figures. Folded, it leaves a plain-ink stub
   naming how many it is holding: a row that vanished completely would be
   indistinguishable from a period that never counted anything.
--------------------------------------------------------------- */

import { ChevronDown, ChevronRight } from "lucide-react"
import type { CounterUnit } from "../types/model"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

export function CounterTotals({
  units,
  totals,
  className = "",
  open = true,
  onToggle,
}: {
  units: CounterUnit[]
  totals: Record<string, number>
  className?: string
  /** Ignored without `onToggle`: nothing can fold a row that has no handle. */
  open?: boolean
  onToggle?: (next: boolean) => void
}) {
  const shown = units.filter((u) => (totals[u.id] || 0) > 0)
  if (!shown.length) return null
  const folded = !!onToggle && !open

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {onToggle && (
        <Tip text={folded ? "Show this period's counters" : "Fold the counters away"}>
          <button
            type="button"
            onClick={() => onToggle(folded)}
            aria-expanded={!folded}
            className={`${btnBase} flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full text-ink/40 bg-ink/[0.05] hover:text-ink/70`}
          >
            {folded ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
            {folded && (
              <span className="uppercase tracking-wide">
                {shown.length} counter{shown.length === 1 ? "" : "s"}
              </span>
            )}
          </button>
        </Tip>
      )}
      {!folded &&
        shown.map((u) => (
          <Tip key={u.id} text={`${totals[u.id]} × ${u.label}`}>
            <span
              className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ color: u.color, backgroundColor: `${u.color}1F` }}
            >
              <RenderIcon name={u.iconName} size={10} />
              {totals[u.id]}
              <span className="uppercase tracking-wide">{u.label}</span>
            </span>
          </Tip>
        ))}
    </span>
  )
}
