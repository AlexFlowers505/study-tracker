/* ---------------------------------------------------------------
   Full-detail day cards — the Week view's row of them, and the Day view's
   single wide one.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import {
  EyeOff,
  Maximize2,
  MessageSquare,
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
import { setCheck, splitByKind } from "../lib/checks"
import { dayBreakdown, goalForDate } from "../lib/stats"
import { dayState, isEditableDay } from "../lib/freezes"
import { btnBase, cardTiny, dayStateSurface } from "../lib/theme"
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
import { CheckChips } from "./CheckChips"
import { DayNoteRow } from "./DayNoteRow"
import { EntriesReadout } from "./EntriesReadout"
import type { EntrySnapshot, ReadoutEditing } from "./EntriesReadout"

import { usePalette } from "../ui/useTheme"
function FullDayCard({
  date,
  entry,
  slots,
  categories,
  settings,
  counterUnits,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  ignored,
  todayKey,
  canFreeze,
  onFreeze,
  onEdit,
  onQuickAdd,
  onQuickAddSlot,
  onExpand,
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
  /** Not happened yet: no way in, and the goal is a plan rather than a debt. */
  isFuture: boolean
  isBeforeStart: boolean
  ignored: boolean
  todayKey: DayKey
  canFreeze?: boolean
  onFreeze?: () => void
  onEdit?: () => void
  onQuickAdd?: () => void
  /** The "+" on each slot heading in the readout. */
  onQuickAddSlot?: (slotId: string) => void
  /**
   * Opens this same card in the dialog, with room to work in. Absent there,
   * because it is already as big as it gets.
   */
  onExpand?: () => void
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
  const c = usePalette()
  // Above the early return, as every hook must be. Purely local: which card's
  // note is folded is a view preference, not something another card or the
  // shell has any reason to know.
  const [noteFolded, setNoteFolded] = useState(false)

  if (isBeforeStart) {
    return (
      <div
        className={`rounded-2xl bg-ink/[0.04] p-3 flex flex-col gap-1 ${big ? "w-full" : ""}`}
      >
        <div className="font-mono text-sm font-bold text-ink/25">
          {date.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
          })}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-ink/20">
          Before project start
        </div>
      </div>
    )
  }

  const { tallies: tallyUnits, checks: checkUnits } = splitByKind(counterUnits)
  const { total } = dayBreakdown(entry, slots)
  const metGoal = !ignored && goal > 0 && total >= goal
  // One function decides what a day is; this file only paints it.
  const state = dayState(entry, date, settings, slots, todayKey)
  const goalOutcome = ignored || state === "pending" ? null : state
  const surface = dayStateSurface(c, goalOutcome, ignored)
  const hasSleep =
    settings?.sleepEnabled === true && (entry?.sleep || []).length > 0
  // Straight minute comparison. It used to compare the *formatted* strings,
  // because a surplus under three minutes rounded away to "0h" and printing
  // "(+0h)" said something about rounding rather than about the day. Hours and
  // minutes round to the minute, so there is nothing left to hide behind.
  const surplus = total - goal

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
      // **The card body is not a button.** It used to be — the whole block
      // opened the day dialog — and that was fine while the card was a
      // read-only summary. It is not one now: every entry, counter and note on
      // it edits in place, so a full-card target you can hit by aiming wide of
      // an entry opens a window you did not ask for. The expand button beside
      // the date does that job, and says so.

      // No outline: white (or goal-tinted) against the page tint is what
      // separates the card. Today is called out by colour and a badge instead
      // of a border, so a card never has two competing emphasis signals.
      className={`${btnBase} text-left w-full rounded-2xl flex flex-col ${
        big ? "p-5 gap-4" : "p-3 gap-3"
      } ${
        ignored ? "grayscale opacity-60" : ""
      }`}
      // `outline` rather than a ring: it draws inside the box, follows the
      // radius, and leaves the hover shadow alone.
      style={{
        ...surface,
        ...(isToday
          ? { outline: `2px solid ${c.accent}`, outlineOffset: "-2px" }
          : {}),
      }}
    >
      {/* The title and every button share one line, with the month underneath.
          They used to be centred against the title-plus-month block, which
          left them floating half a line below the heading they belong to.

          One line **while there is room for one**: the row wraps, `ml-auto`
          keeps the actions hard right whether they sit beside the date or on a
          line of their own, and the date itself never shrinks.
          `justify-between` alone let the actions march straight over the date,
          because the date's group was the only shrinkable one and its text
          simply overflowed the box it had been squeezed into.

          What stays here is the day's *status* — Today, Frozen, Ignored — and
          the buttons. The counters moved to their own line under the month:
          they grow with every counter and check defined, and a row that grows
          without bound cannot share space with one that must not wrap. */}
      <div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`font-mono font-bold shrink-0 ${big ? "text-2xl" : "text-sm"}`}
              style={isToday ? { color: c.accent } : undefined}
            >
              {date.toLocaleDateString(
                undefined,
                longDate
                  ? { weekday: "long", day: "numeric", month: "long" }
                  : { weekday: "short", day: "numeric" },
              )}
            </div>
            {onExpand && (
              <Tip text="Open this day in a larger view">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onExpand()
                  }}
                  className={`${btnBase} p-1 rounded-lg text-ink/35 hover:text-ink hover:bg-ink/10 shrink-0`}
                >
                  <Maximize2 size={13} />
                </button>
              </Tip>
            )}
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
                    ? "text-ink/25 hover:text-ink/60"
                    : "text-ink/55 hover:text-ink"
                } hover:bg-ink/10`}
              >
                <MessageSquare size={13} />
              </button>
            </Tip>
          )}
        </div>
        {/* `flex-wrap` here too, so a day carrying several counter badges
            spills onto another line inside its own group rather than pushing
            the group wider than the card. */}
        <div className="flex items-center flex-wrap justify-end gap-1.5 ml-auto min-w-0">
          {isToday && (
            <span
              className="text-[9px] uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: c.accent, color: c.onFill }}
            >
              Today
            </span>
          )}
          {state === "frozen" && (
            <Tip text="Streak freeze used — the goal was missed, but the streak held">
              <span
                className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: c.freeze, color: c.onFill }}
              >
                <Snowflake size={10} /> Frozen
              </span>
            </Tip>
          )}
          {ignored && (
            <Tip text="Ignored in statistics">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-ink/60 bg-ink/10 px-1.5 py-0.5 rounded-full">
                <EyeOff size={10} />
              </span>
            </Tip>
          )}
          {/* The action buttons close the row, always in this order — freeze,
              counter, add — so each one keeps the same place on every day of
              the week however many badges appear to their left. All of them
              stop the click: the card itself opens the day dialog.

              Sleep used to have a moon of its own here. It moved into the "+"
              dialog beside Entry and Counter: with badges, checks, a freeze
              and a note all competing for this line, a second way in was the
              thing the card could least afford — and choosing what you are
              recording belongs inside the thing you are recording it in. */}
          {canFreeze && onFreeze && (
            <Tip text="Use a streak freeze on this day">
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onFreeze()
                }}
                className={`${btnBase} p-1 rounded-lg hover:bg-ink/10`}
                style={{ color: c.freeze }}
              >
                <Snowflake size={14} />
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
                // Full-strength accent, not muted ink: it is the way in to
                // everything the day can gain, and it used to sit at 35%
                // opacity beside a fully saturated sleep icon — the more
                // important of the two being the harder one to find.
                className={`${btnBase} p-1 rounded-lg hover:bg-ink/10`}
                style={{ color: c.accent }}
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
            <span className="flex items-center pl-2 ml-1 border-l border-ink/15">
              <Tip text="Close">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onClose()
                  }}
                  className={`${btnBase} p-1 rounded-lg text-ink/45 hover:text-ink hover:bg-ink/10`}
                >
                  <X size={16} />
                </button>
              </Tip>
            </span>
          )}
          </div>
        </div>
        <div
          className={`${cardTiny(big)} font-mono uppercase tracking-widest text-ink/40`}
        >
          {date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}
        </div>

        {/* What the day counted, on a line of its own under the date.
            It used to sit in the title row beside Today, Frozen and the
            buttons, and that row lost the argument: those are a handful of
            fixed chips, while this grows with every counter and check you
            define, and the two together pushed the date and the "+" onto
            separate lines on a narrow card.

            Left-aligned under the month rather than right with the actions,
            because it is a reading of the day and not a thing you press —
            the same reason the hours sit where they do. */}
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {/* One badge per unit this day touched, in the unit's own colour,
              showing the day figure. The per-slot breakdown is in its
              tooltip — glanceable first, detailed on ask. */}
          <CounterBadges
            units={tallyUnits}
            slots={slots}
            counters={entry?.counters || {}}
            roomy={big}
          />
          {/* Checks sit with the badges rather than in a row of their own:
              they are the same question about the same day, and a second row
              would say they were a different sort of fact. A tally ends in its
              count and a check ends in its mark, which is what tells the two
              apart at a glance. */}
          <CheckChips
            units={checkUnits}
            day={entry}
            dayKey={toKey(date)}
            todayKey={todayKey}
            roomy={big}
            onSet={
              onUpdateDay
                ? (unitId, next) => onUpdateDay(setCheck(entry, unitId, next))
                : undefined
            }
          />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono font-extrabold ${big ? "text-3xl" : "text-lg"}`}
          style={metGoal ? { color: c.goalMet } : undefined}
        >
          {total > 0 ? fmtHours(total) : "—"}
        </span>
        {goal > 0 && (
          <span
            className={`font-mono text-ink/35 ${big ? "text-xs" : "text-[10px]"}`}
          >
            goal {fmtHours(goal)}
            {/* How far there is left to go, or how far past it you got. The
                bare goal told you the target and left the subtraction to you,
                which is the arithmetic this app exists to do.

                Landing exactly on the goal says neither: "(+0h)" is a fact
                about rounding, not about the day, and the total beside it has
                already gone green. */}
            {/* "3h left" on a day that has not started reads as a debt you are
                already behind on. Nothing is owed yet — the number is a plan,
                and saying so is the difference between the two. */}
            {isFuture ? (
              <> (planned)</>
            ) : total < goal ? (
              <> ({fmtHours(goal - total)} left)</>
            ) : surplus > 0 ? (
              <span style={{ color: c.goalMet }}>
                {" "}
                (+{fmtHours(surplus)})
              </span>
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
          className={`font-mono text-ink/35 ${big ? "text-xs" : "text-[10px]"}`}
        >
          {/* "Tap to add" only where tapping adds something. A day that has
              not happened has no way in, so the invitation would be a dead
              end. */}
          No study logged{onEdit || onQuickAdd ? " — tap to add" : ""}
        </p>
      )}
      <EntriesReadout
        onSlotAdd={onQuickAddSlot}
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
                // Tallies only: these rows sit under a slot heading, and a
                // check is a fact about the day rather than about any part of
                // it. A legacy check carrying slot counts would otherwise turn
                // up here with a number field it has no use for.
                units: tallyUnits,
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
        <div className="flex items-start gap-1.5 rounded-xl bg-ink/[0.04] p-2.5">
          <MessageSquare
            size={11}
            className="text-ink/30 shrink-0 mt-0.5"
          />
          <p className="text-[10px] font-mono text-ink/60 whitespace-pre-wrap">
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
  onQuickAddSlotDay,
  onExpandDay,
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
  onQuickAddSlotDay?: (key: DayKey, slotId: string) => void
  /** Absent inside the dialog — the card is already expanded there. */
  onExpandDay?: (key: DayKey) => void
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
          : // Four across, so a week falls 4 + 3 rather than 5 + 2. Seven in a
            // row leaves each day far too narrow for its entries, and 5 + 2
            // left a stranded pair rather than reading as one week.
            "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      }
    >
      {dates.map((date) => {
        const key = toKey(date)
        const entry = days[key]
        const wk = toKey(startOfWeek(date))
        const mk = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
        const ignored = !!weekIgnore[wk] || !!monthIgnore[mk] || !!entry?.ignore
        // Two different kinds of "you cannot write here", and they withhold
        // different things.
        //
        // A day that has not happened yet is inert altogether — even the card
        // click goes, because the dialog behind it is only good for editing.
        //
        // A day that has passed out of the editing window is still worth
        // *reading*: the card opens, the dialog opens, and everything that
        // would change it — the quick-adds, the freeze, editing in place, the
        // note — is simply absent. Writing is withheld rather than disabled for
        // the same reason as ever: a button that refuses when pressed and one
        // that works are both wrong, and an absent one needs no error message.
        const isFuture = key > todayKey
        const locked = !isEditableDay(key, todayKey)
        const editDay = locked ? undefined : onUpdateDay
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
            isFuture={isFuture}
            isBeforeStart={startDate ? date < startDate : false}
            ignored={ignored}
            todayKey={todayKey}
            canFreeze={!locked && canFreezeDay ? canFreezeDay(key) : false}
            onFreeze={
              !locked && onFreezeDay ? () => onFreezeDay(key) : undefined
            }
            onEdit={
              !isFuture && onEditDay ? () => onEditDay(key) : undefined
            }
            onExpand={onExpandDay ? () => onExpandDay(key) : undefined}
            longDate={longDate}
            titleActions={titleActions}
            onClose={onClose}
            onQuickAdd={
              !locked && onQuickAddDay ? () => onQuickAddDay(key) : undefined
            }
            onQuickAddSlot={
              !locked && onQuickAddSlotDay
                ? (slotId) => onQuickAddSlotDay(key, slotId)
                : undefined
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
              editDay
                ? (entryId, snapshot) => {
                    setEditingNote(null)
                    setEditingCounter(null)
                    setEditing({ dateKey: key, entryId, snapshot })
                  }
                : undefined
            }
            onCloseEntry={editDay ? () => setEditing(null) : undefined}
            counterEditing={
              editingCounter?.dateKey === key
                ? `${editingCounter.slotId}:${editingCounter.unitId}`
                : null
            }
            onOpenCounter={
              editDay
                ? (slotId, unitId, original) => {
                    setEditing(null)
                    setEditingNote(null)
                    setEditingCounter({ dateKey: key, slotId, unitId, original })
                  }
                : undefined
            }
            onCancelCounter={
              editDay
                ? () => {
                    if (editingCounter)
                      editDay(key, {
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
            onCloseCounter={editDay ? () => setEditingCounter(null) : undefined}
            noteEditing={editingNote?.dateKey === key}
            onOpenNote={
              editDay
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
              editDay
                ? () => {
                    // Write-through again, so cancelling is putting the old
                    // text back rather than dropping an unsaved buffer.
                    editDay(key, { comment: editingNote?.original ?? "" })
                    setEditingNote(null)
                  }
                : undefined
            }
            onCloseNote={editDay ? () => setEditingNote(null) : undefined}
            onUpdateDay={
              editDay ? (patch) => editDay(key, patch) : undefined
            }
          />
        )
      })}
    </div>
  )
}
