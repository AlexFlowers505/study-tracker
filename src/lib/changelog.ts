/* ---------------------------------------------------------------
   Change log.

   Records what an edit actually changed, not that one happened — the point is
   to answer "what was the time before I overwrote it", which needs the old
   value alongside the new one.

   Best-effort by design: it is a convenience, so a log that cannot be read or
   written must never take the app down or raise the save banner.
--------------------------------------------------------------- */

import type { Category, Day, Slot, StudyEntry, TimeEntry } from "../types/model"
import { getById } from "./id"
import { startedPreviousDay } from "./time"

export const CHANGE_LOG_LIMIT = 200

type Scalar = string | number | undefined | null

export const entryLabel = (e: StudyEntry, categories: Category[]): string => {
  const cat = e.category ? getById(categories, e.category).label : null
  const when =
    e.start && e.end
      ? `${startedPreviousDay(e) ? "−1d " : ""}${e.start}–${e.end}`
      : `${Number(e.minutes) || 0}m`
  return cat ? `${when} ${cat}` : when
}

/** Field by field, so the line can say "10:35 → 11:05" rather than "changed". */
export function diffEntry(
  before: StudyEntry,
  after: StudyEntry,
  categories: Category[],
): string[] {
  const lines: string[] = []
  const field = (name: string, a: Scalar, b: Scalar) => {
    if ((a ?? "") === (b ?? "")) return
    lines.push(`${name}: ${a || "—"} → ${b || "—"}`)
  }
  field("start", before.start, after.start)
  field("end", before.end, after.end)
  field("minutes", before.minutes, after.minutes)
  if (before.category !== after.category) {
    field(
      "category",
      getById(categories, before.category).label,
      getById(categories, after.category).label,
    )
  }
  if ((before.comment || "") !== (after.comment || ""))
    lines.push("comment edited")
  return lines
}

const indexById = <T extends TimeEntry>(list: T[] | undefined): Map<string, T> => {
  const map = new Map<string, T>()
  ;(list || []).forEach((e) => map.set(e.id, e))
  return map
}

/** Walks both versions of a day and describes the difference in plain lines. */
export function diffDay(
  before: Day | undefined,
  after: Day | undefined,
  slots: Slot[],
  categories: Category[],
): string[] {
  const details: string[] = []
  const beforeCells = before?.cells || {}
  const afterCells = after?.cells || {}

  slots.forEach((slot) => {
    const a = indexById(beforeCells[slot.id])
    const b = indexById(afterCells[slot.id])
    b.forEach((entry, id) => {
      const prev = a.get(id)
      if (!prev) {
        details.push(`+ ${slot.label}: ${entryLabel(entry, categories)}`)
        return
      }
      diffEntry(prev, entry, categories).forEach((line) =>
        details.push(`~ ${slot.label}: ${line}`),
      )
    })
    // An entry that left one slot and arrived in another shows up as a delete
    // and an add; collapsing them would hide which slot it landed in.
    a.forEach((entry, id) => {
      if (!b.has(id))
        details.push(`− ${slot.label}: ${entryLabel(entry, categories)}`)
    })
  })

  const beforeSleep = indexById(before?.sleep)
  const afterSleep = indexById(after?.sleep)
  afterSleep.forEach((entry, id) => {
    const prev = beforeSleep.get(id)
    if (!prev) {
      details.push(`+ Sleep: ${entryLabel(entry, categories)}`)
      return
    }
    diffEntry(prev, entry, categories).forEach((line) =>
      details.push(`~ Sleep: ${line}`),
    )
  })
  beforeSleep.forEach((entry, id) => {
    if (!afterSleep.has(id))
      details.push(`− Sleep: ${entryLabel(entry, categories)}`)
  })

  const scalar = (name: string, a: Scalar, b: Scalar) => {
    if ((a ?? "") === (b ?? "")) return
    details.push(`${name}: ${a || "—"} → ${b || "—"}`)
  }
  scalar("lessons", before?.lessons, after?.lessons)
  if (!!before?.exam !== !!after?.exam)
    details.push(after?.exam ? "exam passed" : "exam unmarked")
  if (!!before?.ignore !== !!after?.ignore)
    details.push(after?.ignore ? "ignored in statistics" : "no longer ignored")
  if ((before?.comment || "") !== (after?.comment || ""))
    details.push("day note edited")

  return details
}
