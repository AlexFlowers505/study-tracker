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
     count. On, a series is one `thing × slot` pair — which is what shows *when*
     in the day a count is happening without giving up *what* it was.

   **Whole-day mode offers every series and lets you strike some out; by-slot
   mode offers none and lets you build them.** The two are not the same
   control, and the reason is arithmetic: six counters and six slots is
   thirty-six chips, all switched on, in a stack under a chart that has become
   unreadable — and getting from there to "youtube in the evening" is
   thirty-five clicks of taking things away. Building up is two clicks, and the
   chart is legible at every step. It is also the only way to plot one counter
   in two slots and nothing else, which is the question people actually have.

   Splitting keeps the colour saying which thing it is: every slot of one tag
   shares that tag's colour and steps down in opacity **by the slot's own
   position**, not by the order you picked it, so morning is the same shade
   whichever chart you are looking at.
--------------------------------------------------------------- */

import type { CounterUnit, Day, Slot, Tag } from "../types/model"
import { dayCounters, slotUnitValue, unitDayTotal } from "./counters"

export type CounterGroupBy = "tag" | "counter"

/** One `thing × slot` the user has asked to see. Order is drawing order. */
export interface CounterPick {
  /** A tag id or a unit id, depending on the mode that added it. */
  thingId: string
  slotId: string
}

/** What one colour means, before any slot split. */
export interface CounterThing {
  id: string
  label: string
  color: string
  /** The units whose counts this thing adds up. */
  unitIds: string[]
}

export interface CounterSeries extends CounterThing {
  /** Stepped down per slot so one thing's slots read as one block. */
  fillOpacity: number
  /** Null when the series covers the whole day. */
  slotId: string | null
}

/**
 * The things available in a mode, in configured order.
 *
 * Untagged units are left out of tag mode entirely — in `counter` grouping too,
 * because the whole point of that combination is "the same thing as counter
 * mode, but filtered down to what carries a tag".
 */
export function counterThings(
  mode: "tag" | "counter",
  groupBy: CounterGroupBy,
  units: CounterUnit[],
  tags: Tag[],
): CounterThing[] {
  const asUnit = (u: CounterUnit): CounterThing => ({
    id: u.id,
    label: u.label,
    color: u.color,
    unitIds: [u.id],
  })
  if (mode === "counter") return units.map(asUnit)
  if (groupBy === "counter")
    return units.filter((u) => (u.tagIds || []).length > 0).map(asUnit)
  return tags.map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    unitIds: units.filter((u) => (u.tagIds || []).includes(t.id)).map((u) => u.id),
  }))
}

/** Never below a third, or the last slot of a long list disappears. */
export const slotOpacity = (index: number) => Math.max(0.22, 0.7 - index * 0.12)

/** The id a `thing × slot` series is drawn under. Also the pick's identity. */
export const pickId = (thingId: string, slotId: string) =>
  `${thingId}::${slotId}`

/**
 * The series for a counter chart, in drawing order.
 *
 * `picks` is only read when `bySlot` — a pick naming a thing this mode does not
 * have (a tag id while the chart is in counter mode) is dropped rather than
 * drawn empty, so one shared pick list can serve both modes and each shows the
 * half that applies to it.
 */
export function counterSeries(
  mode: "tag" | "counter",
  groupBy: CounterGroupBy,
  bySlot: boolean,
  units: CounterUnit[],
  tags: Tag[],
  slots: Slot[],
  picks: CounterPick[],
): CounterSeries[] {
  const things = counterThings(mode, groupBy, units, tags)

  if (!bySlot) {
    return things.map((t) => ({ ...t, fillOpacity: 0.55, slotId: null }))
  }

  const out: CounterSeries[] = []
  picks.forEach((p) => {
    const thing = things.find((t) => t.id === p.thingId)
    const index = slots.findIndex((s) => s.id === p.slotId)
    if (!thing || index < 0) return
    out.push({
      ...thing,
      id: pickId(thing.id, p.slotId),
      label: `${thing.label} · ${slots[index].label}`,
      fillOpacity: slotOpacity(index),
      slotId: p.slotId,
    })
  })
  return out
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
