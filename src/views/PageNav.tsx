/* ---------------------------------------------------------------
   An index of what is open, because there can now be a great deal of it.

   The toggle row opens eight different panels and every one of them stays
   open until you close it, so a page with the board, the account, the filter,
   the shop, two streak panels and the change log on it is several screens of
   scrolling with no way to get from one to another except the wheel. The
   panels themselves are fine; the *set* of them needed an address book.

   **It lists what is actually on the page**, never a fixed menu. An entry
   appears when its panel does and goes when it goes, so the list is a reading
   of the page rather than a claim about it — a link to a section that is not
   there is worse than no link at all.

   **Fixed, over the content, and its button is always visible.** The one
   thing that must never scroll away is the way back to the top of a list you
   are lost in the middle of. It sits bottom-right, out of the way of the
   period bar at the top and the day cards in the middle.

   Not a `PopoverMenu`: that one tethers a bubble to a trigger and measures
   coordinates from it, which is right for a menu hanging off a chip and wrong
   for a panel that wants a fixed corner of the viewport whatever it is
   anchored to. It still portals, for the same reason everything floating in
   this app portals — a fixed panel inside the page tree is at the mercy of
   every transform and overflow above it.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { List, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { usePalette } from "../ui/useTheme"

export interface NavEntry {
  /** The `id` on the section's wrapper. */
  id: string
  label: string
  /** The panel's own tint, so the list reads like the rails down the page. */
  tint?: string
  /** A library icon name, or a lucide component for the fixed sections. */
  iconName?: string
  icon?: LucideIcon
}

export function PageNav({ entries }: { entries: NavEntry[] }) {
  const c = usePalette()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)

  /* Escape and a click outside, the two ways anything here closes. No scroll
     lock: `useModalDismiss` takes one, and this is not a modal — the whole
     point of it is that the page keeps moving underneath.

     **`click`, not `mousedown`.** On `mousedown` the panel unmounted between
     the press and the release, so the item's own `onClick` never fired and
     every entry in the list did nothing at all. A dismisser that runs before
     the thing it is dismissing has had its say is not a dismisser, it is a
     swallow. On `click` the item has already acted, and the trigger is inside
     the box so the press that opens it cannot close it either. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    /* **Registered a tick late, or it eats the click that opened it.** A
       discrete event is flushed synchronously, so the effect runs while that
       same click is still on its way up to `window` — and a listener added
       mid-dispatch still gets called. The panel opened and shut inside one
       press. Deferring by a task puts it after the event that created it. */
    const armed = setTimeout(() => window.addEventListener("click", onClick), 0)
    return () => {
      clearTimeout(armed)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("click", onClick)
    }
  }, [open])

  // Nothing to navigate between. One section is a page, not a list.
  if (entries.length < 2) return null

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    setOpen(false)
  }

  return createPortal(
    <div
      ref={box}
      className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2"
    >
      {open && (
        <nav
          id="page-nav-list"
          aria-label="Sections on this page"
          className="rounded-2xl bg-card shadow-lg ring-1 ring-ink/10 p-1.5 max-h-[60vh] overflow-y-auto min-w-52"
        >
          <p className="px-2.5 pt-1 pb-1.5 text-[9px] font-mono uppercase tracking-widest text-ink/35">
            On this page
          </p>
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => go(entry.id)}
                  className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-ink/5`}
                >
                  {/* The same rail the panel itself wears, so the list reads
                      as the page seen edge-on. */}
                  <span
                    className="w-[3px] h-4 rounded-full shrink-0"
                    style={{ backgroundColor: entry.tint || `${c.ink}30` }}
                  />
                  <span
                    className="flex items-center shrink-0"
                    style={{ color: entry.tint || `${c.ink}70` }}
                  >
                    {entry.icon ? (
                      <entry.icon size={12} />
                    ) : entry.iconName ? (
                      <RenderIcon name={entry.iconName} size={12} />
                    ) : null}
                  </span>
                  <span className="text-[11px] font-mono text-ink/75 truncate">
                    {entry.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="page-nav-list"
        aria-label={open ? "Hide the section list" : "Jump to a section"}
        className={`${btnBase} flex items-center justify-center w-10 h-10 rounded-full bg-card shadow-lg ring-1 ring-ink/10 text-ink/60 hover:text-ink hover:brightness-105`}
      >
        {open ? <X size={17} /> : <List size={17} />}
      </button>
    </div>,
    document.body,
  )
}
