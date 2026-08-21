/* ---------------------------------------------------------------
   Turning counters into chart series.

   The charts already know how to draw "a list of coloured series, and a number
   per series per row" — that is how the slot and category splits work. So the
   counter modes only have to answer two questions in that same shape: which
   series are there, and what is this day's number for each.

   Two axes of choice, and they are independent:

   - **What identifies a series** — a tag, or a counter unit. Only offered in
     tag mode; counter mode is always by unit, because "group counters by
     counter" is the thing itself.
   - **Whether a series is split per slot.** Off, one series is a whole day's
     count. On, a series becomes one per `thing × slot`, which is what shows
     *when* in the day a count is happening without giving up *what* it was.

   Splitting multiplies the series, so the colour has to keep saying which
   thing it is: every slot of one tag shares that tag's colour and steps down
   in opacity, so a stack reads as one block subdivided rather than as a dozen
   unrelated bands.
--------------------------------------------------------------- */

import type { CounterUnit, Day, Slot, Tag } from "../types/model"
import { dayCounters, slotUnitValue, unitDayTotal } from "./counters"

export type CounterGroupBy = "tag" | "counter"

export interface CounterSeries {
  id: string
  label: string
  color: string
  /** Stepped down per slot so one thing's slots read as one block. */
  fillOpacity: number
  /** What to add up for this series on a given day. */
  unitIds: string[]
  /** Null when the series covers the whole day. */
  slotId: string | null
}

/**
 * The series for a counter chart, in drawing order.
 *
 * Untagged units are left out of tag mode entirely — in `counter` grouping too,
 * because the whole point of that combination is "the same thing as counter
 * mode, but filtered down to what carries a tag".
 */
export function counterSeries(
  mode: "tag" | "counter",
  groupBy: CounterGroupBy,
  bySlot: boolean,
  units: CounterUnit[],
  tags: Tag[],
  slots: Slot[],
): CounterSeries[] {
  const tagged = units.filter((u) => (u.tagIds || []).length > 0)

  // The "things": what one colour means before any slot split.
  const things: { id: string; label: string; color: string; unitIds: string[] }[] =
    mode === "counter"
      ? units.map((u) => ({
          id: u.id,
          label: u.label,
          color: u.color,
          unitIds: [u.id],
        }))
      : groupBy === "tag"
        ? tags.map((t) => ({
            id: t.id,
            label: t.label,
            color: t.color,
            unitIds: units
              .filter((u) => (u.tagIds || []).includes(t.id))
              .map((u) => u.id),
          }))
        : tagged.map((u) => ({
            id: u.id,
            label: u.label,
            color: u.color,
            unitIds: [u.id],
          }))

  if (!bySlot) {
    return things.map((t) => ({ ...t, fillOpacity: 0.55, slotId: null }))
  }

  return things.flatMap((t) =>
    slots.map((s, i) => ({
      id: `${t.id}::${s.id}`,
      label: `${t.label} · ${s.label}`,
      color: t.color,
      // Never below a third, or the last slot of a long list disappears.
      fillOpacity: Math.max(0.22, 0.7 - i * 0.12),
      unitIds: t.unitIds,
      slotId: s.id,
    })),
  )
}

/** This day's number for one series. */
export function seriesValue(day: Day | undefined, s: CounterSeries): number {
  const counters = dayCounters(day || {})
  return s.unitIds.reduce(
    (sum, unitId) =>
      sum +
      (s.slotId === null
        ? unitDayTotal(counters, unitId)
        : slotUnitValue(counters, unitId, s.slotId)),
    0,
  )
}
