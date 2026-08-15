/* Shared button class strings. Their own file rather than sitting beside the
   components that use them: a module that exports both components and plain
   values breaks fast refresh. */

import type { CSSProperties } from "react"
import type { Palette } from "../lib/theme"
import { btnBase } from "../lib/theme"

export const segBtn = (active: boolean): string =>
  `${btnBase} text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 ${
    active
      ? "border-transparent"
      : "bg-card hover:bg-ink/5 hover:border-ink/35"
  }`

// The foreground comes from the palette rather than a `text-white` class:
// the accent lightens in dark mode, and white on a light fill is the one
// pairing that gets worse as the rest of the page gets better.
export const segBtnStyle = (
  active: boolean,
  c: Palette,
): CSSProperties | undefined =>
  active ? { backgroundColor: c.accent, color: c.onFill } : undefined
