/* ---------------------------------------------------------------
   Quick add — a whole entry composed before anything is written.

   Unlike the day editor, which saves every keystroke, nothing here reaches
   the day until "Add". That is the point of it, and it is also why leaving
   asks first: there is unsaved work in the dialog, which is never true
   anywhere else in this app.
--------------------------------------------------------------- */

import { useCallback, useState } from "react"
import { MessageSquare, X } from "lucide-react"
import type { Category, DayKey, Slot, StudyEntry, TimeOfDay } from "../types/model"
import { fromKey } from "../lib/date"
import { makeId } from "../lib/id"
import { fmtHours, spanMinutes } from "../lib/time"
import { CARD, FIELD_BOXED, FIELD_ON_WHITE, btnBase } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { TimeRangeField } from "../ui/TimeRangeField"
import { useModalDismiss } from "../ui/useModalDismiss"

import { usePalette } from "../ui/useTheme"
export function QuickAddEntryModal({
  dateKey,
  slots,
  categories,
  variant = "study",
  onCancel,
  onAdd,
}: {
  dateKey: DayKey
  slots: Slot[]
  categories: Category[]
  /**
   * Sleep is the same dialog with the top row removed: it is a flat list on
   * the day with no slot and no category. Sharing the component rather than
   * copying it is what keeps the two ways of adding a time the same shape.
   */
  variant?: "study" | "sleep"
  onCancel: () => void
  /** `slotId` is null for a sleep entry, which belongs to no slot. */
  onAdd: (dateKey: DayKey, slotId: string | null, entry: StudyEntry) => void
}) {
  const c = usePalette()
  const isSleep = variant === "sleep"
  const [slotId, setSlotId] = useState(slots[0]?.id)
  const [category, setCategory] = useState(categories[0]?.id)
  const [start, setStart] = useState<TimeOfDay | undefined>(undefined)
  const [end, setEnd] = useState<TimeOfDay | undefined>(undefined)
  const [minutes, setMinutes] = useState(0)
  const [comment, setComment] = useState("")
  const [confirming, setConfirming] = useState(false)

  const timed = !!(start && end)
  const total = timed ? spanMinutes(start, end) : Number(minutes) || 0

  const requestCancel = useCallback(() => setConfirming(true), [])
  const onBackdropClick = useModalDismiss(requestCancel)

  const submit = () => {
    onAdd(dateKey, isSleep ? null : slotId, {
      id: makeId(isSleep ? "sleep" : "entry"),
      ...(isSleep ? {} : { category }),
      minutes: total,
      comment,
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
    })
  }

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
              {isSleep ? "New sleep" : "New entry"}
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
            onClick={requestCancel}
            className={`${btnBase} text-ink/50 hover:text-ink`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Sleep has neither, so the row is absent rather than disabled. */}
          <div className={`grid grid-cols-2 gap-2 ${isSleep ? "hidden" : ""}`}>
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Slot
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
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${FIELD_BOXED} w-full`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <TimeRangeField
              start={start}
              end={end}
              onChange={(nextStart, nextEnd) => {
                setStart(nextStart || undefined)
                setEnd(nextEnd || undefined)
              }}
              onClear={() => {
                setStart(undefined)
                setEnd(undefined)
              }}
            />
            <input
              type="number"
              min={0}
              value={total}
              disabled={timed}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={`${FIELD_BOXED} w-20 ${
                timed
                  ? "cursor-not-allowed text-ink/40 bg-ink/5"
                  : ""
              }`}
            />
            <span className="text-[10px] font-mono text-ink/40 whitespace-nowrap">
              min · {fmtHours(total)}
            </span>
          </div>

          <div className="flex items-start gap-1.5">
            <MessageSquare
              size={12}
              className="text-ink/30 shrink-0 mt-2"
            />
            <AutoTextarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Note (optional)"
              rows={2}
              maxHeight={200}
              className={`${FIELD_ON_WHITE} flex-1`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={requestCancel}
              className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className={`${btnBase} px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
              style={{ backgroundColor: c.accent, color: c.onFill }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setConfirming(false)
          }
        >
          <div className={`${CARD} w-full max-w-[300px] p-5`}>
            <p className="text-xs font-mono text-ink/80 mb-4">
              Discard this new {isSleep ? "sleep entry" : "entry"}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
              >
                Keep editing
              </button>
              <button
                onClick={onCancel}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
                style={{ backgroundColor: c.exam, color: c.onFill }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
