/* ---------------------------------------------------------------
   The list of entries inside a day card.
--------------------------------------------------------------- */

import { useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { MessageSquare, Moon } from "lucide-react"
import type { Category, SleepEntry, Slot, StudyEntry } from "../types/model"
import { getById } from "../lib/id"
import { fmtHours, startedPreviousDay } from "../lib/time"
import { SLEEP_COLOR, btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"

/**
 * A timed entry says both things at once: when it happened and how long it
 * lasted. Reading one off the other in your head is the sort of arithmetic
 * the app exists to save.
 */
const entryTimeLabel = (e: StudyEntry | SleepEntry) =>
  e.start && e.end
    ? `${startedPreviousDay(e) ? "−1d " : ""}${e.start}–${e.end} (${fmtHours(e.minutes)})`
    : `${e.minutes}m`

/**
 * One entry line. The header is the sticky half — while a long comment scrolls
 * past, the time and category it belongs to stay put. The comment folds away
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
  timeLabel,
  icon,
  label,
  comment,
  borderColor,
  sticky,
  surface,
  defaultOpen,
  isLast,
}: {
  timeLabel: string
  icon?: ReactNode
  label?: string
  comment?: string
  borderColor: string
  sticky?: boolean
  surface?: CSSProperties
  defaultOpen?: boolean
  isLast?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const showComment = !!comment && open
  const rail = { borderLeftColor: borderColor }
  const divider = "border-b border-b-[#1E2A33]/10"
  return (
    <>
      <div
        className={`pl-3 border-l-2 pt-1 ${
          showComment ? "" : `pb-1 ${isLast ? "" : divider}`
        } ${sticky ? "sticky top-6 z-[1]" : ""}`}
        style={{ ...rail, ...(sticky ? surface : {}) }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#1E2A33]/70">
          <span className="text-[#1E2A33]/45 shrink-0">{timeLabel}</span>
          {icon}
          {label && (
            <Tip className="truncate" text={label}>
              <span className="truncate">{label}</span>
            </Tip>
          )}
          {comment && (
            <Tip text={!showComment ? "Show comment" : "Hide comment"}>
              <button
                // The whole card is a button that opens the editor, so this one
                // has to keep its click to itself.
                onClick={(ev) => {
                  ev.stopPropagation()
                  setOpen((v) => !v)
                }}
                className={`${btnBase} shrink-0 p-0.5 rounded cursor-pointer hover:text-[#1E2A33] hover:bg-[#1E2A33]/10 ${
                  open ? "text-[#1E2A33]/45" : "text-[#1E2A33]/25"
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
          className={`pl-3 border-l-2 pb-1 ${isLast ? "" : divider}`}
          style={rail}
        >
          <div className="text-[10px] font-mono text-[#1E2A33]/50 italic mt-0.5 whitespace-pre-wrap">
            {comment}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * `wide` spreads the slot groups across columns instead of stacking them —
 * used by the Day view, where the card has the full page width to play with.
 */
export function EntriesReadout({
  slots,
  categories,
  cells,
  sleep = [],
  sleepEnabled = false,
  wide = false,
  scrollable = false,
  surface,
  commentsOpen = true,
}: {
  slots: Slot[]
  categories: Category[]
  cells: Record<string, StudyEntry[]>
  sleep?: SleepEntry[]
  sleepEnabled?: boolean
  wide?: boolean
  scrollable?: boolean
  surface?: CSSProperties
  commentsOpen?: boolean
}) {
  const hasAny = slots.some((s) => (cells[s.id] || []).length > 0)
  // Its own group, never folded into a slot: sleep is a separate axis and must
  // not read as study time.
  const sleepEntries = sleepEnabled ? sleep : []
  const sleepMinutes = sleepEntries.reduce(
    (a, e) => a + (Number(e.minutes) || 0),
    0,
  )
  if (!hasAny && !sleepEntries.length) return null
  // The sticky headers paint the card's own surface, passed down rather than
  // guessed: a day card is white, goal-tinted or greyed, and a sticky row that
  // picked the wrong one would leave text scrolling visibly underneath it.
  const stickyStyle = scrollable ? surface : undefined
  return (
    <div
      className={`${
        wide
          ? "grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-2.5"
      } ${scrollable ? "max-h-64 overflow-y-auto pr-1" : ""}`}
    >
      {/* First, not last. The night belongs to the morning of this day, so it
          comes before the studying that followed it — listed underneath, it
          read as "and then I went to sleep", which is the wrong way round. */}
      {sleepEntries.length > 0 && (
        <div>
          <div
            className={`flex items-center gap-1.5 ${
              scrollable ? "sticky top-0 z-[2] h-6 pb-1 box-border" : "mb-1"
            }`}
            style={stickyStyle}
          >
            <span
              className="text-[9px] font-mono font-bold"
              style={{ color: SLEEP_COLOR }}
            >
              {fmtHours(sleepMinutes)}
            </span>
            <Moon size={10} style={{ color: SLEEP_COLOR }} />
            <span
              className="text-[9px] uppercase tracking-widest font-mono font-bold truncate"
              style={{ color: SLEEP_COLOR }}
            >
              Slept into this day
            </span>
          </div>
          <div>
            {sleepEntries.map((e, i) => (
              <ReadoutEntry
                key={e.id}
                isLast={i === sleepEntries.length - 1}
                timeLabel={entryTimeLabel(e)}
                comment={e.comment}
                borderColor={`${SLEEP_COLOR}30`}
                sticky={scrollable}
                surface={stickyStyle}
                defaultOpen={commentsOpen}
              />
            ))}
          </div>
        </div>
      )}
      {slots.map((slot) => {
        const entries = cells[slot.id] || []
        if (!entries.length) return null
        const slotMinutes = entries.reduce(
          (a, e) => a + (Number(e.minutes) || 0),
          0,
        )
        return (
          <div key={slot.id}>
            <div
              className={`flex items-center gap-1.5 ${
                scrollable
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
                className="text-[9px] font-mono font-bold"
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
                className="text-[9px] uppercase tracking-widest font-mono font-bold"
                style={{ color: slot.color }}
              >
                {slot.label}
              </span>
            </div>
            <div>
              {entries.map((e, i) => {
                const cat = getById(categories, e.category)
                return (
                  <ReadoutEntry
                    key={e.id}
                    isLast={i === entries.length - 1}
                    timeLabel={entryTimeLabel(e)}
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
                    sticky={scrollable}
                    surface={stickyStyle}
                    defaultOpen={commentsOpen}
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
