/* ---------------------------------------------------------------
   A slot's counters, under its heading and above its entries.

   Two things live here and both are used in two places — the day card's
   readout and the day dialog's editor — because a count recorded against the
   morning should look the same wherever the morning is drawn.

   `SlotCounterRows` is the list. Clicking a row turns it into a field, the
   same gesture and the same three buttons as `EntryEditRow`: delete on the
   left, cancel and done on the right. Cancel is an undo rather than a
   discard, since every keystroke has already been written.

   `AddCounterForm` is the "+" for counters. Units already recorded in this
   slot are **disabled** in its picker, not hidden: hiding them would leave you
   wondering where Lessons went, while a disabled row with a reason attached
   says "that one exists, go and edit it" — which is a click away, directly
   above.
--------------------------------------------------------------- */

import { useState } from "react"
import { Ban, Check, Trash2 } from "lucide-react"
import type { CounterUnit } from "../types/model"
import type { DayCounters } from "../lib/counters"
import { setSlotCount, slotUnitValue, unitsInSlot } from "../lib/counters"
import {
  FIELD_BARE,
  FIELD_BOXED,
  btnBase,
  cardSmall,
  cardTiny,
} from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

import { usePalette } from "../ui/useTheme"
const iconBtn = `${btnBase} p-1 rounded shrink-0`

export function SlotCounterRows({
  units,
  counters,
  slotId,
  editingUnitId,
  onOpen,
  onChange,
  onCancel,
  onClose,
  roomy,
}: {
  units: CounterUnit[]
  counters: DayCounters
  slotId: string
  roomy?: boolean
  /** Non-null only for the one row open as a form. */
  editingUnitId?: string | null
  onOpen?: (unitId: string, original: number) => void
  onChange?: (next: DayCounters) => void
  onCancel?: () => void
  onClose?: () => void
}) {
  const c = usePalette()
  const present = unitsInSlot(units, counters, slotId)
  if (!present.length) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-1">
      {present.map((unit) => {
        const value = slotUnitValue(counters, unit.id, slotId)
        const editing = editingUnitId === unit.id

        if (editing && onChange && onCancel && onClose) {
          return (
            <div
              key={unit.id}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1"
              style={{
                backgroundColor: `${unit.color}14`,
                boxShadow: `inset 0 0 0 1px ${unit.color}33`,
              }}
            >
              <RenderIcon
                name={unit.iconName}
                size={10}
                style={{ color: unit.color }}
              />
              <input
                type="number"
                min={0}
                autoFocus
                value={value}
                onChange={(e) =>
                  onChange(
                    setSlotCount(
                      counters,
                      unit.id,
                      slotId,
                      Math.max(0, Number(e.target.value) || 0),
                    ),
                  )
                }
                className={`${FIELD_BARE} w-10 ${cardSmall(roomy)}`}
                style={{ color: unit.color }}
              />
              <Tip text="Remove from this slot">
                <button
                  onClick={() => {
                    onChange(setSlotCount(counters, unit.id, slotId, 0))
                    onClose()
                  }}
                  className={`${iconBtn} hover:bg-card/70`}
                  style={{ color: c.exam }}
                >
                  <Trash2 size={11} />
                </button>
              </Tip>
              <Tip text="Cancel changes">
                <button
                  onClick={onCancel}
                  className={`${iconBtn} text-ink/40 hover:text-ink hover:bg-card/70`}
                >
                  <Ban size={11} />
                </button>
              </Tip>
              <Tip text="Done">
                <button
                  onClick={onClose}
                  className={`${iconBtn} hover:bg-card/70`}
                  style={{ color: c.goalMet }}
                >
                  <Check size={12} />
                </button>
              </Tip>
            </div>
          )
        }

        const pill = (
          <span
            className={`${btnBase} flex items-center gap-1 ${cardTiny(roomy)} uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full`}
            style={{ color: unit.color, backgroundColor: `${unit.color}1F` }}
          >
            <RenderIcon name={unit.iconName} size={10} />
            {value} {unit.label}
          </span>
        )
        return (
          <Tip key={unit.id} text={onOpen ? "Edit this count" : unit.label}>
            {onOpen ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(unit.id, value)
                }}
                className="cursor-pointer rounded-full"
              >
                {pill}
              </button>
            ) : (
              pill
            )}
          </Tip>
        )
      })}
    </div>
  )
}

export function AddCounterForm({
  units,
  counters,
  slotId,
  onAdd,
  onCancel,
}: {
  units: CounterUnit[]
  counters: DayCounters
  slotId: string
  onAdd: (unitId: string, amount: number) => void
  onCancel: () => void
}) {
  const c = usePalette()
  const taken = new Set(unitsInSlot(units, counters, slotId).map((u) => u.id))
  const firstFree = units.find((u) => !taken.has(u.id))
  const [unitId, setUnitId] = useState(firstFree?.id ?? units[0]?.id)
  const [amount, setAmount] = useState(1)

  if (!units.length) return null
  const allTaken = taken.size === units.length

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-wrap items-center gap-1.5 mb-1 rounded-lg bg-ink/[0.04] px-2 py-1.5"
    >
      {allTaken ? (
        <span className="text-[10px] font-mono text-ink/50">
          Every counter is already in this slot — edit one above.
        </span>
      ) : (
        <>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className={`${FIELD_BOXED} text-[11px]`}
          >
            {units.map((u) => (
              <option
                key={u.id}
                value={u.id}
                disabled={taken.has(u.id)}
                // Native selects cannot carry a tooltip on an option, so the
                // reason rides along in the label. Disabled and unexplained
                // would just look broken.
                title={
                  taken.has(u.id)
                    ? "Already in this slot — edit the existing one instead"
                    : undefined
                }
              >
                {u.label}
                {taken.has(u.id) ? " — already here" : ""}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            className={`${FIELD_BOXED} w-14 text-[11px]`}
          />
          <button
            onClick={() => onAdd(unitId, amount)}
            disabled={taken.has(unitId)}
            className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest disabled:opacity-40`}
            style={{ backgroundColor: c.goalMet, color: c.onFill }}
          >
            Add
          </button>
        </>
      )}
      <button
        onClick={onCancel}
        className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-ink/50 hover:text-ink`}
      >
        Cancel
      </button>
    </div>
  )
}
