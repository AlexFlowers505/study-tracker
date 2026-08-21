/* ---------------------------------------------------------------
   Quick add — a whole entry composed before anything is written.

   Unlike the day editor, which saves every keystroke, nothing here reaches
   the day until "Add". That is the point of it, and it is also why leaving
   asks first: there is unsaved work in the dialog, which is never true
   anywhere else in this app.

   **One dialog, two things you can add.** A day card used to carry a "+" and
   a "#" side by side, which made you choose what you were recording before
   you had opened anything — and the two buttons were a pixel apart and told
   apart only by their glyph. Now the "+" opens this and the choice is a tab
   inside it, where there is room to label it. Sleep keeps its own button:
   it is a different axis, not a different kind of study.
--------------------------------------------------------------- */

import { useCallback, useState } from "react"
import { Play, Square, X } from "lucide-react"
import type {
  Category,
  CounterUnit,
  DayKey,
  Slot,
  StudyEntry,
  TimeOfDay,
} from "../types/model"
import type { DayCounters } from "../lib/counters"
import { slotUnitValue, unitDayTotal } from "../lib/counters"
import { fromKey } from "../lib/date"
import { makeId } from "../lib/id"
import { fmtHours, nowTime, spanMinutes } from "../lib/time"
import { BTN_SOFT, CARD, FIELD_SOFT, btnBase } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { RenderIcon } from "../ui/icons"
import { TimeRangeField } from "../ui/TimeRangeField"
import { useModalDismiss } from "../ui/useModalDismiss"

import { usePalette } from "../ui/useTheme"
export function QuickAddEntryModal({
  dateKey,
  slots,
  categories,
  units = [],
  counters = {},
  initialSlotId,
  variant = "study",
  onCancel,
  onAdd,
  onAddCounter,
}: {
  dateKey: DayKey
  slots: Slot[]
  categories: Category[]
  /** Empty when the project defines no counters — then there is no tab row. */
  units?: CounterUnit[]
  counters?: DayCounters
  /** Set when the dialog was opened from a particular slot's own "+". */
  initialSlotId?: string
  /**
   * Sleep is the same dialog with the top row removed: it is a flat list on
   * the day with no slot and no category. Sharing the component rather than
   * copying it is what keeps the two ways of adding a time the same shape.
   */
  variant?: "study" | "sleep"
  onCancel: () => void
  /** `slotId` is null for a sleep entry, which belongs to no slot. */
  onAdd: (dateKey: DayKey, slotId: string | null, entry: StudyEntry) => void
  onAddCounter?: (
    dateKey: DayKey,
    unitId: string,
    slotId: string,
    amount: number,
  ) => void
}) {
  const c = usePalette()
  const isSleep = variant === "sleep"
  const canCount = !isSleep && units.length > 0 && !!onAddCounter
  const [kind, setKind] = useState<"entry" | "counter">("entry")
  const counting = canCount && kind === "counter"
  const [slotId, setSlotId] = useState(initialSlotId || slots[0]?.id)
  const [unitId, setUnitId] = useState(units[0]?.id)
  const [amount, setAmount] = useState(1)
  // A once-a-day unit records the fact, not a quantity — and it cannot be
  // recorded twice, whichever slot the second one would land in.
  const onceUnit = units.find((u) => u.id === unitId)?.oncePerDay === true
  const alreadyToday = unitId ? unitDayTotal(counters, unitId) : 0
  const blocked = counting && onceUnit && alreadyToday > 0
  const [category, setCategory] = useState(categories[0]?.id)
  const [start, setStart] = useState<TimeOfDay | undefined>(undefined)
  const [end, setEnd] = useState<TimeOfDay | undefined>(undefined)
  const [comment, setComment] = useState("")
  const [confirming, setConfirming] = useState(false)

  const timed = !!(start && end)
  // A start with no end is a real, useful state — you logged the beginning and
  // will come back for the rest — so it saves as zero minutes rather than
  // being refused. Filling the end in later on the card recomputes it.
  const total = timed ? spanMinutes(start, end) : 0

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
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div>
            <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
              {isSleep ? "New sleep" : counting ? "Add to a counter" : "New entry"}
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

        <div className="p-5 space-y-4">
          {/* Absent, not disabled, when the project has no counters — there is
              nothing behind the second tab to show. */}
          {canCount && (
            <div className="flex gap-1 rounded-xl bg-ink/[0.06] p-1">
              {(["entry", "counter"] as const).map((id) => {
                const active = kind === id
                return (
                  <button
                    key={id}
                    onClick={() => setKind(id)}
                    aria-pressed={active}
                    style={
                      active
                        ? { backgroundColor: c.accent, color: c.onFill }
                        : undefined
                    }
                    className={`${btnBase} flex-1 rounded-lg py-2 text-[10px] font-mono uppercase tracking-widest ${
                      active ? "font-bold" : "text-ink/55 hover:text-ink"
                    }`}
                  >
                    {id === "entry" ? "Entry" : "Counter"}
                  </button>
                )
              })}
            </div>
          )}

          {/* Sleep has neither, so the row is absent rather than disabled. */}
          {counting ? (
            <CounterFields
              units={units}
              slots={slots}
              counters={counters}
              unitId={unitId}
              setUnitId={setUnitId}
              slotId={slotId}
              setSlotId={setSlotId}
              amount={amount}
              setAmount={setAmount}
            />
          ) : (
          <>
          <div className={`grid grid-cols-2 gap-3 ${isSleep ? "hidden" : ""}`}>
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Slot
              </span>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className={FIELD_SOFT}
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
                className={FIELD_SOFT}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* No minutes box any more. Typing "90" was doing arithmetic the
              app is here to do for you, and the two ways of saying the same
              thing had to be kept from contradicting each other. Times are the
              only input; the duration below is the answer.

              "Now" on each end is what makes that practical: start one when
              you begin, come back and end it when you stop. */}
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStart(nowTime())}
                className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
              >
                <Play size={9} /> Start now
              </button>
              <button
                type="button"
                onClick={() => setEnd(nowTime())}
                className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
              >
                <Square size={9} /> End now
              </button>
            </div>
            <span className="text-[10px] font-mono text-ink/45 whitespace-nowrap">
              {timed ? fmtHours(total) : start ? "running" : "no time set"}
            </span>
          </div>

          <label className="block">
            <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
              Note
            </span>
            <AutoTextarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
              rows={2}
              maxHeight={200}
              className={FIELD_SOFT}
            />
          </label>
          </>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={requestCancel}
              className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                counting
                  ? onAddCounter?.(
                      dateKey,
                      unitId,
                      slotId,
                      onceUnit ? 1 : amount,
                    )
                  : submit()
              }
              disabled={blocked}
              className={`${btnBase} px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ backgroundColor: c.accent, color: c.onFill }}
            >
              {blocked ? "Already recorded" : "Add"}
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

/**
 * The counter half of the dialog. Its own component only so the branch above
 * stays readable — it has no state of its own, because Cancel has to be able
 * to throw away everything either tab collected.
 */
function CounterFields({
  units,
  slots,
  counters,
  unitId,
  setUnitId,
  slotId,
  setSlotId,
  amount,
  setAmount,
}: {
  units: CounterUnit[]
  slots: Slot[]
  counters: DayCounters
  unitId: string
  setUnitId: (id: string) => void
  slotId: string
  setSlotId: (id: string) => void
  amount: number
  setAmount: (n: number) => void
}) {
  const c = usePalette()
  const unit = units.find((u) => u.id === unitId)
  const already = slotUnitValue(counters, unitId, slotId)
  const after = already + amount
  // A once-a-day unit tops out across the whole day, not per slot: it either
  // happened or it did not, and which slot it is filed under does not buy you
  // a second one.
  const once = unit?.oncePerDay === true
  const dayAlready = unitDayTotal(counters, unitId)

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
            Slot
          </span>
          <select
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className={FIELD_SOFT}
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
            Counter
          </span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className={FIELD_SOFT}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {once ? (
        <div className="text-[11px] font-mono text-ink/55 leading-relaxed">
          {dayAlready > 0
            ? "Already recorded for this day."
            : "Recorded once for the day — no amount to pick."}
        </div>
      ) : (
      <label className="block">
        <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
          How many
        </span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
          className={`${FIELD_SOFT} w-24`}
        />
      </label>
      )}

      {/* Both numbers, before and after. The whole point of this half is that
          it adds to a running count, so the count it adds to has to show. */}
      <div className="flex items-center gap-1.5 rounded-xl bg-card p-3 text-[11px] font-mono">
        {unit && (
          <RenderIcon
            name={unit.iconName}
            size={13}
            style={{ color: unit.color }}
          />
        )}
        <span className="text-ink/60">
          {once ? (
            <>
              This day is{" "}
              <strong className="text-ink">
                {dayAlready > 0 ? "already marked" : "not marked"}
              </strong>
              {dayAlready > 0 ? "" : " → will be marked"}
            </>
          ) : (
            <>
              This slot has <strong className="text-ink">{already}</strong>
              {" → will have "}
              <strong style={{ color: c.accent }}>{after}</strong>
            </>
          )}
        </span>
      </div>
    </>
  )
}
