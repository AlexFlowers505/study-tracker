/* ---------------------------------------------------------------
   The list of entries inside a day card.
--------------------------------------------------------------- */

import { useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import {
  MessageSquare,
  Pause,
  Play,
  Plus,
  Square,
} from "lucide-react"
import type {
  Activity,
  CounterUnit,
  Slot,
  StudyEntry,
} from "../types/model"
import { useT } from "../lib/i18n"
import type { DayCounters } from "../lib/counters"
import { getById } from "../lib/id"
import { fmtHours, nowTime, startedPreviousDay } from "../lib/time"
import { btnBase, cardSmall, cardTiny } from "../lib/theme"
import { EntryTime } from "../ui/EntryTime"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { EntryEditRow } from "./EntryEditRow"
import { SlotCounterRows } from "./SlotCounters"

import { usePalette } from "../ui/useTheme"
import {
  entryActivity,
  isPaused,
  pausePatch,
  pausedMinutes,
  resumePatch,
  stopNowPatch,
} from "../lib/entries"
/** The three controls on a running session, all the same shape. */
const runBtn = (roomy?: boolean) =>
  `${btnBase} shrink-0 flex items-center justify-center p-1 rounded-full ${cardTiny(roomy)}`

/**
 * A timed entry says both things at once: when it happened and how long it
 * lasted. Reading one off the other in your head is the sort of arithmetic
 * the app exists to save.
 *
 * Half a range still says something, so it is shown with an ellipsis for the
 * missing end rather than collapsed to the duration. A session you have
 * started but not finished used to read as a bare "0m", which threw away the
 * one fact it did know.
 *
 * Where a pause sits between the two the sum stops working on its face, so
 * `EntryTime` marks it — see there for why the mark is a star and the figure
 * is a tooltip.
 */
function EntryTimeLabel({
  e,
  className,
}: {
  e: StudyEntry
  className?: string
}) {
  const timed = !!(e.start && e.end)
  const shared = {
    paused: pausedMinutes(e),
    running: isPaused(e),
    className,
  }
  if (!e.start && !e.end)
    return <EntryTime bare duration={`${e.minutes}m`} {...shared} />
  const prefix = startedPreviousDay(e) ? "−1d " : ""
  return (
    <EntryTime
      range={`${prefix}${e.start ?? "…"}–${e.end ?? "…"}`}
      duration={timed ? fmtHours(e.minutes) : `${e.minutes}m`}
      {...shared}
    />
  )
}

/**
 * One entry line. The header is the sticky half — while a long comment scrolls
 * past, the time and activity it belongs to stay put. The comment folds away
 * on its own button, starting from whatever the card-wide toggle says.
 *
 * Header and comment are siblings rather than a wrapped pair on purpose. A
 * sticky element cannot leave its containing block, so with a per-entry
 * wrapper the header was shoved out of view as soon as its own entry ended,
 * and the strip under the slot header filled with the tail of that entry's
 * comment. Flat, each header is pinned until the next one arrives, so a
 * comment never reaches that strip.
 */
function ReadoutEntry({
  entry,
  icon,
  label,
  comment,
  borderColor,
  sticky,
  surface,
  defaultOpen,
  onEdit,
  onEndNow,
  onPause,
  onResume,
  roomy,
}: {
  /** The line's own entry — it draws its time, and the pause mark on it. */
  entry: StudyEntry
  icon?: ReactNode
  label?: string
  comment?: string
  borderColor: string
  sticky?: boolean
  surface?: CSSProperties
  defaultOpen?: boolean
  /** Turns the line into an edit form in place. Absent where that isn't on. */
  onEdit?: () => void
  /**
   * Only for a session with a start and no end. In practice both ends of a
   * timing are set with "now": the start goes in through the add dialog you
   * were opening anyway, but the end catches you mid-stop, and making that a
   * click on the line itself is the whole difference between recording it and
   * meaning to.
   */
  onEndNow?: () => void
  /**
   * The same argument one step further in. Stopping for ten minutes in the
   * middle of a session used to be recorded by splitting the entry in two, or
   * by writing yourself a note to subtract it later — both of which are the
   * app making you do its arithmetic. Exactly one of these two is ever
   * present, and which one says which state the session is in.
   */
  onPause?: () => void
  onResume?: () => void
  roomy?: boolean
}) {
  const c = usePalette()
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const showComment = !!comment && open
  const rail = { borderLeftColor: borderColor }
  return (
    <>
      <div
        role={onEdit ? "button" : undefined}
        tabIndex={onEdit ? 0 : undefined}
        // Stops before the card's own click handler, which opens the day
        // dialog: the point of editing here is not having to go there.
        onClick={
          onEdit
            ? (ev) => {
                ev.stopPropagation()
                onEdit()
              }
            : undefined
        }
        onKeyDown={
          onEdit
            ? (ev) => {
                if (ev.key !== "Enter") return
                ev.stopPropagation()
                onEdit()
              }
            : undefined
        }
        className={`pl-3 border-l-2 pt-1 ${showComment ? "" : "pb-1.5"} ${
          sticky ? "sticky top-6 z-[1]" : ""
        } ${
          onEdit ? "cursor-pointer hover:bg-ink/[0.05] rounded-r" : ""
        }`}
        style={{ ...rail, ...(sticky ? surface : {}) }}
      >
        <div className={`flex items-center gap-1.5 ${cardSmall(roomy)} font-mono text-ink/70`}>
          <EntryTimeLabel e={entry} className="text-ink/45 shrink-0" />
          {/* **Glyphs, not words, and a tooltip each.** There are three of
              them now — pause, resume, stop — and three little pills of
              uppercase type is a sentence to read on a line that already
              carries a time, an activity and sometimes a comment button. The
              icons are the ones every player in the world uses, so nobody has
              to be taught them; the tooltip is there for the one person who
              does.

              **The hold is drawn solid, not circled.** The circled pair was
              the first answer to a real problem — a bare play triangle
              already means *start now* in the add dialog, and a second one
              beside it has to be hovered to be told apart — and it solved it
              at the cost of the thing itself: a glyph inscribed in a ring is
              the same nine pixels with a third of them spent on the ring, and
              at this size the two pause bars all but disappeared. Filling
              says *this one is the state you are in* far louder than a circle
              did, and it costs the drawing nothing. */}
          {onPause && (
            <Tip text={t("Pause this session")}>
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onPause()
                }}
                className={runBtn(roomy)}
                style={{ color: c.warn, backgroundColor: `${c.warn}1F` }}
              >
                <Pause size={10} fill="currentColor" />
              </button>
            </Tip>
          )}
          {onResume && (
            <Tip text={t("Resume this session")}>
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onResume()
                }}
                className={runBtn(roomy)}
                style={{ color: c.accent, backgroundColor: `${c.accent}1F` }}
              >
                <Play size={10} fill="currentColor" />
              </button>
            </Tip>
          )}
          {onEndNow && (
            <Tip text={t("End this session now")}>
              <button
                onClick={(ev) => {
                  ev.stopPropagation()
                  onEndNow()
                }}
                className={runBtn(roomy)}
                style={{ color: c.goalMet, backgroundColor: `${c.goalMet}1F` }}
              >
                <Square size={9} fill="currentColor" />
              </button>
            </Tip>
          )}
          {icon}
          {label && (
            <Tip className="truncate" text={label}>
              <span className="truncate">{label}</span>
            </Tip>
          )}
          {comment && (
            <Tip text={t(!showComment ? "Show comment" : "Hide comment")}>
              <button
                // The whole card is a button that opens the editor, so this one
                // has to keep its click to itself.
                onClick={(ev) => {
                  ev.stopPropagation()
                  setOpen((v) => !v)
                }}
                className={`${btnBase} shrink-0 p-0.5 rounded cursor-pointer hover:text-ink hover:bg-ink/10 ${
                  open ? "text-ink/45" : "text-ink/25"
                }`}
              >
                <MessageSquare size={10} />
              </button>
            </Tip>
          )}
        </div>
      </div>
      {showComment && (
        <div
          className="pl-3 border-l-2 pb-1.5"
          style={rail}
        >
          <div className={`${cardSmall(roomy)} font-mono text-ink/50 italic mt-0.5 whitespace-pre-wrap`}>
            {comment}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * What the row looked like when its form was opened, so Cancel can put it
 * back. Held by the caller rather than the row: moving an entry to another
 * slot re-parents the component, which would remount it and re-snapshot the
 * half-edited state as if it were the original.
 */
export interface EntrySnapshot {
  slotId?: string
  entry: StudyEntry
}

/**
 * Editing an entry without leaving the list. Passed as one object rather than
 * eight props because it is all-or-nothing: the day dialog's own readout is
 * strictly read-only and hands none of it down.
 */
/** Counters recorded against a slot, shown under its heading. */
export interface ReadoutCounters {
  units: CounterUnit[]
  counters: DayCounters
  /** `slotId:unitId` of the row open as a form, if any. */
  openKey: string | null
  onOpen: (slotId: string, unitId: string, original: number) => void
  onChange: (next: DayCounters) => void
  onCancel: () => void
  onClose: () => void
}

export interface ReadoutEditing {
  /** The entry currently open as a form, if any. */
  entryId: string | null
  onOpen: (entryId: string, snapshot: EntrySnapshot) => void
  /** Undo everything since `onOpen`, then close. */
  onCancel: () => void
  onClose: () => void
  onChangeStudy: (
    slotId: string,
    entryId: string,
    patch: Partial<StudyEntry>,
  ) => void
  onMoveSlot: (fromSlot: string, entryId: string, toSlot: string) => void
  onDeleteStudy: (slotId: string, entryId: string) => void
}

export function EntriesReadout({
  slots,
  activities,
  cells,
  scrollable = false,
  surface,
  commentsOpen = true,
  editing,
  slotCounters,
  onSlotAdd,
  roomy,
}: {
  slots: Slot[]
  activities: Activity[]
  cells: Record<string, StudyEntry[]>
  scrollable?: boolean
  surface?: CSSProperties
  commentsOpen?: boolean
  editing?: ReadoutEditing
  slotCounters?: ReadoutCounters
  /**
   * A "+" on each slot heading. Absent on a read-only readout and on a day
   * that has not happened, which is the same rule the card's own buttons
   * follow — the readout never invents a way in that the card withheld.
   */
  onSlotAdd?: (slotId: string) => void
  /** Full-width card — see `cardTiny` / `cardSmall`. */
  roomy?: boolean
}) {
  const hasAny = slots.some((s) => (cells[s.id] || []).length > 0)
  // A slot can hold counters and no sessions — three lessons logged in the
  // morning without a timed entry. The list has to appear for those too, or
  // the count would be invisible outside the day dialog.
  const hasCounters = Object.values(slotCounters?.counters || {}).some((bySlot) =>
    Object.values(bySlot).some((n) => n > 0),
  )
  if (!hasAny && !hasCounters) return null
  // The height cap comes off while a form is open. A week card gives the list
  // 16rem, which is plenty for reading and not enough to edit inside without
  // the comment box and the buttons under it disappearing below the fold.
  const capped = scrollable && !editing?.entryId
  // The sticky headers paint the card's own surface, passed down rather than
  // guessed: a day card is white, goal-tinted or greyed, and a sticky row that
  // picked the wrong one would leave text scrolling visibly underneath it.
  const stickyStyle = capped ? surface : undefined
  return (
    <div
      // Always stacked, never columns. The slots are a sequence — morning
      // then daytime then evening — and side by side that order stops being
      // readable, which is why the wide layout the Day view and the dialog
      // used to get was dropped rather than made responsive.
      className={`space-y-2.5 ${capped ? "max-h-64 overflow-y-auto pr-1" : ""}`}
    >
      {slots.map((slot) => {
        const entries = cells[slot.id] || []
        const slotHasCounters = Object.values(slotCounters?.counters || {}).some(
          (bySlot) => (bySlot[slot.id] || 0) > 0,
        )
        if (!entries.length && !slotHasCounters) return null
        const slotMinutes = entries.reduce(
          (a, e) => a + (Number(e.minutes) || 0),
          0,
        )
        return (
          <div key={slot.id}>
            <div
              className={`flex items-center gap-1.5 ${
                capped
                  ? // A margin here would be transparent, and entries scrolled
                    // visibly through it between the two sticky rows. The gap
                    // has to be padding, inside the painted box, and the height
                    // has to be exact so the entry rows below can offset by it.
                    "sticky top-0 z-[2] h-6 pb-1 box-border"
                  : "mb-1"
              }`}
              style={stickyStyle}
            >
              <span
                className={`${cardTiny(roomy)} font-mono font-bold`}
                style={{ color: slot.color }}
              >
                {fmtHours(slotMinutes)}
              </span>
              <RenderIcon
                name={slot.iconName}
                size={10}
                style={{ color: slot.color }}
              />
              <span
                className={`${cardTiny(roomy)} uppercase tracking-widest font-mono font-bold`}
                style={{ color: slot.color }}
              >
                {slot.label}
              </span>
              {/* Hard right, so it lands in the same place on every slot
                  however long the label is. Adding to the morning is the
                  commonest thing there is, and reaching it used to mean the
                  card's own "+" and then correcting the slot in the dialog. */}
              {onSlotAdd && (
                <span className="ml-auto flex items-center">
                  <Tip text={`Add to ${slot.label}`}>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onSlotAdd(slot.id)
                      }}
                      className={`${btnBase} p-0.5 rounded text-ink/35 hover:text-ink hover:bg-ink/10`}
                    >
                      <Plus size={12} />
                    </button>
                  </Tip>
                </span>
              )}
            </div>
            {/* Under the slot's heading and above its entries: a count
                recorded against the morning describes the morning, so it
                reads before the sessions rather than after them. */}
            {slotCounters && (
              <SlotCounterRows
                units={slotCounters.units}
                counters={slotCounters.counters}
                slotId={slot.id}
                editingUnitId={
                  slotCounters.openKey?.startsWith(`${slot.id}:`)
                    ? slotCounters.openKey.slice(slot.id.length + 1)
                    : null
                }
                onOpen={(unitId, original) =>
                  slotCounters.onOpen(slot.id, unitId, original)
                }
                onChange={slotCounters.onChange}
                onCancel={slotCounters.onCancel}
                onClose={slotCounters.onClose}
                roomy={roomy}
              />
            )}
            <div>
              {entries.map((e) => {
                if (editing?.entryId === e.id) {
                  return (
                    <EntryEditRow
                      key={e.id}
                      entry={e}
                      accent={slot.color}
                      slots={slots}
                      activities={activities}
                      slotId={slot.id}
                      onChange={(patch) =>
                        editing.onChangeStudy(slot.id, e.id, patch)
                      }
                      onMoveSlot={(to) =>
                        editing.onMoveSlot(slot.id, e.id, to)
                      }
                      onDelete={() => {
                        editing.onDeleteStudy(slot.id, e.id)
                        editing.onClose()
                      }}
                      onCancel={editing.onCancel}
                      onClose={editing.onClose}
                    />
                  )
                }
                const cat = getById(activities, entryActivity(e))
                // A session with a beginning and no end yet — the only state
                // in which stopping, pausing and resuming mean anything.
                const running = !!e.start && !e.end
                return (
                  <ReadoutEntry
                    key={e.id}
                    entry={e}
                    icon={
                      <RenderIcon
                        name={cat.iconName}
                        size={9}
                        style={{ color: cat.color }}
                      />
                    }
                    label={cat.label}
                    comment={e.comment}
                    borderColor={`${slot.color}30`}
                    onEndNow={
                      editing && running
                        ? () =>
                            editing.onChangeStudy(
                              slot.id,
                              e.id,
                              stopNowPatch(e, nowTime()),
                            )
                        : undefined
                    }
                    /* Only one of the two is ever handed down, so the line
                       shows the act that is available rather than a pair
                       where one refuses when pressed. */
                    onPause={
                      editing && running && !isPaused(e)
                        ? () =>
                            editing.onChangeStudy(slot.id, e.id, pausePatch())
                        : undefined
                    }
                    onResume={
                      editing && running && isPaused(e)
                        ? () =>
                            editing.onChangeStudy(
                              slot.id,
                              e.id,
                              resumePatch(e),
                            )
                        : undefined
                    }
                    sticky={capped}
                    surface={stickyStyle}
                    defaultOpen={commentsOpen}
                    roomy={roomy}
                    onEdit={
                      editing
                        ? () => editing.onOpen(e.id, { slotId: slot.id, entry: e })
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
