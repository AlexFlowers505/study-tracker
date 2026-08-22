/* ---------------------------------------------------------------
   Showing counter units on a day.

   A row of small badges, everywhere a day is drawn.

   It does not know what a unit means. That is the point of `spec 008` — the app
   used to hard-code one number field for lessons and one checkbox for exams,
   and a checkbox is just a number field that stops at one.

   The badges show the **day** figure, which is the unit's slots added up. The
   breakdown is one level down, in the tooltip, because "three lessons today" is
   the thing you glance at and "two of them in the morning" is the thing you go
   looking for.
--------------------------------------------------------------- */

import type { CounterUnit, Slot } from "../types/model"
import type { DayCounters } from "../lib/counters"
import { UNSLOTTED, dayTotals } from "../lib/counters"
import { btnBase, cardTiny } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

/** The slot label for a tooltip, naming the unslotted bucket in words. Kept
 *  unexported: a value exported beside components breaks fast refresh. */
const slotName = (slots: Slot[], slotId: string) =>
  slotId === UNSLOTTED
    ? "no slot"
    : slots.find((s) => s.id === slotId)?.label || "removed slot"

export function CounterBadges({
  units,
  slots,
  counters,
  roomy,
}: {
  units: CounterUnit[]
  slots: Slot[]
  counters: DayCounters
  roomy?: boolean
}) {
  const totals = dayTotals(counters)
  // Only units this day actually touched: a row of zeroes on every card would
  // be noise, and an absent badge already says none.
  const shown = units.filter((u) => (totals[u.id] || 0) > 0)
  if (!shown.length) return null
  return (
    <>
      {shown.map((unit) => {
        const bySlot = counters[unit.id] || {}
        const breakdown = Object.entries(bySlot)
          .filter(([, n]) => n > 0)
          .map(([slotId, n]) => `${n} · ${slotName(slots, slotId)}`)
          .join("\n")
        return (
          <Tip
            key={unit.id}
            multiline
            text={`${totals[unit.id]} × ${unit.label}\n\n${breakdown}`}
          >
            <span
              className={`${btnBase} flex items-center gap-1 ${cardTiny(roomy)} uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full`}
              style={{ color: unit.color, backgroundColor: `${unit.color}1F` }}
            >
              <RenderIcon name={unit.iconName} size={10} />
              {totals[unit.id]}
            </span>
          </Tip>
        )
      })}
    </>
  )
}
