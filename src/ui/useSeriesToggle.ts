import { useCallback, useState } from "react"

export interface SeriesToggle {
  hidden: Set<string>
  toggle: (id: string) => void
  reset: () => void
  hideAll: (ids: string[]) => void
}

/** Which series of a chart are currently hidden. */
export function useSeriesToggle(): SeriesToggle {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const toggle = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const reset = useCallback(() => setHidden(new Set()), [])
  const hideAll = useCallback((ids: string[]) => setHidden(new Set(ids)), [])
  return { hidden, toggle, reset, hideAll }
}

/**
 * One button rather than two: with everything already hidden, "clear all" has
 * nothing to do, and vice versa — so the control shows whichever half applies.
 */
export function bulkToggleFor(
  series: { id: string }[],
  state: SeriesToggle,
): (showAll: boolean) => void {
  const ids = series.map((s) => s.id)
  return (showAll) => (showAll ? state.reset() : state.hideAll(ids))
}
