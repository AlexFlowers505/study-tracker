import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CARD, PANEL_INSET } from "../lib/theme"

/**
 * The stat block — one label, one big figure, an optional smaller suffix.
 * Shared by the analytics sections and the log's period summaries so the two
 * halves of the page read as the same thing.
 *
 * **`inset` for the ones laid on a panel.** A panel's own surface is
 * `bg-card`, and `CARD` on `bg-card` is a shadow drawn around a rectangle
 * exactly the colour of what is behind it: the tile disappears and its figures
 * read as loose text on the panel. That is the rule the panels already follow
 * for achievement tiles, shop rows and the balance block, and these were the
 * ones still raised on a surface they could not rise off. Recessed instead,
 * which is what `CounterTotals` does under a raised `StreakBar`.
 */
export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  inset = false,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon: LucideIcon
  /** On a panel rather than on the page. See above. */
  inset?: boolean
}) {
  return (
    <div className={`${inset ? PANEL_INSET : CARD} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-widest text-ink/50">
          {label}
        </span>
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ink/5">
          <Icon size={12} className="text-ink/40" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-bold">{value}</span>
        {sub && (
          <span className="text-[10px] font-mono text-ink/40">{sub}</span>
        )}
      </div>
    </div>
  )
}
