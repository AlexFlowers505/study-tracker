import { useEffect, useRef, useState } from "react"

/**
 * Show-on-scroll-up: the period bar is worth reaching for at any depth of the
 * page, but not worth permanently spending a strip of vertical space on.
 * Scrolling down tucks it away, scrolling up brings it straight back.
 */
export function useRevealOnScrollUp(threshold = 6): boolean {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY.current
      // Ignore jitter, and never hide it while we're still near the top —
      // there's nothing above it to tuck under yet.
      if (Math.abs(delta) < threshold) return
      setVisible(delta < 0 || y < 120)
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return visible
}
