/* ---------------------------------------------------------------
   The day dialog: a read-only preview that flips into the editor.

   Unlike quick-add, every keystroke here goes straight to the day — there is
   nothing to discard, so leaving never asks.
--------------------------------------------------------------- */

import { useState } from 'react'
import {
  ArrowRightLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EyeOff,
  Hash,
  MessageSquare,
  Moon,
  PenLine,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type {
  Category,
  CounterUnit,
  Day,
  DayKey,
  Settings,
  SleepEntry,
  Slot,
  StudyEntry,
} from '../types/model'
import { fromKey, toKey } from '../lib/date'
import { makeId } from '../lib/id'
import {
  fmtHours,
  fmtHoursFixed1,
  startedPreviousDay,
} from '../lib/time'
import {
  moveEntryToSlot,
  removeEntryFromCells,
  removeSleepEntry,
  updateEntryInCells,
  updateSleepEntry,
} from '../lib/entries'
import { addSlotCount, setSlotCount } from '../lib/counters'
import { dayBreakdown } from '../lib/stats'
import {
  CARD,
  FIELD_BOXED,
  FIELD_ON_TINT,
  FIELD_ON_WHITE,
  SLEEP_COLOR,
  btnBase,
} from '../lib/theme'
import { AutoTextarea, SegmentedControl } from '../ui/controls'
import { PopoverMenu } from '../ui/PopoverMenu'
import { RenderIcon } from '../ui/icons'
import { SwitchToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { TimeRangeField } from '../ui/TimeRangeField'
import { useModalDismiss } from '../ui/useModalDismiss'
import { AddCounterForm, SlotCounterRows } from './SlotCounters'
import { FullCardGrid } from './DayCards'

export interface DayDialogProps {
  dateKey: DayKey
  dayEntry?: Day
  slots: Slot[]
  categories: Category[]
  counterUnits: CounterUnit[]
  settings: Settings
  onClose: () => void
  onChange: (patch: Partial<Day>) => void
}

export function DayQuickviewModal({
  dateKey,
  dayEntry,
  slots,
  categories,
  counterUnits,
  settings,
  onClose,
  onChange,
  onGoToDayView,
  startInEditMode = false,
  onQuickAdd,
  onQuickAddSleep,
  onQuickAddCounter,
  canFreeze,
  onFreeze,
}: DayDialogProps & {
  onGoToDayView: (key: DayKey) => void
  startInEditMode?: boolean
  /** The card's own quick actions, forwarded so the dialog keeps them. */
  onQuickAdd?: (key: DayKey) => void
  onQuickAddSleep?: (key: DayKey) => void
  onQuickAddCounter?: (key: DayKey) => void
  canFreeze?: (key: DayKey) => boolean
  onFreeze?: (key: DayKey) => void
}) {
  const [mode, setMode] = useState(startInEditMode ? "edit" : "preview")
  const onBackdropClick = useModalDismiss(onClose)
  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: mode === "edit" ? "#F4F5F7" : "transparent" }}
        className={`w-full sm:max-w-[820px] max-h-[90vh] h-full sm:h-auto flex flex-col overflow-hidden ${
          mode === "edit" ? "sm:rounded-2xl shadow-2xl" : ""
        }`}
      >
        {mode === "edit" ? (
          <DayEditForm
            dateKey={dateKey}
            dayEntry={dayEntry}
            slots={slots}
            categories={categories}
            counterUnits={counterUnits}
            settings={settings}
            onClose={onClose}
            // Both of these point back to where we already are when the editor
            // was opened straight from the Day view, so they're dropped there.
            onBack={startInEditMode ? null : () => setMode("preview")}
            onGoToDayView={
              startInEditMode
                ? null
                : () => {
                    onGoToDayView(dateKey)
                    onClose()
                  }
            }
            onChange={onChange}
          />
        ) : (
          /* No header shell. The card carries its own — the long date, the two
             navigation buttons beside it, and the close X set apart in the
             action corner. A dialog chrome repeating the date above a card
             that already states it was a box inside a box. */
          <div className="p-4 overflow-y-auto flex-1">
            <FullCardGrid
              dates={[d]}
              days={{ [dateKey]: dayEntry || {} }}
              slots={slots}
              categories={categories}
              counterUnits={counterUnits}
              settings={settings}
              todayKey={toKey(new Date())}
              big
              longDate
              // The card body is inert here: the pencil beside the date is the
              // way into the editor, so aiming wide of an entry does nothing.
              titleActions={
                <div className="flex items-center gap-1">
                  <Tip text="Edit this day">
                    <button
                      onClick={() => setMode("edit")}
                      className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                    >
                      <PenLine size={16} />
                    </button>
                  </Tip>
                  <Tip text="Go to day view">
                    <button
                      onClick={() => {
                        onGoToDayView(dateKey)
                        onClose()
                      }}
                      className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </Tip>
                </div>
              }
              onClose={onClose}
              onQuickAddDay={onQuickAdd}
              onQuickAddSleepDay={onQuickAddSleep}
              onQuickAddCounterDay={onQuickAddCounter}
              canFreezeDay={canFreeze}
              onFreezeDay={onFreeze}
              onUpdateDay={(_key, patch) => onChange(patch)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function DayEditForm({
  dateKey,
  dayEntry,
  slots,
  categories,
  counterUnits,
  settings,
  onClose,
  onBack,
  onGoToDayView,
  onChange,
}: DayDialogProps & {
  onBack: (() => void) | null
  onGoToDayView: (() => void) | null
}) {
  const cells = dayEntry?.cells || {}
  const counters = dayEntry?.counters || {}
  // Which slot's add-counter form is open, and which counter row is being
  // edited. Both are one-at-a-time: two open forms in one dialog is noise.
  const [addCounterSlot, setAddCounterSlot] = useState<string | null>(null)
  const [editingCounter, setEditingCounter] = useState<{
    slotId: string
    unitId: string
    original: number
  } | null>(null)
  const ignore = dayEntry?.ignore || false
  const dayComment = dayEntry?.comment || ""
  const addEntry = (slotId: string) => {
    const arr = cells[slotId] || []
    const newEntry = {
      id: makeId("entry"),
      category: categories[0]?.id,
      minutes: 0,
      comment: "",
    }
    onChange({ cells: { ...cells, [slotId]: [...arr, newEntry] } })
  }
  const updateEntry = (
    slotId: string,
    entryId: string,
    patch: Partial<StudyEntry>,
  ) => onChange({ cells: updateEntryInCells(cells, slotId, entryId, patch) })
  const removeEntry = (slotId: string, entryId: string) =>
    onChange({ cells: removeEntryFromCells(cells, slotId, entryId) })
  // Order is the list's own, not derived from the times — an entry with no
  // times still has to sit somewhere, and sorting by time would shuffle rows
  // out from under you mid-edit.
  const moveEntry = (slotId: string, index: number, dir: number) => {
    const arr = [...(cells[slotId] || [])]
    const next = index + dir
    if (next < 0 || next >= arr.length) return
    ;[arr[index], arr[next]] = [arr[next], arr[index]]
    onChange({ cells: { ...cells, [slotId]: arr } })
  }
  const moveEntrySlot = (fromSlot: string, entryId: string, toSlot: string) =>
    onChange({ cells: moveEntryToSlot(cells, fromSlot, entryId, toSlot) })

  // Sleep is a second, independent list on the day — no slot, no category, and
  // deliberately absent from `dayBreakdown` below, which is what keeps it out
  // of every study figure in the app.
  const sleepEnabled = settings?.sleepEnabled === true
  const sleepEntries = dayEntry?.sleep || []
  const sleepTotal = sleepEntries.reduce(
    (a, e) => a + (Number(e.minutes) || 0),
    0,
  )
  const [tab, setTab] = useState("project")

  const writeSleep = (arr: SleepEntry[]) => onChange({ sleep: arr })
  const addSleepEntry = () =>
    writeSleep([
      ...sleepEntries,
      { id: makeId("sleep"), minutes: 0, comment: "" },
    ])
  const patchSleepEntry = (entryId: string, patch: Partial<SleepEntry>) =>
    writeSleep(updateSleepEntry(sleepEntries, entryId, patch))
  const dropSleepEntry = (entryId: string) =>
    writeSleep(removeSleepEntry(sleepEntries, entryId))

  const { total } = dayBreakdown({ cells }, slots)
  const d = fromKey(dateKey)

  return (
    <>
      {/* White header against the tinted body — the colour change separates the
          two, so no divider rule is needed. */}
      <div className="flex items-center justify-between px-5 py-4 bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Tip text="Back to preview">
              <button
                onClick={onBack}
                className={`${btnBase} p-1.5 -ml-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10 shrink-0`}
              >
                <ChevronLeft size={18} />
              </button>
            </Tip>
          )}
          <div className="min-w-0">
            <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm truncate">
              {d.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
              {total} minutes logged · {fmtHours(total)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onGoToDayView && (
            <Tip text="Go to day view">
              <button
                onClick={onGoToDayView}
                className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33] p-1 rounded-lg hover:bg-[#1E2A33]/10`}
              >
                <ArrowUpRight size={18} />
              </button>
            </Tip>
          )}
          <button
            onClick={onClose}
            className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {sleepEnabled && (
          <SegmentedControl
            items={[
              { id: "project", label: "Project tracker" },
              { id: "sleep", label: "Sleep tracker" },
            ]}
            activeId={tab}
            onChange={setTab}
          />
        )}

        {(!sleepEnabled || tab === "project") && (
          <>
            {/* Notes come first — it's the field reached for most often, and it
              reads as the day's headline rather than a footnote. */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare size={12} className="text-[#1E2A33]/40" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                  Day notes
                </span>
              </div>
              <AutoTextarea
                value={dayComment}
                onChange={(e) => onChange({ comment: e.target.value })}
                placeholder="Add a note for the whole day (optional)"
                rows={2}
                maxHeight={200}
                className={FIELD_ON_WHITE}
              />
            </div>

            {/* Lesson count, exam and the ignore flag are day-level facts like
              the note above — they belong beside it, not buried under every
              slot. */}
            <div
              className={`${CARD} flex items-center justify-between gap-4 flex-wrap`}
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide">
                <SwitchToggle
                  checked={ignore}
                  onChange={(next) => onChange({ ignore: next })}
                  label="Ignore in statistics"
                />
                <span className="flex items-center gap-1">
                  <EyeOff size={13} className="text-[#1E2A33]/60" /> Ignore in
                  statistics
                </span>
              </div>
            </div>

            {slots.map((slot) => {
              const entries = cells[slot.id] || []
              const slotTotal = entries.reduce(
                (a, e) => a + (Number(e.minutes) || 0),
                0,
              )
              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl overflow-hidden"
                >
                  {/* The slot's own colour, washed out, is the header. It both
                    separates the header from the body and says which slot this
                    is without an outline or a rule. */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ backgroundColor: `${slot.color}1A` }}
                  >
                    <div className="flex items-center gap-2">
                      <RenderIcon
                        name={slot.iconName}
                        size={14}
                        style={{ color: slot.color }}
                      />
                      <span className="font-mono text-xs uppercase tracking-wide font-bold">
                        {slot.label}
                      </span>
                      {counterUnits.length > 0 && (
                        <Tip text="Add a counter to this slot">
                          <button
                            onClick={() =>
                              setAddCounterSlot(
                                addCounterSlot === slot.id ? null : slot.id,
                              )
                            }
                            className={`${btnBase} p-0.5 rounded-md hover:bg-[#1E2A33]/10 ${
                              addCounterSlot === slot.id
                                ? "text-[#1E2A33] bg-[#1E2A33]/10"
                                : "text-[#1E2A33]/40 hover:text-[#1E2A33]"
                            }`}
                          >
                            <Hash size={13} />
                          </button>
                        </Tip>
                      )}
                      <Tip text="Add entry">
                        <button
                          onClick={() => addEntry(slot.id)}
                          className={`${btnBase} p-0.5 rounded-md text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                        >
                          <Plus size={13} />
                        </button>
                      </Tip>
                    </div>
                    <span className="font-mono text-xs text-[#1E2A33]/55">
                      {slotTotal}m / {fmtHoursFixed1(slotTotal)}
                    </span>
                  </div>

                  <div className="p-3 space-y-2">
                    {/* This slot's counters, editable in place — the same rows
                        the day card shows, so a count looks the same wherever
                        the slot is drawn. */}
                    <SlotCounterRows
                      units={counterUnits}
                      counters={counters}
                      slotId={slot.id}
                      editingUnitId={
                        editingCounter?.slotId === slot.id
                          ? editingCounter.unitId
                          : null
                      }
                      onOpen={(unitId, original) =>
                        setEditingCounter({ slotId: slot.id, unitId, original })
                      }
                      onChange={(next) => onChange({ counters: next })}
                      onCancel={() => {
                        if (editingCounter)
                          onChange({
                            counters: setSlotCount(
                              counters,
                              editingCounter.unitId,
                              editingCounter.slotId,
                              editingCounter.original,
                            ),
                          })
                        setEditingCounter(null)
                      }}
                      onClose={() => setEditingCounter(null)}
                      roomy
                    />
                    {addCounterSlot === slot.id && (
                      <AddCounterForm
                        units={counterUnits}
                        counters={counters}
                        slotId={slot.id}
                        onAdd={(unitId, amount) => {
                          onChange({
                            counters: addSlotCount(
                              counters,
                              unitId,
                              slot.id,
                              amount,
                            ),
                          })
                          setAddCounterSlot(null)
                        }}
                        onCancel={() => setAddCounterSlot(null)}
                      />
                    )}
                    {entries.length === 0 && (
                      <p className="text-xs font-mono text-[#1E2A33]/40 px-1">
                        No study logged for this slot.
                      </p>
                    )}
                    {entries.map((entry, entryIndex) => {
                      const options = categories.some(
                        (c) => c.id === entry.category,
                      )
                        ? categories
                        : [
                            {
                              id: entry.category,
                              label: `(removed) ${entry.category}`,
                            },
                            ...categories,
                          ]
                      return (
                        <div
                          key={entry.id}
                          className="rounded-xl bg-[#F4F5F7] p-2.5 space-y-2"
                        >
                          <TimeRangeField
                            start={entry.start}
                            end={entry.end}
                            onChange={(start, end) =>
                              updateEntry(slot.id, entry.id, {
                                ...(start ? { start } : {}),
                                ...(end ? { end } : {}),
                              })
                            }
                            onClear={() =>
                              updateEntry(slot.id, entry.id, {
                                start: undefined,
                                end: undefined,
                              })
                            }
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={entry.category}
                              onChange={(e) =>
                                updateEntry(slot.id, entry.id, {
                                  category: e.target.value,
                                })
                              }
                              className={`${FIELD_BOXED} flex-1 w-full`}
                            >
                              {options.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={entry.minutes}
                              onChange={(e) =>
                                updateEntry(slot.id, entry.id, {
                                  minutes: Number(e.target.value),
                                })
                              }
                              disabled={!!(entry.start && entry.end)}
                              className={`${FIELD_BOXED} w-20 ${
                                entry.start && entry.end
                                  ? "cursor-not-allowed text-[#1E2A33]/40 bg-[#1E2A33]/5"
                                  : ""
                              }`}
                            />
                            <span className="text-[10px] font-mono text-[#1E2A33]/40 whitespace-nowrap">
                              min / {fmtHoursFixed1(Number(entry.minutes) || 0)}
                            </span>
                            <button
                              onClick={() => removeEntry(slot.id, entry.id)}
                              className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/40 hover:text-[#C1595B] hover:bg-white`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              disabled={entryIndex === 0}
                              onClick={() => moveEntry(slot.id, entryIndex, -1)}
                              className={`${btnBase} p-1 rounded-lg text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              disabled={entryIndex === entries.length - 1}
                              onClick={() => moveEntry(slot.id, entryIndex, 1)}
                              className={`${btnBase} p-1 rounded-lg text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <PopoverMenu
                              label="Move to another time slot"
                              icon={ArrowRightLeft}
                            >
                              {slots.map((target) => (
                                <button
                                  key={target.id}
                                  disabled={target.id === slot.id}
                                  onClick={() =>
                                    moveEntrySlot(
                                      slot.id,
                                      entry.id,
                                      target.id,
                                    )
                                  }
                                  className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-mono text-left hover:bg-[#1E2A33]/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                                >
                                  <RenderIcon
                                    name={target.iconName}
                                    size={12}
                                    style={{ color: target.color }}
                                  />
                                  {target.label}
                                </button>
                              ))}
                            </PopoverMenu>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MessageSquare
                              size={12}
                              className="text-[#1E2A33]/30 shrink-0 mt-2"
                            />
                            <AutoTextarea
                              value={entry.comment || ""}
                              onChange={(e) =>
                                updateEntry(slot.id, entry.id, {
                                  comment: e.target.value,
                                })
                              }
                              placeholder="Note (optional) — shown on the day and week view"
                              rows={2}
                              maxHeight={220}
                              className={`${FIELD_ON_TINT} flex-1`}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => addEntry(slot.id)}
                      className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1`}
                    >
                      <Plus size={12} /> Add entry
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {sleepEnabled && tab === "sleep" && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ backgroundColor: `${SLEEP_COLOR}1A` }}
            >
              <div className="flex items-center gap-2">
                <Moon size={14} style={{ color: SLEEP_COLOR }} />
                <span className="font-mono text-xs uppercase tracking-wide font-bold">
                  Sleep
                </span>
                <Tip text="Add sleep entry">
                  <button
                    onClick={addSleepEntry}
                    className={`${btnBase} p-0.5 rounded-md text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                  >
                    <Plus size={13} />
                  </button>
                </Tip>
              </div>
              <span className="font-mono text-xs text-[#1E2A33]/55">
                {sleepTotal}m / {fmtHoursFixed1(sleepTotal)}
              </span>
            </div>

            <div className="p-3 space-y-2">
              {sleepEntries.length === 0 && (
                <p className="text-xs font-mono text-[#1E2A33]/40 px-1">
                  No sleep logged for this day.
                </p>
              )}
              {sleepEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl bg-[#F4F5F7] p-2.5 space-y-2"
                >
                  <TimeRangeField
                    start={entry.start}
                    end={entry.end}
                    onChange={(start, end) =>
                      patchSleepEntry(entry.id, {
                        ...(start ? { start } : {}),
                        ...(end ? { end } : {}),
                      })
                    }
                    onClear={() =>
                      patchSleepEntry(entry.id, {
                        start: undefined,
                        end: undefined,
                      })
                    }
                  />
                  <div className="flex items-center gap-2">
                    {/* The entry sits on the day the night ended, so a bedtime
                        later than the wake-up was the evening before. */}
                    <span className="flex-1 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
                      {startedPreviousDay(entry) ? "Started previous day" : ""}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={entry.minutes}
                      onChange={(e) =>
                        patchSleepEntry(entry.id, {
                          minutes: Number(e.target.value),
                        })
                      }
                      disabled={!!(entry.start && entry.end)}
                      className={`${FIELD_BOXED} w-20 ${
                        entry.start && entry.end
                          ? "cursor-not-allowed text-[#1E2A33]/40 bg-[#1E2A33]/5"
                          : ""
                      }`}
                    />
                    <span className="text-[10px] font-mono text-[#1E2A33]/40 whitespace-nowrap">
                      min / {fmtHoursFixed1(Number(entry.minutes) || 0)}
                    </span>
                    <button
                      onClick={() => dropSleepEntry(entry.id)}
                      className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/40 hover:text-[#C1595B] hover:bg-white`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MessageSquare
                      size={12}
                      className="text-[#1E2A33]/30 shrink-0 mt-2"
                    />
                    <AutoTextarea
                      value={entry.comment || ""}
                      onChange={(e) =>
                        patchSleepEntry(entry.id, {
                          comment: e.target.value,
                        })
                      }
                      placeholder="Note (optional)"
                      rows={2}
                      maxHeight={220}
                      className={`${FIELD_ON_TINT} flex-1`}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addSleepEntry}
                className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1`}
              >
                <Plus size={12} /> Add entry
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
