/* ---------------------------------------------------------------
   The offer to go and look, right where you opened it.

   Opening a panel and then hunting for it down a page of other open panels is
   what the page index exists to fix — and the index still costs four actions:
   find its button, open it, find the entry, click it. But the moment you open
   a section is the moment the app knows *exactly* which one you want, and the
   next thing you are going to do is look at it. So it says so immediately,
   beside the button you just pressed.

   **It lives until the next click** and never longer. It is an offer, not a
   control: an offer that stays is clutter, and one that has to be dismissed is
   a second thing to do.

   **Measured at the click, not from a ref.** The first cut kept a ref on the
   toggle and read it in an effect, which is a ref read during render and a
   `setState` inside an effect — two cascading-render warnings for a rectangle
   that was already sitting in the click event. `currentTarget` has it; take it
   there and the component becomes a pure function of where you pressed.

   Portalled, like everything else here that floats: the toggle row is an
   `overflow-x-auto` strip, so anything hanging below a button inside it is
   shaved off at the edge.
--------------------------------------------------------------- */

import { createPortal } from "react-dom"
import { ArrowDown } from "lucide-react"
import { btnBase } from "../lib/theme"
import { usePalette } from "../ui/useTheme"
import type { JumpAt } from "../lib/jump"

export function JumpPrompt({
  at,
  onGo,
}: {
  at: JumpAt | null
  onGo: (id: string) => void
}) {
  const c = usePalette()
  if (!at) return null
  return createPortal(
    <button
      type="button"
      onClick={() => onGo(at.id)}
      style={{
        top: at.top,
        left: at.left,
        backgroundColor: c.accent,
        color: c.onFill,
      }}
      className={`${btnBase} fixed z-[55] -translate-x-1/2 flex items-center gap-1 rounded-full pl-2.5 pr-2 py-1 text-[10px] font-mono uppercase tracking-wide shadow-lg whitespace-nowrap`}
    >
      Jump to it
      <ArrowDown size={11} aria-hidden />
    </button>,
    document.body,
  )
}
