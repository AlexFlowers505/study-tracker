/* ---------------------------------------------------------------
   Change log.

   Records what an edit actually changed, not that one happened — the point is
   to answer "what was the time before I overwrote it", which needs the old
   value alongside the new one.

   Best-effort by design: it is a convenience, so a log that cannot be read or
   written must never take the app down or raise the save banner.
--------------------------------------------------------------- */

import type {
  Category,
  CounterUnit,
  Day,
  Slot,
  StudyEntry,
  TimeEntry,
} from "../types/model"
import { UNSLOTTED } from "./counters"
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
  units: CounterUnit[] = [],
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

  // Walks the unit list rather than naming two fields. Missing this is how a
  // counter edit would stop reaching the log — silently, since the log
  // swallows its own failures by design.
  // Per slot, not per day: "Lessons 2 → 3" does not say where it moved, and a
  // count shifted from one slot to another leaves the day total unchanged and
  // would otherwise go unrecorded entirely.
  units.forEach((unit) => {
    const a = before?.counters?.[unit.id] || {}
    const b = after?.counters?.[unit.id] || {}
    const slotIds = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    slotIds.forEach((slotId) => {
      const from = a[slotId] || 0
      const to = b[slotId] || 0
      if (from === to) return
      const where =
        slotId === UNSLOTTED
          ? ""
          : ` · ${slots.find((s) => s.id === slotId)?.label || "removed slot"}`
      details.push(`${unit.label}${where}: ${from} → ${to}`)
    })
  })
  if (!!before?.ignore !== !!after?.ignore)
    details.push(after?.ignore ? "ignored in statistics" : "no longer ignored")
  if ((before?.comment || "") !== (after?.comment || ""))
    details.push("day note edited")

  return details
}
