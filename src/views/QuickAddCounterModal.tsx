/* ---------------------------------------------------------------
   Quick add — a counter, into one slot of one day.

   Adds to what is already there rather than replacing it, which is what makes
   it a quick action: finishing another lesson in the morning is "+1 morning",
   not "look up what the morning says and type one more".

   That is also why it shows both numbers. Picking a unit and a slot fills in
   what that pair already holds, and typing an amount shows what it will hold
   afterwards — so the thing you are about to change is on screen before you
   change it, and nothing is overwritten by surprise.
--------------------------------------------------------------- */

import { useState } from "react"
import { X } from "lucide-react"
import type { CounterUnit, DayKey, Slot } from "../types/model"
import type { DayCounters } from "../lib/counters"
import { slotUnitValue } from "../lib/counters"
import { fromKey } from "../lib/date"
import { FIELD_BOXED, btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { useModalDismiss } from "../ui/useModalDismiss"

import { usePalette } from "../ui/useTheme"
export function QuickAddCounterModal({
  dateKey,
  units,
  slots,
  counters,
  onCancel,
  onAdd,
}: {
  dateKey: DayKey
  units: CounterUnit[]
  slots: Slot[]
  counters: DayCounters
  onCancel: () => void
  onAdd: (unitId: string, slotId: string, amount: number) => void
}) {
  const c = usePalette()
  const [unitId, setUnitId] = useState(units[0]?.id)
  const [slotId, setSlotId] = useState(slots[0]?.id)
  const [amount, setAmount] = useState(1)
  const onBackdropClick = useModalDismiss(onCancel)

  const unit = units.find((u) => u.id === unitId)
  const already = slotUnitValue(counters, unitId, slotId)
  const after = already + amount
  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: c.page }}
        className="w-full sm:max-w-[420px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-card">
          <div>
            <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
              Add to a counter
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50">
              {d.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onCancel}
            className={`${btnBase} text-ink/50 hover:text-ink`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Counter
              </span>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className={`${FIELD_BOXED} w-full`}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Time slot
              </span>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className={`${FIELD_BOXED} w-full`}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-ink/50">
              How many
            </span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
              className={`${FIELD_BOXED} w-20`}
            />
          </label>

          {/* Both numbers, before and after. The whole point of the dialog is
              that it adds to a running count, so the count it is adding to has
              to be visible. */}
          <div className="flex items-center gap-1.5 rounded-xl bg-card p-3 text-[11px] font-mono">
            {unit && (
              <RenderIcon
                name={unit.iconName}
                size={13}
                style={{ color: unit.color }}
              />
            )}
            <span className="text-ink/60">
              This slot has <strong className="text-ink">{already}</strong>
              {" → will have "}
              <strong style={{ color: c.accent }}>{after}</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onCancel}
              className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd(unitId, slotId, amount)}
              className={`${btnBase} px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
              style={{ backgroundColor: c.accent, color: c.onFill }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
