/* ---------------------------------------------------------------
   Tooltip.

   A styled replacement for the native `title=""`. Wrap any small element —
   a button, a badge, an icon — and it shows a dark bubble on hover or focus.

   The bubble is portalled to <body> and positioned with fixed coordinates
   measured from the trigger. An absolutely positioned bubble living inside
   the trigger gets clipped by any ancestor that scrolls or hides its overflow
   — the modal shell, the modal body, the month grid — which is why the day
   editor's top-row buttons used to show half a tooltip.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"

const TIP_GAP = 6
// Rough half-width of the bubble, only used to keep it from running off the
// viewport edge. Exact measurement would need a second render pass; being a few
// pixels off-centre near the screen edge is a better trade than that.
const TIP_HALF_WIDTH = 110
// Below this distance from the top of the viewport there is no room for a
// bubble above the trigger, so it flips underneath.
const TIP_FLIP_THRESHOLD = 44

export type TipSide = "top" | "bottom" | "left"

interface TipBubbleProps {
  box: DOMRect
  text: ReactNode
  multiline: boolean
  side: TipSide
}

function TipBubble({ box, text, multiline, side }: TipBubbleProps) {
  const centerX = box.left + box.width / 2
  const clampedX = Math.min(
    Math.max(centerX, TIP_HALF_WIDTH + 8),
    Math.max(window.innerWidth - TIP_HALF_WIDTH - 8, TIP_HALF_WIDTH + 8),
  )
  const placement =
    side === "bottom"
      ? {
          top: box.bottom + TIP_GAP,
          left: clampedX,
          transform: "translateX(-50%)",
        }
      : side === "left"
        ? {
            top: box.top + box.height / 2,
            left: box.left - TIP_GAP,
            transform: "translate(-100%, -50%)",
          }
        : // Default is above the trigger, but a trigger near the top of the
          // viewport (the sign-out button in the header) would push the bubble
          // off-screen, so it flips below instead.
          box.top < TIP_FLIP_THRESHOLD
          ? {
              top: box.bottom + TIP_GAP,
              left: clampedX,
              transform: "translateX(-50%)",
            }
          : {
              top: box.top - TIP_GAP,
              left: clampedX,
              transform: "translate(-50%, -100%)",
            }

  return (
    <span
      role="tooltip"
      style={{ position: "fixed", ...placement }}
      className={`pointer-events-none z-[100] rounded-lg bg-[#1E2A33] text-[#F4F5F7] text-[10px] font-mono leading-snug px-2 py-1.5 shadow-lg ${
        multiline
          ? "whitespace-pre-line max-w-[220px] text-left"
          : "whitespace-nowrap"
      }`}
    >
      {text}
    </span>
  )
}

export interface TipProps {
  text?: ReactNode
  children: ReactNode
  multiline?: boolean
  side?: TipSide
  className?: string
}

export function Tip({
  text,
  children,
  multiline = false,
  side = "top",
  className = "",
}: TipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)

  // Fixed coordinates go stale the moment anything scrolls, so drop the bubble
  // instead of letting it float away from its trigger.
  useEffect(() => {
    if (!box) return
    const hide = () => setBox(null)
    window.addEventListener("scroll", hide, true)
    window.addEventListener("resize", hide)
    return () => {
      window.removeEventListener("scroll", hide, true)
      window.removeEventListener("resize", hide)
    }
  }, [box])

  if (!text) return children

  const show = () => {
    if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
  }
  const hide = () => setBox(null)

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {box &&
        createPortal(
          <TipBubble box={box} text={text} multiline={multiline} side={side} />,
          document.body,
        )}
    </span>
  )
}
