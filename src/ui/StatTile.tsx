import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CARD } from "../lib/theme"

/**
 * The white stat block — one label, one big figure, an optional smaller
 * suffix. Shared by the analytics sections and the log's period summaries so
 * the two halves of the page read as the same thing.
 */
export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon: LucideIcon
}) {
  return (
    <div className={`${CARD} p-4`}>
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
