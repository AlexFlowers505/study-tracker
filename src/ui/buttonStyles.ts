/* Shared button class strings. Their own file rather than sitting beside the
   components that use them: a module that exports both components and plain
   values breaks fast refresh. */

import type { CSSProperties } from "react"
import { ACCENT, btnBase } from "../lib/theme"

export const segBtn = (active: boolean): string =>
  `${btnBase} text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 ${
    active
      ? "text-white border-transparent"
      : "bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35"
  }`

export const segBtnStyle = (active: boolean): CSSProperties | undefined =>
  active ? { backgroundColor: ACCENT } : undefined
