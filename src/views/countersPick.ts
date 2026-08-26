/* ---------------------------------------------------------------
   The kinds a target can be, and the two-step choice between them.

   **Values here, the component next door**, because a module in this codebase
   exports components or plain values and never both — `react-refresh` fails
   the mix, which is the same reason the hooks, the icon list and the button
   styles each have a file of their own.

   Lifted out of `StreakRulesTab` when `spec 014` gave achievements the same
   picker. It is the same question — *what are we counting* — and two copies of
   a taxonomy is how the two halves of an app come to disagree about what a
   category is.
--------------------------------------------------------------- */

import type { Labeled, StreakTarget, StreakTargetKind } from "../types/model"
import type { StreakContext } from "../lib/customStreaks"
import { isCheck, splitByKind } from "../lib/checks"
import { FIELD_SOFT_INLINE, btnBase } from "../lib/theme"

/* The two set actions. Deliberately not the chips' shape: they act on the row
   rather than being part of it. */
export const PICK_ACTION = `${btnBase} text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full text-ink/40 hover:text-ink hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent`

export const KIND_SELECT = `${FIELD_SOFT_INLINE} field-sizing-content min-w-24 max-w-48 rounded-lg py-1 text-[11px]`
export const WORD = "text-[11px] font-mono text-ink/55"

/**
 * The kinds of thing you can point a condition at.
 *
 * Not the same list as `StreakTargetKind`: a tally and a check are both a
 * `unit` in the data and two different questions to a person, and this is the
 * list a person is choosing from. `targetKindOf` is the whole of the mapping.
 */
export type PickKind = "time" | "activity" | "tally" | "check" | "category" | "tag"

export const PICKS: PickKind[] = [
  "time",
  "activity",
  "tally",
  "check",
  "category",
  "tag",
]

/* Plural, because every one of them now takes several: a condition names the
   counters it watches, not the counter. */
export const PICK_LABEL: Record<PickKind, string> = {
  time: "All study time",
  activity: "Activities",
  tally: "Tallies",
  check: "Checks",
  category: "Categories",
  tag: "Tags",
}

export const SET_PICKS: PickKind[] = ["category", "tag"]



/**
 * Which counters inside a set are counted.
 *
 * **Three, and no "any".** The arithmetic of adding tallies to checks works —
 * a `yes` is stored as a count of one — and that was the argument for offering
 * it. Arithmetic working is not the test. "Three slips and two days answered
 * yes make five" is a number with no meaning behind it, and a set exists to
 * say *which kind of thing* inside it this rule is about. `any` is still the
 * shape of a condition written before the choice existed, so it reads; it is
 * simply not offered.
 */
export type MemberPick = "activity" | "tally" | "check" | "any"

export const MEMBER_LABEL: Record<MemberPick, string> = {
  activity: "Activities",
  tally: "Tallies",
  check: "Checks",
  any: "Any counter",
}

/** How a set's two stored fields read back as one choice. */
export const memberPickOf = (target: StreakTarget): MemberPick =>
  target.memberKind === "tally"
    ? "tally"
    : target.memberKind === "check"
      ? "check"
      : target.measure === "time"
        ? "activity"
        : "any"

/** And the same in reverse. */
export const memberFields = (
  pick: MemberPick,
): Pick<StreakTarget, "measure" | "memberKind"> =>
  pick === "activity"
    ? { measure: "time", memberKind: undefined }
    : pick === "any"
      ? { measure: "count", memberKind: undefined }
      : { measure: "count", memberKind: pick }

export const targetKindOf = (pick: PickKind): StreakTargetKind =>
  pick === "tally" || pick === "check" ? "unit" : pick

/** Which kind an existing target belongs to, splitting units back in two. */
export function pickOf(target: StreakTarget, ctx: StreakContext): PickKind {
  if (target.kind !== "unit") return target.kind
  const unit = ctx.units.find((u) => u.id === target.id)
  return unit && isCheck(unit) ? "check" : "tally"
}

/** What the second dropdown offers. Empty for study time, which names nothing. */
export function choicesFor(pick: PickKind, ctx: StreakContext): Labeled[] {
  const { tallies, checks } = splitByKind(ctx.units)
  if (pick === "activity") return ctx.activities
  if (pick === "tally") return tallies
  if (pick === "check") return checks
  if (pick === "category") return ctx.categories
  if (pick === "tag") return ctx.tags
  return []
}
