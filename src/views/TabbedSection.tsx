/* ---------------------------------------------------------------
   A page section whose body is one of several tabs.

   Two of these make up the analytics half of the page: **Summary**, the
   selected period reduced to single figures, and **Trends**, the same period
   spread over time. They used to be six blocks stacked one under the other,
   which made the page a long scroll past numbers nobody was looking at.

   The tab row deliberately does **not** reuse `SegmentedControl`. Inside
   Trends every chart carries one of those for its own slot/activity split, and
   two identical pill rows stacked would read as one control drawn twice.
   Underlined tabs say "a level up" instead — the same shape Setup's tabs use.

   Only the active tab is rendered, not hidden with CSS: a Recharts
   `ResponsiveContainer` measures the box it is in, and four of them in a
   display:none parent measure zero and then have to be re-measured on reveal.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import { SECTION_HEADING } from "../lib/theme"
import { HelpCircle } from "lucide-react"
import { btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"

import { usePalette } from "../ui/useTheme"
export interface SectionTab {
  id: string
  label: string
}

export function TabbedSection({
  title,
  help,
  tabs,
  activeId,
  onChange,
  caption,
  children,
}: {
  title: string
  /** The "?" beside the heading — what this whole section holds. */
  help: ReactNode
  tabs: SectionTab[]
  activeId: string
  onChange: (id: string) => void
  /** Line under the tab row saying what the active tab covers. */
  caption?: ReactNode
  children: ReactNode
}) {
  const c = usePalette()
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <h2 className={SECTION_HEADING}>
          {title}
        </h2>
        <Tip text={help} multiline side="bottom">
          <button
            type="button"
            aria-label={`What is in ${title}`}
            className={`${btnBase} text-ink/30 hover:text-ink/70 cursor-help`}
          >
            <HelpCircle size={14} />
          </button>
        </Tip>
      </div>

      {/* Scrolls rather than wraps on a phone. A flex row of tabs that cannot
          shrink below its content pushes the whole page sideways instead —
          the same `min-width: auto` trap the period bar fell into. */}
      <div className="flex overflow-x-auto border-b border-ink/10">
        {tabs.map((t) => {
          const active = activeId === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              style={active ? { borderColor: c.accent, color: c.accent } : undefined}
              className={`${btnBase} shrink-0 text-[10px] font-mono uppercase tracking-widest px-3 py-2 border-b-2 ${
                active
                  ? ""
                  : "border-transparent text-ink/50 hover:text-ink hover:bg-ink/5"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {caption && (
        <p className="text-[11px] font-mono text-ink/40 mt-2.5 uppercase tracking-widest">
          {caption}
        </p>
      )}

      <div className="mt-3">{children}</div>
    </div>
  )
}
