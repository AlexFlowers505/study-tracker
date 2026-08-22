/* ---------------------------------------------------------------
   What a period counted, arranged for reading.

   Everything the app records about a day is a counter of some kind — an
   activity records time, a tally records how many, a check records whether or
   not — so a period's report is all three, and it got long enough to need
   grouping. The same two arrangements Setup offers: **by kind**, or **by
   category**.

   **Only what actually happened appears.** An activity with no time and a
   tally that stayed at zero have nothing to say about this period, and a row
   of nothings pushes the ones that matter off the end. That is also what makes
   the list usable at all: a project can define forty things and still report
   six in a given week.
--------------------------------------------------------------- */

import type {
  Activity,
  Category,
  CounterUnit,
} from "../types/model"
import { counterKind } from "./checks"
import { fmtHours } from "./time"

/** One thing a period counted. */
export interface CounterChip {
  id: string
  label: string
  color: string
  iconName: string
  /** Printed before the label — "3", or "2h 30m" for an activity. */
  value: string
  tip: string
}

export interface CounterGroup {
  /** A kind id, a category id, or `""` for the unfiled. */
  id: string
  label: string
  /** A category's own colour; kinds have none. */
  color?: string
  chips: CounterChip[]
}

export type CounterGrouping = "kind" | "category"

const KIND_LABEL: Record<string, string> = {
  activity: "Activities",
  tally: "Tallies",
  check: "Checks",
}

/** The order kinds are read in: time first, then counts, then answers. */
const KIND_ORDER = ["activity", "tally", "check"] as const

export function periodCounterGroups({
  activities,
  activityMinutes,
  units,
  totals,
  categories,
  grouping,
}: {
  activities: Activity[]
  /** Minutes per activity over the period. */
  activityMinutes: Record<string, number>
  units: CounterUnit[]
  /** Counts per unit over the period. */
  totals: Record<string, number>
  categories: Category[]
  grouping: CounterGrouping
}): CounterGroup[] {
  const chips: { chip: CounterChip; kind: string; categoryId: string }[] = []

  activities.forEach((a) => {
    const minutes = activityMinutes[a.id] || 0
    if (minutes <= 0) return
    chips.push({
      kind: "activity",
      categoryId: a.categoryId || "",
      chip: {
        id: a.id,
        label: a.label,
        color: a.color,
        iconName: a.iconName,
        value: fmtHours(minutes),
        tip: `${fmtHours(minutes)} on ${a.label}`,
      },
    })
  })

  units.forEach((u) => {
    const n = totals[u.id] || 0
    if (n <= 0) return
    chips.push({
      kind: counterKind(u),
      categoryId: u.categoryId || "",
      chip: {
        id: u.id,
        label: u.label,
        color: u.color,
        iconName: u.iconName,
        value: String(n),
        tip: `${n} × ${u.label}`,
      },
    })
  })

  if (grouping === "kind")
    return KIND_ORDER.map((kind) => ({
      id: kind,
      label: KIND_LABEL[kind],
      chips: chips.filter((x) => x.kind === kind).map((x) => x.chip),
    })).filter((g) => g.chips.length > 0)

  // A category id pointing at a category that no longer exists reads as
  // unfiled rather than vanishing — the same rule Setup's shelf follows, and
  // for the same reason: a row that disappears from every heading is a worse
  // failure than one filed under nothing.
  const known = new Set(categories.map((cat) => cat.id))
  const filed = (id: string) => (known.has(id) ? id : "")

  return [
    ...categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      chips: chips.filter((x) => filed(x.categoryId) === cat.id).map((x) => x.chip),
    })),
    {
      id: "",
      label: "Not filed",
      chips: chips.filter((x) => filed(x.categoryId) === "").map((x) => x.chip),
    },
  ].filter((g) => g.chips.length > 0)
}
