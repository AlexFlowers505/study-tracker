/* ---------------------------------------------------------------
   Where a toggle was when it was pressed.

   Its own module because `JumpPrompt` is a component and a view file exports
   components or plain values, never both — mixing them fails
   `react-refresh/only-export-components`, which is why the hooks, the icon
   list and the button styles each have a file of their own too.
--------------------------------------------------------------- */

/** A point under a button, in viewport coordinates, and where it leads. */
export interface JumpAt {
  /** The section to scroll to. */
  id: string
  top: number
  left: number
}

/**
 * Measured from the click's own `currentTarget`.
 *
 * **Not from a ref.** The first cut kept one on the toggle and read it in an
 * effect, which is a ref read during render plus a `setState` inside an
 * effect — two cascading-render warnings for a rectangle that was already
 * sitting in the event.
 */
export const jumpAt = (id: string, el: HTMLElement | null): JumpAt | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { id, top: r.bottom + 6, left: r.left + r.width / 2 }
}
