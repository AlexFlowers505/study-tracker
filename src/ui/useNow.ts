import { useEffect, useState } from "react"

/**
 * The clock, re-read every `ms` while `active` — for a figure that grows while
 * you watch it, like a running session's duration (`spec 028`).
 *
 * Idle when nothing needs it, so a page with no running session sets no timer
 * at all; and twenty seconds rather than one, because the figure is printed to
 * the minute and a render a second for a number that changes once a minute is
 * waste.
 */
export function useNow(active: boolean, ms = 20000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [active, ms])
  return now
}
