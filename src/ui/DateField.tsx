/* ---------------------------------------------------------------
   Date fields — a trigger button plus a react-day-picker popover.
--------------------------------------------------------------- */

import { useState } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { CalendarDays } from "lucide-react"
import type { DayKey } from "../types/model"
import { fmtShort, fromKey, toKey } from "../lib/date"
import { FIELD_BOXED, btnBase } from "../lib/theme"
import {
  DATE_PANEL_CLASS,
  DAY_PICKER_MODIFIER_STYLES,
  DAY_PICKER_PART_STYLES,
  DAY_PICKER_STYLE,
  useDatePopover,
} from "./datePopover"

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = false,
  className = "",
}: {
  value?: DayKey | null
  onChange: (key: DayKey) => void
  placeholder?: string
  clearable?: boolean
  className?: string
}) {
  const { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle } =
    useDatePopover()
  const selected = value ? fromKey(value) : undefined

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={`${FIELD_BOXED} ${className} ${btnBase} flex items-center gap-1.5 text-left hover:bg-[#1E2A33]/[0.03]`}
      >
        <CalendarDays size={13} className="text-[#1E2A33]/40 shrink-0" />
        <span className={value ? "" : "text-[#1E2A33]/35"}>
          {value ? fmtShort(value) : placeholder}
        </span>
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle ?? undefined}
            className={`${DATE_PANEL_CLASS} w-max`}
          >
            <DayPicker
              mode="single"
              weekStartsOn={1}
              showOutsideDays
              selected={selected}
              defaultMonth={selected}
              style={DAY_PICKER_STYLE}
              styles={DAY_PICKER_PART_STYLES}
              modifiersStyles={DAY_PICKER_MODIFIER_STYLES}
              onSelect={(d) => {
                if (!d) return
                onChange(toKey(d))
                setOpen(false)
              }}
            />
            {clearable && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
                className={`${btnBase} w-full rounded-xl px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:bg-[#1E2A33]/5 hover:text-[#1E2A33]`}
              >
                Clear date
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

/**
 * Both ends of a custom period in one calendar: click a start, click an end.
 * Two separate single-date fields made you open two popovers and hold the
 * other end in your head. The trigger doubles as the readout of what's
 * currently selected.
 */
export function DateRangeField({
  start,
  end,
  onChange,
  openOnMount = false,
}: {
  start?: DayKey | null
  end?: DayKey | null
  onChange: (start: DayKey, end: DayKey) => void
  openOnMount?: boolean
}) {
  const { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle } =
    useDatePopover(openOnMount)
  // Left to itself, react-day-picker grows or trims the existing range
  // depending on where you click, which is hard to predict when a range is
  // already set. Driving the clicks ourselves keeps one rule: first click
  // starts a new range, second click ends it.
  const [pendingFrom, setPendingFrom] = useState<Date | null>(null)

  // Escape or an outside click can leave a half-made selection behind, so the
  // slate is wiped on the way in rather than on the way out.
  const openPicker = () => {
    setPendingFrom(null)
    toggle()
  }

  const selected = {
    from: start ? fromKey(start) : undefined,
    to: end ? fromKey(end) : undefined,
  }

  const handleDayClick = (day: Date) => {
    if (!pendingFrom) {
      setPendingFrom(day)
      onChange(toKey(day), toKey(day))
      return
    }
    const [from, to] =
      pendingFrom <= day ? [pendingFrom, day] : [day, pendingFrom]
    onChange(toKey(from), toKey(to))
    setPendingFrom(null)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`${FIELD_BOXED} ${btnBase} flex items-center gap-1.5 text-left hover:bg-[#1E2A33]/[0.03]`}
      >
        <CalendarDays size={13} className="text-[#1E2A33]/40 shrink-0" />
        <span>
          {start ? fmtShort(start) : "Start"}
          <span className="text-[#1E2A33]/35"> – </span>
          {end ? fmtShort(end) : "End"}
        </span>
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle ?? undefined}
            className={`${DATE_PANEL_CLASS} w-max`}
          >
            <DayPicker
              mode="range"
              weekStartsOn={1}
              showOutsideDays
              selected={selected}
              defaultMonth={selected.from}
              style={DAY_PICKER_STYLE}
              styles={DAY_PICKER_PART_STYLES}
              modifiersStyles={DAY_PICKER_MODIFIER_STYLES}
              onSelect={() => {}}
              onDayClick={handleDayClick}
            />
            <p className="px-2 pb-1 pt-0.5 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/35">
              {pendingFrom ? "Now pick the end" : "Click a start, then an end"}
            </p>
          </div>,
          document.body,
        )}
    </>
  )
}
