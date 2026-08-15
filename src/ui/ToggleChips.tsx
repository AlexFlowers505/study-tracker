import { Fragment } from "react"
import type { ReactNode } from "react"
import { btnBase } from "../lib/theme"
import { usePalette } from "./useTheme"
import { Tip } from "./Tip"

export interface ChipItem {
  id: string
  label: string
  color: string
}

/**
 * Show/hide individual series. `tipFor` turns each chip into a tooltip
 * trigger — used by the page-level filter, where it isn't obvious that a
 * struck-through chip is clickable.
 */
export function ToggleChips({
  items,
  hidden,
  onToggle,
  className = "justify-center mt-3",
  tipFor,
  onBulk,
}: {
  items: ChipItem[]
  hidden: Set<string>
  onToggle: (id: string) => void
  className?: string
  tipFor?: (item: ChipItem, isHidden: boolean) => ReactNode
  onBulk?: (showAll: boolean) => void
}) {
  const c = usePalette()
  const allHidden = items.length > 0 && items.every((it) => hidden.has(it.id))
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {onBulk && items.length > 1 && (
        <button
          onClick={() => onBulk(allHidden)}
          className={`${btnBase} text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full text-ink/45 hover:text-ink hover:bg-ink/5`}
        >
          {allHidden ? "Select all" : "Clear all"}
        </button>
      )}
      {items.map((it) => {
        const isHidden = hidden.has(it.id)
        const chip = (
          <button
            onClick={() => onToggle(it.id)}
            style={{
              borderColor: it.color,
              backgroundColor: isHidden ? "transparent" : `${it.color}1A`,
              color: isHidden ? `${c.ink}55` : it.color,
            }}
            className={`${btnBase} flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${
              isHidden ? "line-through opacity-60" : ""
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isHidden ? `${c.ink}55` : it.color }}
            />
            {it.label}
          </button>
        )
        return tipFor ? (
          <Tip key={it.id} text={tipFor(it, isHidden)}>
            {chip}
          </Tip>
        ) : (
          <Fragment key={it.id}>{chip}</Fragment>
        )
      })}
    </div>
  )
}
