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
 * Slot and activity colours, ordered around the wheel so neighbours in the
 * grid are neighbours in hue and the whole set can be scanned at once.
 *
 * Two of the old ten were dropped for being indistinguishable at the size
 * these are actually seen — a 10px icon and a 2px rail: `#4AA5A0` against
 * `#2F9E8F`, and `#C98A2E` against `#E29A3E`. **Removing a colour does not
 * touch saved data**: slots and activities store their own hex, so anything
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

/* ---------------------------------------------------------------
   The two palettes.

   Surfaces (`ink`, `page`, `card`) are declared in `App.css` as Tailwind
   tokens as well, because almost every use of them is a class name — the
   copies here are for the handful of places that need a real colour string in
   JavaScript: Recharts takes its colours as SVG attributes, where `var()` is
   not a value, and `cellSurface` needs an opaque base to paint a wash over.
   **Keep the two in step**; the CSS block is the one that decides what the
   page looks like before the bundle has run.

   The accents are only here. They are lightened for dark rather than reused,
   because a colour chosen to carry against white does not carry against
   near-black: `#2F5FBF` on the dark card is a contrast of 2.6, which is a
   smudge rather than an accent.
--------------------------------------------------------------- */

export type ThemeChoice = "light" | "dark" | "system"
/** What `system` resolves to — the only thing anything downstream cares about. */
export type ThemeMode = "light" | "dark"

export interface Palette {
  /** Which of the two this is. Carried on the palette so anything that needs
   *  to know only has to take the one object. */
  mode: ThemeMode
  /** The foreground, and — at an alpha — every wash, hairline and dim label. */
  ink: string
  page: string
  card: string
  /**
   * Text on top of a solid accent fill: the "Today" pill, the streak count,
   * the active segment. It is not simply white, because the accents lighten in
   * dark mode and white on a light fill is the one pairing that gets *worse*
   * when the rest of the page gets better.
   */
  onFill: string
  accent: string
  exam: string
  goalMet: string
  freeze: string
  sleep: string
  project: string
  filter: string
  changelog: string
}

export const PALETTES: Record<ThemeMode, Palette> = {
  light: {
    mode: "light",
    ink: "#1E2A33",
    page: "#F4F5F7",
    card: "#FFFFFF",
    onFill: "#FFFFFF",
    accent: "#2F5FBF",
    exam: "#C1595B",
    goalMet: "#2F9E8F",
    freeze: "#4C8FBD",
    sleep: "#8B6FB3",
    project: "#D2740A",
    filter: "#6B7FD7",
    changelog: "#5C8A3A",
  },
  dark: {
    mode: "dark",
    ink: "#E4E9EF",
    page: "#10151A",
    card: "#1A2129",
    onFill: "#10151A",
    accent: "#6D9BEA",
    exam: "#E58184",
    goalMet: "#3FB5A4",
    freeze: "#66A9D7",
    sleep: "#AE8FD9",
    project: "#E9932A",
    filter: "#94A5EE",
    changelog: "#8FC163",
  },
}

/*
   What each accent means, kept from when they were loose constants:

   - `accent`   — the active state, and today.
   - `exam`     — a missed goal. Red.
   - `goalMet`  — a met goal. Green.
   - `freeze`   — a day saved by a streak freeze. Its own colour on purpose:
                  the goal was missed, so it must not read as green, but a
                  freeze was spent to stop it being a failure, so it must not
                  read as red either.
   - `sleep`    — spelled out rather than indexed into `PALETTE`. It used to be
                  `PALETTE[3]`, which quietly repainted every sleep chart the
                  moment that list was reordered.
   - `project`  — streaks, the one project-wide thing on a period-scoped page.
                  A marigold, not the ochre it started as: a desaturated yellow
                  at that lightness reads olive, which is the wrong feeling for
                  the number you are trying not to lose.
   - `filter`   — shared by the count filter's panel and the dot on its toggle,
                  so the badge reads as belonging to the panel it opens.
*/

export const CARD = "bg-card rounded-2xl p-4"

/**
 * An opaque base with a translucent wash painted on top, so a tinted surface
 * looks the same whatever sits behind it. Setting the wash as the
 * background-color alone lets the parent bleed through — which is how the
 * month grid ended up showing one colour on desktop and another on a phone,
 * where the cells sit on the grid's seam colour.
 *
 * `base` has to be passed rather than defaulted to white: which colour counts
 * as "opaque nothing" is exactly the thing that changes between themes.
 */
export const cellSurface = (
  wash: string | null,
  base: string,
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
 * A day with no verdict takes the plain card colour, which is what separates it
 * from the page; the tinted states composite over the page tint, the more
 * contrasty pairing.
 *
 * The washes are heavier in dark. A 9% tint reads clearly over `#F4F5F7` and
 * almost vanishes over `#10151A`, because the eye is comparing it against far
 * less light to begin with.
 */
export const dayStateSurface = (
  c: Palette,
  goalOutcome: GoalOutcome,
  ignored?: boolean,
): CSSProperties => {
  const dark = c.mode === "dark"
  const a = dark ? "2E" : "17"
  if (ignored) return cellSurface(`${c.ink}${dark ? "14" : "0A"}`, c.page)
  if (goalOutcome === "met") return cellSurface(`${c.goalMet}${a}`, c.page)
  if (goalOutcome === "frozen") return cellSurface(`${c.freeze}${a}`, c.page)
  if (goalOutcome === "missed") return cellSurface(`${c.exam}${a}`, c.page)
  return cellSurface(null, c.card)
}

/**
 * Fields are filled, not outlined: on a white card they take the page tint, on
 * a tinted row they go white. That contrast step is what reads as "editable",
 * so the border is redundant. Selects and number inputs keep a hairline
 * (`FIELD_BOXED`) — they're small enough that fill alone reads as a label.
 */
const FIELD_BASE =
  "font-mono placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
export const FIELD_ON_WHITE = `${FIELD_BASE} w-full rounded-xl bg-page px-2.5 py-2 text-xs`
export const FIELD_ON_TINT = `${FIELD_BASE} w-full rounded-xl bg-card px-2.5 py-2 text-[11px]`
export const FIELD_BOXED = `${FIELD_BASE} rounded-xl bg-card border border-ink/15 px-2 py-1.5 text-xs`

/**
 * Fields and buttons that separate themselves from the surface by **fill
 * alone** — no outline anywhere.
 *
 * An outline draws a hard edge around every control, and a form of six of them
 * reads as a grid of boxes rather than as a few things you can change. A step
 * in tone does the same job with none of the noise: on a card the control goes
 * slightly darker (or lighter, in dark mode — it is ink at an alpha either
 * way), which is enough to say "this is a control" and nothing more.
 *
 * `FIELD_BOXED` is still there for the places that genuinely need an edge, but
 * new forms should reach for these first.
 */
/**
 * The same surface without a width, for a control that sits *inside a
 * sentence* — a number in the middle of a line, a dropdown between two words.
 *
 * Its own constant rather than `FIELD_SOFT` plus a `w-14` after it: both are
 * width utilities in the same Tailwind layer, so which one wins is decided by
 * the order Tailwind emits them in and not by the order they were written. It
 * looked right until it didn't.
 */
export const FIELD_SOFT_INLINE =
  "font-mono rounded-xl bg-ink/[0.06] px-2.5 py-2 text-xs " +
  "border-0 appearance-none placeholder:text-ink/30 " +
  "focus:outline-none focus:ring-2 focus:ring-ink/15"

export const FIELD_SOFT = `${FIELD_SOFT_INLINE} w-full`

/** The same surface as a button — a "now", a time trigger, a small action. */
export const BTN_SOFT =
  "font-mono rounded-xl bg-ink/[0.06] px-2.5 py-2 text-[10px] uppercase " +
  "tracking-widest text-ink/70 hover:bg-ink/[0.10] hover:text-ink " +
  "focus:outline-none focus:ring-2 focus:ring-ink/15"

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
  "underline decoration-dotted decoration-ink/30 underline-offset-[3px] " +
  "hover:decoration-ink/60 focus:outline-none focus:decoration-solid " +
  "placeholder:text-ink/30"

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

/**
 * Recharts draws its tooltip as an inline-styled box, so it cannot be reached
 * by a class and would otherwise stay white with black text on a dark page.
 */
export const chartTooltip = (c: Palette): CSSProperties => ({
  fontSize: 11,
  fontFamily: "monospace",
  backgroundColor: c.card,
  border: `1px solid ${c.ink}22`,
  borderRadius: 10,
  color: c.ink,
})
