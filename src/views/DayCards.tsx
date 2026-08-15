/* ---------------------------------------------------------------
   Full-detail day cards — the Week view's row of them, and the Day view's
   single wide one.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import {
  EyeOff,
  Hash,
  MessageSquare,
  Moon,
  Plus,
  Snowflake,
  X,
} from "lucide-react"
import type {
  Category,
  CounterUnit,
  Day,
  DayKey,
  Settings,
  SleepEntry,
  Slot,
  StudyEntry,
} from "../types/model"
import { fromKey, pad, startOfWeek, toKey } from "../lib/date"
import { fmtHours } from "../lib/time"
import { dayBreakdown, goalForDate } from "../lib/stats"
import { dayState } from "../lib/freezes"
import {
  ACCENT,
  FREEZE_COLOR,
  GOAL_MET_COLOR,
  SLEEP_COLOR,
  btnBase,
  cardTiny,
  dayStateSurface,
} from "../lib/theme"
import { setSlotCount } from "../lib/counters"
import {
  moveEntryToSlot,
  removeEntryFromCells,
  removeSleepEntry,
  restoreEntry,
  restoreSleepEntry,
  updateEntryInCells,
  updateSleepEntry,
} from "../lib/entries"
import { Tip } from "../ui/Tip"
import { CounterBadges } from "./CounterInputs"
import { DayNoteRow } from "./DayNoteRow"
import { EntriesReadout } from "./EntriesReadout"
import type { EntrySnapshot, ReadoutEditing } from "./EntriesReadout"

function FullDayCard({
  date,
  entry,
  slots,
  categories,
  settings,
  counterUnits,
  goal,
  isToday,
  isBeforeStart,
  ignored,
  todayKey,
  canFreeze,
  onFreeze,
  onEdit,
  onQuickAdd,
  onQuickAddSleep,
  onQuickAddCounter,
  longDate,
  titleActions,
  onClose,
  big,
  commentsOpen = true,
  editingEntryId,
  editingSnapshot,
  onOpenEntry,
  onCloseEntry,
  counterEditing,
  onOpenCounter,
  onCancelCounter,
  onCloseCounter,
  noteEditing,
  onOpenNote,
  onCancelNote,
  onCloseNote,
  onUpdateDay,
}: {
  date: Date
  entry?: Day
  slots: Slot[]
  categories: Category[]
  settings: Settings
  counterUnits: CounterUnit[]
  goal: number
  isToday: boolean
  isBeforeStart: boolean
  ignored: boolean
  todayKey: DayKey
  canFreeze?: boolean
  onFreeze?: () => void
  onEdit?: () => void
  onQuickAdd?: () => void
  onQuickAddSleep?: () => void
  onQuickAddCounter?: () => void
  /** "Saturday, 15 August" instead of "Sat 15" — for the dialog, which has room. */
  longDate?: boolean
  /** Buttons that belong beside the date rather than in the action row. */
  titleActions?: ReactNode
  /** Renders the close button, set apart from the day's own actions. */
  onClose?: () => void
  big?: boolean
  commentsOpen?: boolean
  /** Non-null only for the one card holding the open form, if any. */
  editingEntryId?: string | null
  editingSnapshot?: EntrySnapshot | null
  onOpenEntry?: (entryId: string, snapshot: EntrySnapshot) => void
  onCloseEntry?: () => void
  /** `slotId:unitId` of the counter row open as a form on this card. */
  counterEditing?: string | null
  onOpenCounter?: (slotId: string, unitId: string, original: number) => void
  onCancelCounter?: () => void
  onCloseCounter?: () => void
  /** True only for the one card whose day note is open as a form. */
  noteEditing?: boolean
  onOpenNote?: () => void
  onCancelNote?: () => void
  onCloseNote?: () => void
  onUpdateDay?: (patch: Partial<Day>) => void
}) {
  // Above the early return, as every hook must be. Purely local: which card's
  // note is folded is a view preference, not something another card or the
  // shell has any reason to know.
  const [noteFolded, setNoteFolded] = useState(false)

  if (isBeforeStart) {
    return (
      <div
        className={`rounded-2xl bg-[#1E2A33]/[0.04] p-3 flex flex-col gap-1 ${big ? "w-full" : ""}`}
      >
        <div className="font-mono text-sm font-bold text-[#1E2A33]/25">
          {date.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
          })}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/20">
          Before project start
        </div>
      </div>
    )
  }

  const { total } = dayBreakdown(entry, slots)
  const metGoal = !ignored && goal > 0 && total >= goal
  // One function decides what a day is; this file only paints it.
  const state = dayState(entry, date, settings, slots, todayKey)
  const goalOutcome = ignored || state === "pending" ? null : state
  const surface = dayStateSurface(goalOutcome, ignored)
  const hasSleep =
    settings?.sleepEnabled === true && (entry?.sleep || []).length > 0
  // Compared as the formatted string, not the raw minutes: what matters is
  // whether the surplus survives rounding to a tenth of an hour.
  const surplus = fmtHours(Math.max(0, total - goal))

  // Editing needs somewhere to write and somewhere to remember what is open;
  // without both, the list stays read-only and clicking a line does nothing
  // special. That is how the day dialog's own copy of the readout behaves.
  const cells = entry?.cells || {}
  const sleep = entry?.sleep || []
  const editing: ReadoutEditing | undefined =
    onUpdateDay && onOpenEntry && onCloseEntry
      ? {
          entryId: editingEntryId ?? null,
          onOpen: onOpenEntry,
          onClose: onCloseEntry,
          // One write, not a move followed by a patch: both would be computed
          // from the same `cells` and the second would discard the first.
          onCancel: () => {
            const snap = editingSnapshot
            if (snap) {
              if (snap.slotId) {
                onUpdateDay({
                  cells: restoreEntry(
                    cells,
                    snap.entry.id,
                    snap.slotId,
                    snap.entry as StudyEntry,
                  ),
                })
              } else {
                onUpdateDay({
                  sleep: restoreSleepEntry(sleep, snap.entry as SleepEntry),
                })
              }
            }
            onCloseEntry()
          },
          onChangeStudy: (slotId, entryId, patch) =>
            onUpdateDay({
              cells: updateEntryInCells(cells, slotId, entryId, patch),
            }),
          onMoveSlot: (fromSlot, entryId, toSlot) =>
            onUpdateDay({
              cells: moveEntryToSlot(cells, fromSlot, entryId, toSlot),
            }),
          onDeleteStudy: (slotId, entryId) =>
            onUpdateDay({ cells: removeEntryFromCells(cells, slotId, entryId) }),
          onChangeSleep: (entryId, patch) =>
            onUpdateDay({ sleep: updateSleepEntry(sleep, entryId, patch) }),
          onDeleteSleep: (entryId) =>
            onUpdateDay({ sleep: removeSleepEntry(sleep, entryId) }),
        }
      : undefined

  return (
    <div
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      // A week card opens the day dialog on click — there is no further
      // drill-down below it, so the whole block is the button. Inside that
      // dialog there is nowhere left to go, and a whole-card target you can
      // hit by aiming slightly wide of an entry is a hazard rather than a
      // shortcut, so the card is inert there and the pencil does the job.
      onClick={onEdit}
      onKeyDown={onEdit ? (e) => e.key === "Enter" && onEdit() : undefined}
      // No outline: white (or goal-tinted) against the page tint is what
      // separates the card. Today is called out by colour and a badge instead
      // of a border, so a card never has two competing emphasis signals.
      className={`${btnBase} text-left w-full rounded-2xl flex flex-col ${
        onEdit ? "hover:shadow-md cursor-pointer" : ""
      } ${big ? "p-5 gap-4" : "p-3 gap-3"} ${
        ignored ? "grayscale opacity-60" : ""
      }`}
      // `outline` rather than a ring: it draws inside the box, follows the
      // radius, and leaves the hover shadow alone.
      style={{
        ...surface,
        ...(isToday
          ? { outline: `2px solid ${ACCENT}`, outlineOffset: "-2px" }
          : {}),
      }}
    >
      {/* The title and every button share one line, with the month underneath.
          They used to be centred against the title-plus-month block, which
          left them floating half a line below the heading they belong to. */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`font-mono font-bold ${big ? "text-2xl" : "text-sm"}`}
              style={isToday ? { color: ACCENT } : undefined}
            >
              {date.toLocaleDateString(
                undefined,
                longDate
                  ? { weekday: "long", day: "numeric", month: "long" }
                  : { weekday: "short", day: "numeric" },
              )}
            </div>
            {titleActions}
          {/* Up here rather than on the note itself: hiding removes the note
              block outright, and a button cannot be the thing that hides
              itself. Absent while the note is open for editing — folding away
              a form you are typing into is never what you meant. */}
          {entry?.comment && !noteEditing && (
            <Tip text={noteFolded ? "Show the day's note" : "Hide the day's note"}>
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  setNoteFolded((v) => !v)
                }}
                className={`${btnBase} p-1 rounded-lg ${
                  noteFolded
                    ? "text-[#1E2A33]/25 hover:text-[#1E2A33]/60"
                    : "text-[#1E2A33]/55 hover:text-[#1E2A33]"
                } hover:bg-[#1E2A33]/10`}
              >
                <MessageSquare size={13} />
              </button>
            </Tip>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isToday && (
            <span
              className="text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: ACCENT }}
            >
              Today
            </span>
          )}
          {state === "frozen" && (
            <Tip text="Streak freeze used — the goal was missed, but the streak held">
              <span
                className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: FREEZE_COLOR }}
              >
                <Snowflake size={10} /> Frozen
              </span>
            </Tip>
          )}
          {ignored && (
            <Tip text="Ignored in statistics">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-[#1E2A33]/60 bg-[#1E2A33]/10 px-1.5 py-0.5 rounded-full">
                <EyeOff size={10} />
              </span>
            </Tip>
          )}
          {/* One badge per unit this day touched, in the unit's own colour,
              showing the day figure. The per-slot breakdown is in its
              tooltip — glanceable first, detailed on ask. */}
          <CounterBadges
            units={counterUnits}
            slots={slots}
            counters={entry?.counters || {}}
            roomy={big}
          />
          {/* The action buttons close the row, always in this order — sleep,
              freeze, counter, add — so each one keeps the same place on every
              day of the week however many badges appear to their left. All of
              them stop the click: the card itself opens the day dialog. */}
          {onQuickAddSleep && (
            <Tip text="Log sleep">
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onQuickAddSleep()
                }}
                className={`${btnBase} p-1 rounded-lg hover:bg-[#1E2A33]/10`}
                style={{ color: SLEEP_COLOR }}
              >
                <Moon size={14} />
              </button>
            </Tip>
          )}
          {canFreeze && onFreeze && (
            <Tip text="Use a streak freeze on this day">
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onFreeze()
                }}
                className={`${btnBase} p-1 rounded-lg hover:bg-[#1E2A33]/10`}
                style={{ color: FREEZE_COLOR }}
              >
                <Snowflake size={14} />
              </button>
            </Tip>
          )}
          {onQuickAddCounter && (
            <Tip text="Add to a counter">
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onQuickAddCounter()
                }}
                className={`${btnBase} p-1 rounded-lg text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
              >
                <Hash size={14} />
              </button>
            </Tip>
          )}
          {onQuickAdd && (
            <Tip text="Add an entry">
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onQuickAdd()
                }}
                // Full-strength accent, not muted ink. It sat at 35% opacity
                // next to a fully saturated sleep icon, which made the more
                // important of the two the harder one to find.
                className={`${btnBase} p-1 rounded-lg hover:bg-[#1E2A33]/10`}
                style={{ color: ACCENT }}
              >
                <Plus size={15} />
              </button>
            </Tip>
          )}
          {/* Set apart by a hairline and a gap. Everything to its left acts on
              the day; this one acts on the window showing it, and the rule is
              the cheapest way to say those are different kinds of thing
              without moving it out of the corner people reach for. */}
          {onClose && (
            <span className="flex items-center pl-2 ml-1 border-l border-[#1E2A33]/15">
              <Tip text="Close">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onClose()
                  }}
                  className={`${btnBase} p-1 rounded-lg text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                >
                  <X size={16} />
                </button>
              </Tip>
            </span>
          )}
          </div>
        </div>
        <div
          className={`${cardTiny(big)} font-mono uppercase tracking-widest text-[#1E2A33]/40`}
        >
          {date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono font-extrabold ${big ? "text-3xl" : "text-lg"}`}
          style={metGoal ? { color: GOAL_MET_COLOR } : undefined}
        >
          {total > 0 ? fmtHours(total) : "—"}
        </span>
        {goal > 0 && (
          <span
            className={`font-mono text-[#1E2A33]/35 ${big ? "text-xs" : "text-[10px]"}`}
          >
            goal {fmtHours(goal)}
            {/* How far there is left to go, or how far past it you got. The
                bare goal told you the target and left the subtraction to you,
                which is the arithmetic this app exists to do.

                Landing exactly on the goal says neither: "(+0h)" is a fact
                about rounding, not about the day, and the total beside it has
                already gone green. */}
            {total < goal ? (
              <> ({fmtHours(goal - total)} left)</>
            ) : surplus !== "0h" ? (
              <span style={{ color: GOAL_MET_COLOR }}> (+{surplus})</span>
            ) : null}
          </span>
        )}
      </div>

      {/* Directly under the total and ahead of everything else the card has to
          say: it describes the day, so it reads before the list — and before
          the empty-day placeholder, which is part of the list's story. */}
      {onUpdateDay && onOpenNote && onCloseNote && (
        <DayNoteRow
          comment={entry?.comment || ""}
          editing={!!noteEditing}
          folded={noteFolded}
          onOpen={onOpenNote}
          onChange={(text) => onUpdateDay({ comment: text })}
          onDelete={() => {
            onUpdateDay({ comment: "" })
            onCloseNote()
          }}
          onCancel={onCancelNote ?? onCloseNote}
          onClose={onCloseNote}
          roomy={big}
        />
      )}

      {/* A day can have sleep and no study — the placeholder is only for a day
          with neither, or the sleep sitting on it would be invisible. */}
      {total === 0 && !hasSleep && (
        <p
          className={`font-mono text-[#1E2A33]/35 ${big ? "text-xs" : "text-[10px]"}`}
        >
          No study logged — tap to add
        </p>
      )}
      <EntriesReadout
        // Remounts when the card-wide toggle flips, which drops the per-entry
        // overrides so the toggle always means what it says.
        key={commentsOpen ? "comments-open" : "comments-closed"}
        slots={slots}
        categories={categories}
        cells={entry?.cells || {}}
        sleep={entry?.sleep || []}
        sleepEnabled={settings?.sleepEnabled === true}
        scrollable={!big}
        surface={surface}
        commentsOpen={commentsOpen}
        roomy={big}
        editing={editing}
        slotCounters={
          onUpdateDay && onOpenCounter && onCloseCounter
            ? {
                units: counterUnits,
                counters: entry?.counters || {},
                openKey: counterEditing ?? null,
                onOpen: onOpenCounter,
                onChange: (counters) => onUpdateDay({ counters }),
                // An undo, like everywhere else on this card: the keystrokes
                // are already written, so cancelling restores the number the
                // row held when it was opened.
                onCancel: onCancelCounter ?? onCloseCounter,
                onClose: onCloseCounter,
              }
            : undefined
        }
      />

      {/* Read-only fallback for a card with no write path — the note still has
          to be visible there, it just cannot be opened. */}
      {!onUpdateDay && entry?.comment && (
        <div className="flex items-start gap-1.5 rounded-xl bg-[#1E2A33]/[0.04] p-2.5">
          <MessageSquare
            size={11}
            className="text-[#1E2A33]/30 shrink-0 mt-0.5"
          />
          <p className="text-[10px] font-mono text-[#1E2A33]/60 whitespace-pre-wrap">
            {entry.comment}
          </p>
        </div>
      )}
    </div>
  )
}

export function FullCardGrid({
  dates,
  days,
  slots,
  categories,
  settings,
  counterUnits,
  todayKey,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
  big,
  commentsOpen = true,
  onQuickAddDay,
  onQuickAddSleepDay,
  onQuickAddCounterDay,
  longDate,
  titleActions,
  onClose,
  canFreezeDay,
  onFreezeDay,
  onUpdateDay,
}: {
  dates: Date[]
  days: Record<DayKey, Day>
  slots: Slot[]
  categories: Category[]
  settings: Settings
  counterUnits: CounterUnit[]
  todayKey: DayKey
  onEditDay?: (key: DayKey) => void
  weekIgnore?: Record<DayKey, boolean>
  monthIgnore?: Record<DayKey, boolean>
  big?: boolean
  commentsOpen?: boolean
  onQuickAddDay?: (key: DayKey) => void
  /** Absent when sleep tracking is off — there is nothing to log. */
  onQuickAddSleepDay?: (key: DayKey) => void
  /** Absent when the project has no counter units to add to. */
  onQuickAddCounterDay?: (key: DayKey) => void
  /** Forwarded to the card — used when the dialog renders a single day. */
  longDate?: boolean
  titleActions?: ReactNode
  onClose?: () => void
  canFreezeDay?: (key: DayKey) => boolean
  onFreezeDay?: (key: DayKey) => void
  /** Enables editing entries in place. Without it the cards are read-only. */
  onUpdateDay?: (key: DayKey, patch: Partial<Day>) => void
}) {
  const startDate = settings.startDate ? fromKey(settings.startDate) : null
  // One open form across the whole row, not one per card. Two forms side by
  // side in a week would both be half-height and neither would look like the
  // thing you were pointing at.
  const [editing, setEditing] = useState<{
    dateKey: DayKey
    entryId: string
    snapshot: EntrySnapshot
  } | null>(null)
  // The day note is its own form but shares the same "only one at a time"
  // rule, and for the same reason: two open forms in a week row are both
  // half-height and neither looks like the thing you pointed at.
  const [editingNote, setEditingNote] = useState<{
    dateKey: DayKey
    original: string
  } | null>(null)
  // Same "only one open at a time" rule. `original` is what Cancel restores —
  // held here rather than in the row because a count dropping to zero unmounts
  // the row, and a snapshot inside it would go with it.
  const [editingCounter, setEditingCounter] = useState<{
    dateKey: DayKey
    slotId: string
    unitId: string
    original: number
  } | null>(null)
  return (
    <div
      className={
        big
          ? "w-full"
          : // Capped at five across: a seven-column row leaves each day too
            // narrow for its entries, so the last two wrap onto a second row.
            "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
      }
    >
      {dates.map((date) => {
        const key = toKey(date)
        const entry = days[key]
        const wk = toKey(startOfWeek(date))
        const mk = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
        const ignored = !!weekIgnore[wk] || !!monthIgnore[mk] || !!entry?.ignore
        return (
          <FullDayCard
            key={key}
            date={date}
            entry={entry}
            slots={slots}
            categories={categories}
            settings={settings}
            counterUnits={counterUnits}
            goal={goalForDate(settings, date)}
            isToday={toKey(date) === todayKey}
            isBeforeStart={startDate ? date < startDate : false}
            ignored={ignored}
            todayKey={todayKey}
            canFreeze={canFreezeDay ? canFreezeDay(key) : false}
            onFreeze={onFreezeDay ? () => onFreezeDay(key) : undefined}
            onEdit={onEditDay ? () => onEditDay(key) : undefined}
            longDate={longDate}
            titleActions={titleActions}
            onClose={onClose}
            onQuickAdd={onQuickAddDay ? () => onQuickAddDay(key) : undefined}
            onQuickAddSleep={
              onQuickAddSleepDay ? () => onQuickAddSleepDay(key) : undefined
            }
            onQuickAddCounter={
              onQuickAddCounterDay ? () => onQuickAddCounterDay(key) : undefined
            }
            big={big}
            commentsOpen={commentsOpen}
            editingEntryId={
              editing?.dateKey === key ? editing.entryId : null
            }
            editingSnapshot={
              editing?.dateKey === key ? editing.snapshot : null
            }
            onOpenEntry={
              onUpdateDay
                ? (entryId, snapshot) => {
                    setEditingNote(null)
                    setEditingCounter(null)
                    setEditing({ dateKey: key, entryId, snapshot })
                  }
                : undefined
            }
            onCloseEntry={onUpdateDay ? () => setEditing(null) : undefined}
            counterEditing={
              editingCounter?.dateKey === key
                ? `${editingCounter.slotId}:${editingCounter.unitId}`
                : null
            }
            onOpenCounter={
              onUpdateDay
                ? (slotId, unitId, original) => {
                    setEditing(null)
                    setEditingNote(null)
                    setEditingCounter({ dateKey: key, slotId, unitId, original })
                  }
                : undefined
            }
            onCancelCounter={
              onUpdateDay
                ? () => {
                    if (editingCounter)
                      onUpdateDay(key, {
                        counters: setSlotCount(
                          days[key]?.counters,
                          editingCounter.unitId,
                          editingCounter.slotId,
                          editingCounter.original,
                        ),
                      })
                    setEditingCounter(null)
                  }
                : undefined
            }
            onCloseCounter={onUpdateDay ? () => setEditingCounter(null) : undefined}
            noteEditing={editingNote?.dateKey === key}
            onOpenNote={
              onUpdateDay
                ? () => {
                    setEditing(null)
                    setEditingCounter(null)
                    setEditingNote({
                      dateKey: key,
                      original: entry?.comment || "",
                    })
                  }
                : undefined
            }
            onCancelNote={
              onUpdateDay
                ? () => {
                    // Write-through again, so cancelling is putting the old
                    // text back rather than dropping an unsaved buffer.
                    onUpdateDay(key, { comment: editingNote?.original ?? "" })
                    setEditingNote(null)
                  }
                : undefined
            }
            onCloseNote={onUpdateDay ? () => setEditingNote(null) : undefined}
            onUpdateDay={
              onUpdateDay ? (patch) => onUpdateDay(key, patch) : undefined
            }
          />
        )
      })}
    </div>
  )
}
