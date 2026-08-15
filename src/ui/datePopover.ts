/* ---------------------------------------------------------------
   Shared open / position / dismiss behaviour for the date popovers, plus the
   react-day-picker styling they hand to the calendar.

   The panels replace `<input type="date">`, whose calendar belongs to the
   browser: it starts weeks on Sunday regardless of this app's Monday-first
   convention, can't be themed, and looks different on every platform. They
   are portalled to <body> for the same reason tooltips are — these fields
   open inside the setup modal and inside the sticky period bar, both of
   which would otherwise clip them.

   A hook and plain constants, so it lives apart from the components that use
   it: a module exporting both breaks fast refresh.
--------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import type { Palette } from "../lib/theme"

/**
 * These have to sit on the calendar's own root: react-day-picker's stylesheet
 * re-declares them in its `.rdp-root` rule, so the same variables set on a
 * parent element lose and the calendar stays at its 44px default. The font
 * size goes here too — the library's own sizes are keywords (`large`,
 * `smaller`) relative to the root, so shrinking the root scales the lot.
 */
const DAY_PICKER_FONT_SIZE = "12px"

export const dayPickerStyle = (c: Palette) =>
  ({
  "--rdp-accent-color": c.accent,
  "--rdp-accent-background-color": `${c.accent}1A`,
  "--rdp-today-color": c.accent,
  "--rdp-day-height": "30px",
  "--rdp-day-width": "30px",
  "--rdp-day_button-height": "28px",
  "--rdp-day_button-width": "28px",
  "--rdp-nav-height": "26px",
  "--rdp-nav_button-height": "26px",
  "--rdp-nav_button-width": "26px",
  "--rdp-weekday-padding": "4px 0",
  fontSize: DAY_PICKER_FONT_SIZE,
  }) as CSSProperties

/**
 * Two spots size themselves with absolute keywords (`font-size: large`), so
 * they ignore the root entirely however small it gets. Inline styles are the
 * only thing that outranks them.
 */
export const DAY_PICKER_PART_STYLES = {
  caption_label: { fontSize: "13px", fontWeight: 600 },
}

/**
 * Same story for the selected day — `.rdp-selected` is a modifier, not a part,
 * so it needs the modifier channel. Only the size is overridden; the library's
 * bold weight is what marks the selection.
 */
export const DAY_PICKER_MODIFIER_STYLES = {
  selected: { fontSize: DAY_PICKER_FONT_SIZE },
}

/**
 * Panel width is only used to keep the popover inside the viewport; the panel
 * itself sizes to the calendar so the grid can never overhang its padding.
 */
const DATE_PANEL_MAX_WIDTH = 260

export const DATE_PANEL_CLASS =
  "z-[110] rounded-2xl bg-card shadow-2xl p-2 text-ink"

export function useDatePopover(openInitially = false) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(openInitially)
  const [box, setBox] = useState<DOMRect | null>(null)

  const measure = useCallback(() => {
    if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
  }, [])

  // Opening on mount still needs a measurement pass once the trigger is laid
  // out, hence the frame delay.
  useEffect(() => {
    if (!openInitially) return
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [openInitially, measure])

  useEffect(() => {
    if (!open) return
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
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open, measure])

  const toggle = () => {
    measure()
    setOpen((v) => !v)
  }

  // Below the trigger by default; above it when the viewport runs out, so the
  // panel is never half off-screen.
  let panelStyle: CSSProperties | null = null
  if (box) {
    const spaceBelow = window.innerHeight - box.bottom
    const dropUp = spaceBelow < 320 && box.top > spaceBelow
    panelStyle = {
      position: "fixed",
      left: Math.min(
        box.left,
        Math.max(window.innerWidth - DATE_PANEL_MAX_WIDTH - 8, 8),
      ),
      ...(dropUp
        ? { top: box.top - 6, transform: "translateY(-100%)" }
        : { top: box.bottom + 6 }),
    }
  }

  return { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle }
}
