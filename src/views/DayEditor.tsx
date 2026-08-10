/* ---------------------------------------------------------------
   The day dialog: a read-only preview that flips into the editor.

   Unlike quick-add, every keystroke here goes straight to the day — there is
   nothing to discard, so leaving never asks.
--------------------------------------------------------------- */

import { useState } from 'react'
import {
  ArrowRightLeft,
  ArrowUpRight,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EyeOff,
  MessageSquare,
  Moon,
  PenLine,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type {
  Category,
  Day,
  DayKey,
  Settings,
  SleepEntry,
  Slot,
  StudyEntry,
} from '../types/model'
import { fromKey } from '../lib/date'
import { makeId } from '../lib/id'
import {
  fmtHours,
  fmtHoursFixed1,
  spanMinutes,
  startedPreviousDay,
} from '../lib/time'
import { dayBreakdown } from '../lib/stats'
import {
  CARD,
  EXAM_COLOR,
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
import { EntriesReadout } from './EntriesReadout'

export interface DayDialogProps {
  dateKey: DayKey
  dayEntry?: Day
  slots: Slot[]
  categories: Category[]
  settings: Settings
  onClose: () => void
  onChange: (patch: Partial<Day>) => void
}

export function DayQuickviewModal({
  dateKey,
  dayEntry,
  slots,
  categories,
  settings,
  onClose,
  onChange,
  onGoToDayView,
  startInEditMode = false,
}: DayDialogProps & {
  onGoToDayView: (key: DayKey) => void
  startInEditMode?: boolean
}) {
  const [mode, setMode] = useState(startInEditMode ? "edit" : "preview")
  const onBackdropClick = useModalDismiss(onClose)
  const { total } = dayBreakdown(dayEntry, slots)
  const hasEntries = slots.some(
    (slot) => (dayEntry?.cells?.[slot.id] || []).length > 0,
  )
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: "#F4F5F7" }}
        className="w-full sm:max-w-[500px] sm:rounded-2xl shadow-2xl max-h-[90vh] h-full sm:h-auto flex flex-col overflow-hidden"
      >
        {mode === "edit" ? (
          <DayEditForm
            dateKey={dateKey}
            dayEntry={dayEntry}
            slots={slots}
            categories={categories}
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
          <>
            <div className="flex items-center justify-between px-5 py-4 bg-white shrink-0">
              <div>
                <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
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
              <div className="flex items-center gap-2">
                <Tip text="Edit this day">
                  <button
                    onClick={() => setMode("edit")}
                    className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                  >
                    <PenLine size={17} />
                  </button>
                </Tip>
                <Tip text="Go to day view">
                  <button
                    onClick={() => {
                      onGoToDayView(dateKey)
                      onClose()
                    }}
                    className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </Tip>
                <button
                  onClick={onClose}
                  className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* A day with nothing logged has very little to show — the min
                height keeps the dialog from collapsing to a sliver. */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 sm:min-h-[300px]">
              {!hasEntries ? (
                <p className="text-xs font-mono text-[#1E2A33]/45">
                  No study logged for this day.
                </p>
              ) : (
                <EntriesReadout
                  slots={slots}
                  categories={categories}
                  cells={dayEntry?.cells || {}}
                  sleep={dayEntry?.sleep || []}
                  sleepEnabled={settings?.sleepEnabled === true}
                />
              )}
              <div className={`${CARD} p-4 space-y-2 text-xs font-mono`}>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[#1E2A33]/70">
                  {lessonsEnabled && (
                    <span>{dayEntry?.lessons || 0} lessons completed</span>
                  )}
                  {examsEnabled && (
                    <span className="flex items-center gap-1">
                      <Award size={13} style={{ color: EXAM_COLOR }} />
                      {dayEntry?.exam ? "Exam passed" : "No exam passed"}
                    </span>
                  )}
                  {dayEntry?.ignore && (
                    <span className="flex items-center gap-1 text-[#1E2A33]/55">
                      <EyeOff size={13} /> Ignored in statistics
                    </span>
                  )}
                </div>
                {dayEntry?.comment && (
                  <div className="flex items-start gap-1.5 rounded-xl bg-[#F4F5F7] p-2.5">
                    <MessageSquare
                      size={12}
                      className="text-[#1E2A33]/35 shrink-0 mt-0.5"
                    />
                    <p className="text-[#1E2A33]/60 whitespace-pre-wrap">
                      {dayEntry.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
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
  const lessons = dayEntry?.lessons || 0
  const exam = dayEntry?.exam || false
  const ignore = dayEntry?.ignore || false
  const dayComment = dayEntry?.comment || ""
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const withDerivedMinutes = <T extends StudyEntry | SleepEntry>(entry: T): T =>
    entry.start && entry.end
      ? { ...entry, minutes: spanMinutes(entry.start, entry.end) }
      : entry
  const patchEntry = <T extends StudyEntry | SleepEntry>(
    entry: T,
    patch: Partial<T>,
  ): T => {
    const next = { ...entry, ...patch }
    if (patch.start === undefined && "start" in patch) delete next.start
    if (patch.end === undefined && "end" in patch) delete next.end
    return withDerivedMinutes(next)
  }

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
  ) => {
    const arr = (cells[slotId] || []).map((e) =>
      e.id === entryId ? patchEntry(e, patch) : e,
    )
    onChange({ cells: { ...cells, [slotId]: arr } })
  }
  const removeEntry = (slotId: string, entryId: string) => {
    const arr = (cells[slotId] || []).filter((e) => e.id !== entryId)
    onChange({ cells: { ...cells, [slotId]: arr } })
  }
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
  const moveEntryToSlot = (
    fromSlot: string,
    entryId: string,
    toSlot: string,
  ) => {
    if (fromSlot === toSlot) return
    const entry = (cells[fromSlot] || []).find((e) => e.id === entryId)
    if (!entry) return
    onChange({
      cells: {
        ...cells,
        [fromSlot]: (cells[fromSlot] || []).filter((e) => e.id !== entryId),
        [toSlot]: [...(cells[toSlot] || []), entry],
      },
    })
  }

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
  const updateSleepEntry = (entryId: string, patch: Partial<SleepEntry>) =>
    writeSleep(
      sleepEntries.map((e) => (e.id === entryId ? patchEntry(e, patch) : e)),
    )
  const removeSleepEntry = (entryId: string) =>
    writeSleep(sleepEntries.filter((e) => e.id !== entryId))

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
              {lessonsEnabled && (
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide">
                  Lessons completed today
                  <input
                    type="number"
                    min={0}
                    value={lessons}
                    onChange={(e) =>
                      onChange({ lessons: Number(e.target.value) })
                    }
                    className={`${FIELD_BOXED} w-20`}
                  />
                </label>
              )}
              {examsEnabled && (
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exam}
                    onChange={(e) => onChange({ exam: e.target.checked })}
                    className="w-4 h-4 accent-[#C1595B]"
                  />
                  <span className="flex items-center gap-1">
                    <Award size={13} style={{ color: EXAM_COLOR }} /> Exam
                    passed today
                  </span>
                </label>
              )}
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
                                    moveEntryToSlot(
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
                      updateSleepEntry(entry.id, {
                        ...(start ? { start } : {}),
                        ...(end ? { end } : {}),
                      })
                    }
                    onClear={() =>
                      updateSleepEntry(entry.id, {
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
                        updateSleepEntry(entry.id, {
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
                      onClick={() => removeSleepEntry(entry.id)}
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
                        updateSleepEntry(entry.id, {
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
