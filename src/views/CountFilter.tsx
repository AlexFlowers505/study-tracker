import { Filter } from "lucide-react"
import type { Category, Slot } from "../types/model"
import { btnBase } from "../lib/theme"
import { ToggleChips } from "../ui/ToggleChips"
import { PanelSection } from "./PanelSection"

import { usePalette } from "../ui/useTheme"
const chipTip = (it: { label: string }, isHidden: boolean) =>
  isHidden
    ? `Count "${it.label}" again`
    : `Leave "${it.label}" out of every total`

/**
 * Page-level filter: which slots and categories count towards every figure on
 * the page. Independent of the period — switching periods leaves it alone,
 * which is why its toggle in the period bar carries a dot while anything is
 * struck out.
 */
export function CountFilter({
  slots,
  categories,
  hiddenSlots,
  hiddenCategories,
  onToggleSlot,
  onToggleCategory,
  onReset,
  onClose,
}: {
  slots: Slot[]
  categories: Category[]
  hiddenSlots: Set<string>
  hiddenCategories: Set<string>
  onToggleSlot: (id: string) => void
  onToggleCategory: (id: string) => void
  onReset: () => void
  onClose?: () => void
}) {
  const c = usePalette()
  const hiddenCount = hiddenSlots.size + hiddenCategories.size
  return (
    <PanelSection
      tint={c.filter}
      icon={Filter}
      title="Counted in every figure"
      subtitle="Struck-through means left out — of the log, the stats and the charts"
      closeLabel="Hide the filter"
      onClose={onClose}
      action={
        hiddenCount > 0 ? (
          <button
            onClick={onReset}
            className={`${btnBase} text-[9px] font-mono uppercase tracking-widest text-ink/45 hover:text-ink`}
          >
            Count all again
          </button>
        ) : null
      }
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Slots
          </span>
          <ToggleChips
            items={slots}
            hidden={hiddenSlots}
            onToggle={onToggleSlot}
            className=""
            tipFor={chipTip}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Categories
          </span>
          <ToggleChips
            items={categories}
            hidden={hiddenCategories}
            onToggle={onToggleCategory}
            className=""
            tipFor={chipTip}
          />
        </div>
      </div>
    </PanelSection>
  )
}
