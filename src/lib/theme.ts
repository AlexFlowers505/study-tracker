/* ---------------------------------------------------------------
   Colours and the class strings that carry the app's look.

   Reuse these rather than writing a new hex literal. Tailwind cannot see a
   class name built from a template literal, so anything dynamic goes in
   `style`, not `className` — which is why the surface helpers here return
   style objects.
--------------------------------------------------------------- */

import type { CSSProperties } from "react"
import type { GoalOutcome } from "../types/model"

export const PALETTE = [
  "#E29A3E",
  "#4C8FBD",
  "#2F9E8F",
  "#8B6FB3",
  "#C1595B",
  "#5C8A3A",
  "#B0559E",
  "#4AA5A0",
  "#C98A2E",
  "#6B7FD7",
]

export const SLEEP_COLOR = PALETTE[3]

export const ACCENT = "#2F5FBF" // bluish active-state accent
export const EXAM_COLOR = "#C1595B"
export const GOAL_MET_COLOR = "#2F9E8F"
export const INK = "#1E2A33" // the app's near-black, used for text and washes
export const PAGE_TINT = "#F4F5F7"
// Shared by the count filter's panel and the dot on its toggle, so the badge in
// the period bar reads as belonging to the panel it opens.
export const FILTER_TINT = "#6B7FD7"
/**
 * A day saved by a streak freeze. Its own colour on purpose: the goal was
 * missed, so it must not read as green — but a freeze was spent to stop it
 * being a failure, so it must not read as red either.
 */
export const FREEZE_COLOR = "#4C8FBD"
/**
 * Overall stats and streaks share this amber, and that is deliberate: both
 * are project-wide while everything else on the page is period-scoped, so
 * reading as a pair is the point.
 */
export const PROJECT_TINT = "#C98A2E"

export const CARD = "bg-white rounded-2xl p-4"

/**
 * An opaque white base with a translucent wash painted on top, so a tinted
 * surface looks the same whatever sits behind it. Setting the wash as the
 * background-color alone lets the parent bleed through — which is how the
 * month grid ended up showing one colour on desktop and another on a phone,
 * where the cells sit on the grid's seam colour.
 */
export const cellSurface = (
  wash: string | null,
  base = "#FFFFFF",
): CSSProperties => ({
  backgroundColor: base,
  ...(wash ? { backgroundImage: `linear-gradient(${wash}, ${wash})` } : {}),
})

/**
 * One surface for "goal met / missed / ignored", shared by the week cards and
 * the month grid. They used to differ only in what sat under the same
 * translucent wash — white in the grid, the page tint behind the cards — which
 * rendered as two different colours for the same state.
 *
 * A day with no verdict stays white, which is what separates it from the page;
 * the tinted states composite over the page tint, the more contrasty pairing.
 */
export const dayStateSurface = (
  goalOutcome: GoalOutcome,
  ignored?: boolean,
): CSSProperties => {
  if (ignored) return cellSurface(`${INK}0A`, PAGE_TINT)
  if (goalOutcome === "met") return cellSurface(`${GOAL_MET_COLOR}17`, PAGE_TINT)
  if (goalOutcome === "frozen") return cellSurface(`${FREEZE_COLOR}17`, PAGE_TINT)
  if (goalOutcome === "missed") return cellSurface(`${EXAM_COLOR}17`, PAGE_TINT)
  return cellSurface(null)
}

/**
 * Fields are filled, not outlined: on a white card they take the page tint, on
 * a tinted row they go white. That contrast step is what reads as "editable",
 * so the border is redundant. Selects and number inputs keep a hairline
 * (`FIELD_BOXED`) — they're small enough that fill alone reads as a label.
 */
const FIELD_BASE =
  "font-mono placeholder:text-[#1E2A33]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2A33]/10"
export const FIELD_ON_WHITE = `${FIELD_BASE} w-full rounded-xl bg-[#F4F5F7] px-2.5 py-2 text-xs`
export const FIELD_ON_TINT = `${FIELD_BASE} w-full rounded-xl bg-white px-2.5 py-2 text-[11px]`
export const FIELD_BOXED = `${FIELD_BASE} rounded-xl bg-white border border-[#1E2A33]/15 px-2 py-1.5 text-xs`

export const btnBase = "transition-colors duration-150 ease-out"
