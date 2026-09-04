/* ---------------------------------------------------------------
   Solo, said out loud — `spec 016`, part 5.

   **Loud and temporary, and the second sentence is not optional.** A view that
   quietly changes what red means is the most dangerous thing in this spec: the
   day colours, the rings and the composite's figures all move, and if the
   banner did not say what stayed put the mode would look like a way of
   rewriting the record.

   Sticky under the period bar rather than a line inside a panel, because the
   thing it is warning about is the whole page and you can scroll away from any
   panel. Cleared on reload, never persisted — not remembering it is part of
   the promise.
--------------------------------------------------------------- */

import { X } from "lucide-react"
import type { StreakRule } from "../types/model"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"

export function SoloBanner({
  rule,
  onClear,
}: {
  /** Absent if the rule was deleted while it was being soloed. */
  rule: StreakRule | undefined
  onClear: () => void
}) {
  if (!rule) return null
  return (
    <div
      className="sticky top-0 z-30 flex items-center gap-2 rounded-2xl px-3.5 py-2 mb-2"
      style={{
        backgroundColor: `${rule.color}1F`,
        boxShadow: `inset 0 0 0 1px ${rule.color}66`,
      }}
    >
      <span style={{ color: rule.color }} className="flex items-center shrink-0">
        <RenderIcon name={rule.iconName} size={13} />
      </span>
      <p className="min-w-0 text-[11px] font-mono leading-relaxed">
        <span className="font-bold" style={{ color: rule.color }}>
          Showing “{rule.label}” only
        </span>
        <span className="text-ink/60">
          {" "}
          — day colours, rings and streak counts.{" "}
        </span>
        {/* Without this the mode looks like a way of rewriting the record. */}
        <span className="text-ink/45">Points and achievements are unchanged.</span>
      </p>
      <button
        type="button"
        onClick={onClear}
        aria-label="Show every rule again"
        className={`${btnBase} ml-auto shrink-0 p-1 -mr-1 rounded-full text-ink/40 hover:text-ink hover:bg-ink/10`}
      >
        <X size={15} />
      </button>
    </div>
  )
}
