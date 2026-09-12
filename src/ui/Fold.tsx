/* ---------------------------------------------------------------
   A refinement, folded with its current value on the lid.

   **A closed fold that says nothing hides state.** One that says `Mon, Wed,
   Fri`, `every day` or `Ever, in all` is a sentence you can check without
   opening anything, so you open only the one that is wrong. That is the whole
   argument, and it is why `summary` is not optional.

   **Native `<details>`, not a `useState` toggle.** It is Baseline widely
   available, it is keyboard- and screen-reader-correct with no ARIA of our
   own, and — the part that matters in a twenty-field form — the browser's own
   find-in-page reveals a closed fold containing the match.

   It lived twice, identically, in the rule form and the achievements form,
   and `spec 026` wanted a third. Three copies of one control is how a page
   ends up with three slightly different folds, so it moved here instead.
--------------------------------------------------------------- */

import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

export function Fold({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  /** What it currently says, read without opening it. */
  summary: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl bg-ink/[0.03] open:bg-ink/[0.05]"
    >
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-xl hover:bg-ink/[0.04]">
        <ChevronRight
          size={11}
          className="shrink-0 text-ink/35 transition-transform duration-150 group-open:rotate-90"
        />
        <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/50">
          {title}
        </span>
        <span className="ml-auto min-w-0 truncate text-[10px] font-mono text-ink/40 group-open:opacity-0 transition-opacity">
          {summary}
        </span>
      </summary>
      {/* `fold-body` is what arrives — see App.css, and the note there on why
          this is the content moving rather than the box. */}
      <div className="fold-body px-3 pb-3 pt-1 space-y-2">{children}</div>
    </details>
  )
}
