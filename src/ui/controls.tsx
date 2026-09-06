/* ---------------------------------------------------------------
   Small shared controls and the button styles they share.
--------------------------------------------------------------- */

import { useEffect, useRef } from "react"
import type { TextareaHTMLAttributes } from "react"
import { segBtn, segBtnStyle } from "./buttonStyles"
import { usePalette } from "./useTheme"

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

/**
 * Used everywhere an "inner tab" row is needed, so they all look alike.
 *
 * **It scrolls rather than pushing the page sideways.** The track is pills
 * that will not wrap and will not shrink, and how many of them there are is
 * data — five chart modes is already 338px, which is wider than a 320px
 * phone, and a flex item defaults to `min-width: auto` and so refuses to go
 * below its content. The whole document gained fifty pixels of horizontal
 * scroll from one control inside a card. That is the same bug `min-w-0`
 * already fixes in the period bar, the log's heading row and `ChartCard`, and
 * this is the fourth place it turned up.
 *
 * Fixed the way the period bar fixes it — an outer box that may shrink and
 * scrolls what will not — rather than by putting `overflow` on the rounded
 * track itself, which would draw a scrollbar inside a 34px pill. When it
 * fits, the wrapper is exactly the track's width and nothing about it
 * changes.
 */
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
  const c = usePalette()
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-sm">
        {items.map((it) => {
          const active = activeId === it.id
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              style={segBtnStyle(active, c)}
              className={
                segBtn(active) + (size === "lg" ? " px-4 py-2" : "")
              }
            >
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
