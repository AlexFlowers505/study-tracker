/* ---------------------------------------------------------------
   Anchored menu — a trigger button and a small panel of options.

   Portalled to <body> like the tooltips and date fields, so a scroll
   container or a modal can't clip it.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { MoreVertical } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { btnBase } from "../lib/theme"
import { Tip } from "./Tip"

const MENU_WIDTH = 220

export function PopoverMenu({
  label,
  icon: Icon = MoreVertical,
  children,
}: {
  label?: string
  icon?: LucideIcon
  children: ReactNode
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
      <Tip text={open ? undefined : label}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          className={`${btnBase} p-1.5 rounded-full text-ink/45 hover:text-ink hover:bg-ink/5 ${
            open ? "bg-ink/5 text-ink" : ""
          }`}
        >
          <Icon size={16} />
        </button>
      </Tip>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: box.bottom + 6,
              // Right-aligned to the trigger, which lives at the right edge of
              // its row; clamped so it can't slip off a narrow screen.
              left: Math.max(
                Math.min(
                  box.right - MENU_WIDTH,
                  window.innerWidth - MENU_WIDTH - 8,
                ),
                8,
              ),
              width: MENU_WIDTH,
            }}
            className="z-[110] rounded-2xl bg-card shadow-2xl p-1.5"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
