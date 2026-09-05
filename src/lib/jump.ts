/* ---------------------------------------------------------------
   Where a toggle was when it was pressed.

   Its own module because `JumpPrompt` is a component and a view file exports
   components or plain values, never both — mixing them fails
   `react-refresh/only-export-components`, which is why the hooks, the icon
   list and the button styles each have a file of their own too.
--------------------------------------------------------------- */

/** A point under a button, in **page** coordinates, and where it leads. */
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
 *
 * **Page coordinates, not viewport ones** — the scroll offset is added here
 * so the offer can be positioned `absolute` against the document. The toggle
 * it points at lives in the sticky period bar, so a viewport-fixed pill
 * followed that bar down the page: scroll to read the section you just opened
 * and the offer to open it came along, hovering over the thing it was
 * offering to show you. Anchored to the document it stays where it was made,
 * which is also where the eye left it, and it scrolls off the top like any
 * other thing you have finished with.
 */
export const jumpAt = (id: string, el: HTMLElement | null): JumpAt | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    id,
    top: r.bottom + window.scrollY + 6,
    left: r.left + window.scrollX + r.width / 2,
  }
}
