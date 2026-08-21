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
--------------------------------------------------------------- */

import type { CounterUnit } from "../types/model"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

export function CounterTotals({
  units,
  totals,
  className = "",
}: {
  units: CounterUnit[]
  totals: Record<string, number>
  className?: string
}) {
  const shown = units.filter((u) => (totals[u.id] || 0) > 0)
  if (!shown.length) return null

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {shown.map((u) => (
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
