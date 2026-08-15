/* ---------------------------------------------------------------
   Colours and the class strings that carry the app's look.

   Reuse these rather than writing a new hex literal. Tailwind cannot see a
   class name built from a template literal, so anything dynamic goes in
   `style`, not `className` — which is why the surface helpers here return
   style objects.
--------------------------------------------------------------- */

import type { CSSProperties } from "react"
import type { GoalOutcome } from "../types/model"

/**
 * Slot and category colours, ordered around the wheel so neighbours in the
 * grid are neighbours in hue and the whole set can be scanned at once.
 *
 * Two of the old ten were dropped for being indistinguishable at the size
 * these are actually seen — a 10px icon and a 2px rail: `#4AA5A0` against
 * `#2F9E8F`, and `#C98A2E` against `#E29A3E`. **Removing a colour does not
 * touch saved data**: slots and categories store their own hex, so anything
 * already using one keeps it and simply cannot be re-picked from the grid.
 */
export const PALETTE = [
  "#C1595B", // red
  "#D2703A", // burnt orange
  "#E29A3E", // amber
  "#B8912F", // mustard
  "#8A9A3B", // olive
  "#5C8A3A", // green
  "#3F8F63", // forest
  "#2F9E8F", // teal
  "#35A7B8", // cyan
  "#4C8FBD", // blue
  "#3E6FA8", // deep blue
  "#6B7FD7", // indigo
  "#8B6FB3", // purple
  "#B0559E", // magenta
  "#C4577F", // rose
  "#8C5A3C", // chocolate
  "#7A6A5D", // taupe
  "#5E7A86", // slate
]

/**
 * Spelled out rather than indexed into `PALETTE`. It used to be `PALETTE[3]`,
 * which quietly made every sleep chart a different colour the moment the list
 * was reordered.
 */
export const SLEEP_COLOR = "#8B6FB3"

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

/**
 * The exception to the rule above, for editing something in the middle of the
 * text that displays it — an entry on a day card, where the whole point is
 * that the line barely changes when it becomes editable. A filled box there
 * would redraw the row into a form and lose the thread.
 *
 * It carries no fill and no border; the dotted underline is the entire
 * affordance, and hover and focus deepen it. What says "you are editing" is
 * the wash and outline around the row as a whole, not the state of each field
 * — see `EntryEditRow`.
 */
export const FIELD_BARE =
  "font-mono bg-transparent border-0 p-0 appearance-none cursor-pointer " +
  "underline decoration-dotted decoration-[#1E2A33]/30 underline-offset-[3px] " +
  "hover:decoration-[#1E2A33]/60 focus:outline-none focus:decoration-solid " +
  "placeholder:text-[#1E2A33]/30"

/**
 * Type inside a day card, in two sizes.
 *
 * The 9–10px it used to be everywhere was a concession to seven cards sharing
 * a row, and it was paid for by every card that does not — a phone (one
 * column), the Day view, and the dialog. So the readable size is the default
 * and the cramped one only comes in from `md`, where the grid reaches three
 * across; `roomy` opts out of even that.
 *
 * Both branches are written out as literal strings because Tailwind scans
 * source text and cannot see a class name assembled at runtime.
 */
export const cardTiny = (roomy?: boolean) =>
  roomy ? "text-[11px]" : "text-[11px] md:text-[9px]"
export const cardSmall = (roomy?: boolean) =>
  roomy ? "text-[13px]" : "text-[13px] md:text-[10px]"

export const btnBase = "transition-colors duration-150 ease-out"
