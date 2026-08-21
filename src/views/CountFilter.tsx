import type { ReactNode } from "react"
import { Filter } from "lucide-react"
import type { Category, CounterUnit, Slot, Tag } from "../types/model"
import { btnBase } from "../lib/theme"
import { ToggleChips } from "../ui/ToggleChips"
import { PanelSection } from "./PanelSection"

import { usePalette } from "../ui/useTheme"
function FilterGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-ink/35 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

const chipTip = (it: { label: string }, isHidden: boolean) =>
  isHidden
    ? `Count "${it.label}" again`
    : `Leave "${it.label}" out of every total`

/**
 * Page-level filter: which slots, categories and tag-tagged counters count
 * towards every figure on the page. Independent of the period — switching periods leaves it alone,
 * which is why its toggle in the period bar carries a dot while anything is
 * struck out.
 */
export function CountFilter({
  slots,
  categories,
  counters,
  tags,
  hiddenSlots,
  hiddenCategories,
  hiddenCounters,
  hiddenTags,
  onToggleSlot,
  onToggleCategory,
  onToggleCounter,
  onToggleTag,
  onReset,
  onClose,
}: {
  slots: Slot[]
  categories: Category[]
  counters: CounterUnit[]
  tags: Tag[]
  hiddenSlots: Set<string>
  hiddenCategories: Set<string>
  hiddenCounters: Set<string>
  hiddenTags: Set<string>
  onToggleSlot: (id: string) => void
  onToggleCategory: (id: string) => void
  onToggleCounter: (id: string) => void
  onToggleTag: (id: string) => void
  onReset: () => void
  onClose?: () => void
}) {
  const c = usePalette()
  const hiddenCount =
    hiddenSlots.size +
    hiddenCategories.size +
    hiddenCounters.size +
    hiddenTags.size
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
      {/* Each kind on its own row: heading, then its chips underneath. Side
          by side they ran together into one long strip of words, and which
          heading a chip belonged to was a matter of guessing where the last
          group ended. */}
      <div className="space-y-4">
        <FilterGroup label="Slots">
          <ToggleChips
            items={slots}
            hidden={hiddenSlots}
            onToggle={onToggleSlot}
            className=""
            tipFor={chipTip}
          />
        </FilterGroup>
        <FilterGroup label="Categories">
          <ToggleChips
            items={categories}
            hidden={hiddenCategories}
            onToggle={onToggleCategory}
            className=""
            tipFor={chipTip}
          />
        </FilterGroup>
        {/* Counters one at a time, tags by the handful. Both strike out the
            same thing, which is why they sit together and below the two groups
            that strike out study time. Each row is absent when there is
            nothing in it — an empty heading only raises the question. */}
        {counters.length > 0 && (
          <FilterGroup label="Counters">
            <ToggleChips
              items={counters}
              hidden={hiddenCounters}
              onToggle={onToggleCounter}
              className=""
              tipFor={(it, isHidden) =>
                isHidden
                  ? `Show "${it.label}" again`
                  : `Hide "${it.label}" everywhere`
              }
            />
          </FilterGroup>
        )}
        {tags.length > 0 && (
          <FilterGroup label="Tags">
            <ToggleChips
              items={tags}
              hidden={hiddenTags}
              onToggle={onToggleTag}
              className=""
              tipFor={(it, isHidden) =>
                isHidden
                  ? `Show counters tagged "${it.label}" again`
                  : `Hide every counter tagged "${it.label}"`
              }
            />
          </FilterGroup>
        )}
      </div>
    </PanelSection>
  )
}
