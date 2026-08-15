/* ---------------------------------------------------------------
   Recording and showing counter units on a day.

   Two shapes of the same data: a grid of number fields in the day editor, one
   per unit and slot, and a row of small badges everywhere a day is drawn
   read-only.

   Neither knows what a unit means. That is the point of `spec 008` — the app
   used to hard-code one number field for lessons and one checkbox for exams,
   and a checkbox is just a number field that stops at one.

   The badges show the **day** figure, which is the unit's slots added up. The
   breakdown is one level down, in the editor and the tooltip, because "three
   lessons today" is the thing you glance at and "two of them in the morning"
   is the thing you go looking for.
--------------------------------------------------------------- */

import type { CounterUnit, Slot } from "../types/model"
import type { DayCounters } from "../lib/counters"
import {
  UNSLOTTED,
  dayTotals,
  setSlotCount,
  slotUnitValue,
  unitDayTotal,
} from "../lib/counters"
import { FIELD_BOXED, btnBase, cardTiny } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

/** The slot label for a tooltip, naming the unslotted bucket in words. Kept
 *  unexported: a value exported beside components breaks fast refresh. */
const slotName = (slots: Slot[], slotId: string) =>
  slotId === UNSLOTTED
    ? "no slot"
    : slots.find((s) => s.id === slotId)?.label || "removed slot"

export function CounterEditors({
  units,
  slots,
  counters,
  onChange,
}: {
  units: CounterUnit[]
  slots: Slot[]
  counters: DayCounters
  onChange: (next: DayCounters) => void
}) {
  if (!units.length) return null
  // A column per slot, plus the unslotted bucket — but only when something is
  // actually in it, so a day recorded entirely per-slot is not made to carry a
  // spare column forever.
  const columns = [
    ...slots.map((s) => ({ id: s.id, label: s.label, color: s.color })),
    ...(units.some((u) => slotUnitValue(counters, u.id, UNSLOTTED) > 0)
      ? [{ id: UNSLOTTED, label: "No slot", color: undefined }]
      : []),
  ]

  return (
    <div className="space-y-2">
      {units.map((unit) => (
        <div key={unit.id} className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide">
            <RenderIcon
              name={unit.iconName}
              size={12}
              style={{ color: unit.color }}
            />
            <span style={{ color: unit.color }}>{unit.label}</span>
            <span className="text-ink/40">
              {unitDayTotal(counters, unit.id)} today
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => (
              <label key={col.id} className="flex items-center gap-1">
                <span
                  className="text-[9px] font-mono uppercase tracking-widest text-ink/45"
                  style={col.color ? { color: col.color } : undefined}
                >
                  {col.label}
                </span>
                <input
                  type="number"
                  min={0}
                  value={slotUnitValue(counters, unit.id, col.id) || ""}
                  placeholder="0"
                  onChange={(e) =>
                    onChange(
                      setSlotCount(
                        counters,
                        unit.id,
                        col.id,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    )
                  }
                  className={`${FIELD_BOXED} w-12`}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

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
