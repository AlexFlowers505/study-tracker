/* ---------------------------------------------------------------
   Whether a scroll container has more content past each of its ends.

   A box that scrolls says so by being cut off, which says nothing: a row
   sliced in half at the foot of the setup panel looks the same as a row that
   happens to end there, and the only thing distinguishing them is a hairline
   scrollbar. What is wanted is the edge going soft while there is more, and
   hard once there is not — which means the fade has to know the scroll
   position, and therefore cannot be written in CSS alone. Container
   scroll-state queries are the coming answer and style only *descendants* of
   the container, so they cannot fade the container itself; this is twenty
   lines and works everywhere.

   **A callback ref, not a `useRef`.** The setup panel's body is keyed on the
   tab, so the node is replaced on every switch — and a `useRef` handed to a
   keyed element updates `.current` without waking any effect, which would
   leave this measuring a detached box forever. Holding the node in state is
   what makes the remount a re-subscription.
--------------------------------------------------------------- */

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

export interface ScrollEdges {
  /**
   * Put on the scroll container itself.
   *
   * Named `attach` rather than `ref`: `react-hooks/refs` reads any `.ref`
   * as a real ref object and refuses every other field on the same value as a
   * ref read during render, which is exactly what `start` and `end` are for.
   */
  attach: (node: HTMLElement | null) => void
  /** The container, once it exists — for anything that has to measure it. */
  node: HTMLElement | null
  /** There is more content above, or to the left. */
  start: boolean
  /** There is more below, or to the right. */
  end: boolean
}

export function useScrollEdges(axis: "x" | "y" = "y"): ScrollEdges {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    if (!node) return
    const measure = () => {
      const pos = axis === "x" ? node.scrollLeft : node.scrollTop
      const shown = axis === "x" ? node.clientWidth : node.clientHeight
      const all = axis === "x" ? node.scrollWidth : node.scrollHeight
      // A pixel of slack at each end. Sub-pixel scroll positions are ordinary
      // on a zoomed page or a fractional device ratio, and a fade that will
      // not switch off at the bottom is worse than no fade at all: it claims
      // there is more to read when you have read it.
      const next = { start: pos > 1, end: pos + shown < all - 1 }
      setEdges((prev) =>
        prev.start === next.start && prev.end === next.end ? prev : next,
      )
    }
    measure()
    node.addEventListener("scroll", measure, { passive: true })
    // The box changing size is half of it. The content growing inside it is
    // the other half — a fold opening adds to `scrollHeight` without the
    // container itself moving at all — so the child is observed too.
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    if (node.firstElementChild) ro.observe(node.firstElementChild)
    return () => {
      node.removeEventListener("scroll", measure)
      ro.disconnect()
    }
  }, [node, axis])

  return { attach: setNode, node, start: edges.start, end: edges.end }
}

/**
 * The two stop sizes `.edge-fade-x` / `.edge-fade-y` read, as inline custom
 * properties. They are lengths rather than a class each way round because the
 * two ends have to be set independently and a mask is one declaration: a
 * second class could only overwrite the first, never compose with it.
 */
export const edgeFade = (
  start: boolean,
  end: boolean,
  px = 24,
): CSSProperties =>
  ({
    "--edge-start": start ? `${px}px` : "0px",
    "--edge-end": end ? `${px}px` : "0px",
  }) as CSSProperties
