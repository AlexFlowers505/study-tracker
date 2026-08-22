/* ---------------------------------------------------------------
   Anchored menu — a trigger button and a small panel of options.

   Portalled to <body> like the tooltips and date fields, so a scroll
   container or a modal can't clip it.

   The trigger is an icon by default and can be anything: a "+ Tag" pill wants
   the same anchored, portalled, click-outside-to-close panel as the row's
   three-dot menu, and hand-rolling a second one is how a bubble ends up
   clipped by the modal it opens in.

   `children` may be a function, which is handed a `close`. A menu whose items
   pick something has to shut when one is picked, and the alternative — the
   panel reaching in to guess which of its children was a choice — is worse.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { MoreVertical } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { btnBase } from "../lib/theme"
import { Tip } from "./Tip"

const MENU_WIDTH = 220

/** Space under the trigger, and over it. */
const below = (box: DOMRect) => window.innerHeight - box.bottom - 12
const above = (box: DOMRect) => box.top - 12

/**
 * Flip up only when down is genuinely cramped *and* up is better. A menu that
 * changes sides on a few pixels of scroll is worse than one that is a little
 * short, so the test has a floor rather than being a plain comparison.
 */
const placeAbove = (box: DOMRect) => below(box) < 180 && above(box) > below(box)
const roomFor = (box: DOMRect) =>
  placeAbove(box) ? above(box) : below(box)

export function PopoverMenu({
  label,
  icon: Icon = MoreVertical,
  width = MENU_WIDTH,
  trigger,
  triggerClassName,
  wrapClassName,
  children,
}: {
  label?: string
  icon?: LucideIcon
  width?: number
  /** Replaces the icon inside the trigger button — a pill, a label, anything. */
  trigger?: ReactNode
  triggerClassName?: string
  /**
   * Goes on the tooltip wrapper, which is the box the parent's layout actually
   * sees — `Tip` puts a span between the two, so a `w-full` trigger measures
   * itself against a shrink-wrapped span unless the span is sized as well.
   * Only needed where the trigger has to fill a cell it did not size itself.
   */
  wrapClassName?: string
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onPointerDown)
    window.addEventListener("resize", reposition)
    window.addEventListener("scroll", reposition, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
    }
  }, [open])

  const toggle = () => {
    if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }

  return (
    <>
      <Tip text={open ? undefined : label} className={wrapClassName}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          className={
            triggerClassName ??
            `${btnBase} p-1.5 rounded-full text-ink/45 hover:text-ink hover:bg-ink/5 ${
              open ? "bg-ink/5 text-ink" : ""
            }`
          }
        >
          {trigger ?? <Icon size={16} />}
        </button>
      </Tip>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              // Below by default, above when there isn't room — this menu is
              // used at the foot of a chart card, where "below" is off the
              // bottom of the window and a panel you cannot see reads as a
              // button that does nothing.
              ...(placeAbove(box)
                ? { bottom: window.innerHeight - box.top + 6 }
                : { top: box.bottom + 6 }),
              maxHeight: roomFor(box) - 8,
              // Right-aligned to the trigger, which lives at the right edge of
              // its row; clamped so it can't slip off a narrow screen.
              left: Math.max(
                Math.min(box.right - width, window.innerWidth - width - 8),
                8,
              ),
              width,
            }}
            className="z-[110] rounded-2xl bg-card shadow-2xl p-1.5 overflow-y-auto"
          >
            {typeof children === "function"
              ? children(() => setOpen(false))
              : children}
          </div>,
          document.body,
        )}
    </>
  )
}
