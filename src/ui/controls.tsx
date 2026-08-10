/* ---------------------------------------------------------------
   Small shared controls and the button styles they share.
--------------------------------------------------------------- */

import { useEffect, useRef } from "react"
import type { TextareaHTMLAttributes } from "react"
import { segBtn, segBtnStyle } from "./buttonStyles"

/**
 * Textarea that grows with its content up to a max height, then scrolls —
 * used anywhere a note or comment can get long.
 */
export function AutoTextarea({
  value,
  onChange,
  maxHeight = 160,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { maxHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      style={{ maxHeight }}
      className={`${className} overflow-y-auto resize-none`}
      {...rest}
    />
  )
}

export interface SegmentedItem {
  id: string
  label: string
}

/** Used everywhere an "inner tab" row is needed, so they all look alike. */
export function SegmentedControl({
  items,
  activeId,
  onChange,
  size = "sm",
}: {
  items: SegmentedItem[]
  activeId: string
  onChange: (id: string) => void
  size?: "sm" | "lg"
}) {
  return (
    <div className="inline-flex rounded-xl border border-[#1E2A33]/20 overflow-hidden bg-white">
      {items.map((it, i) => {
        const active = activeId === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={segBtnStyle(active)}
            className={
              segBtn(active) +
              ` border-0 ${i > 0 ? "border-l border-l-[#1E2A33]/10" : ""} ${size === "lg" ? "px-4 py-2" : ""}`
            }
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
