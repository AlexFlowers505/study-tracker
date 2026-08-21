/* Shared button class strings. Their own file rather than sitting beside the
   components that use them: a module that exports both components and plain
   values breaks fast refresh. */

import type { CSSProperties } from "react"
import type { Palette } from "../lib/theme"
import { btnBase } from "../lib/theme"

/**
 * The same shape as the period pills at the top of the page: a rounded track
 * with the active one filled. They were two different-looking controls doing
 * the same job — pick one of these — and the page reads as fewer kinds of
 * thing when the answer to "how do I switch something" always looks the same.
 */
export const segBtn = (active: boolean): string =>
  `${btnBase} rounded-full px-3 py-1.5 text-[11px] font-mono whitespace-nowrap ${
    active ? "" : "text-ink/60 hover:text-ink hover:bg-ink/5"
  }`

// The foreground comes from the palette rather than a `text-white` class:
// the accent lightens in dark mode, and white on a light fill is the one
// pairing that gets worse as the rest of the page gets better.
export const segBtnStyle = (
  active: boolean,
  c: Palette,
): CSSProperties | undefined =>
  active ? { backgroundColor: c.accent, color: c.onFill } : undefined
