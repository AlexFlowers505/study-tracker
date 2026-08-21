/* ---------------------------------------------------------------
   A slot's counters, under its heading and above its entries.

   Two things live here and both are used in two places — the day card's
   readout and the day dialog's editor — because a count recorded against the
   morning should look the same wherever the morning is drawn.

   `SlotCounterRows` is the list. Clicking a row turns it into a field, the
   same gesture and the same three buttons as `EntryEditRow`: delete on the
   left, cancel and done on the right. Cancel is an undo rather than a
   discard, since every keystroke has already been written.

--------------------------------------------------------------- */

import { Ban, Check, Trash2 } from "lucide-react"
import type { CounterUnit } from "../types/model"
import type { DayCounters } from "../lib/counters"
import { setSlotCount, slotUnitValue, unitsInSlot } from "../lib/counters"
import {
  FIELD_BARE,
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
