/* ---------------------------------------------------------------
   Full-detail day cards — the Week view's row of them, and the Day view's
   single wide one.
--------------------------------------------------------------- */

import { Award, EyeOff, MessageSquare, Plus, Snowflake } from "lucide-react"
import type { Category, Day, DayKey, Settings, Slot } from "../types/model"
import { fromKey, pad, startOfWeek, toKey } from "../lib/date"
import { fmtHours } from "../lib/time"
import { dayBreakdown, goalForDate } from "../lib/stats"
import { dayState } from "../lib/freezes"
import {
  ACCENT,
  EXAM_COLOR,
  FREEZE_COLOR,
  GOAL_MET_COLOR,
  btnBase,
  dayStateSurface,
} from "../lib/theme"
import { Tip } from "../ui/Tip"
import { EntriesReadout } from "./EntriesReadout"

function FullDayCard({
  date,
  entry,
  slots,
  categories,
  settings,
  goal,
  isToday,
  isBeforeStart,
  ignored,
  todayKey,
  canFreeze,
  onFreeze,
  onEdit,
  onQuickAdd,
  big,
  commentsOpen = true,
}: {
  date: Date
  entry?: Day
  slots: Slot[]
  categories: Category[]
  settings: Settings
  goal: number
  isToday: boolean
  isBeforeStart: boolean
  ignored: boolean
  todayKey: DayKey
  canFreeze?: boolean
  onFreeze?: () => void
  onEdit: () => void
  onQuickAdd?: () => void
  big?: boolean
  commentsOpen?: boolean
}) {
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
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const metGoal = !ignored && goal > 0 && total >= goal
  // One function decides what a day is; this file only paints it.
  const state = dayState(entry, date, settings, slots, todayKey)
  const goalOutcome = ignored || state === "pending" ? null : state
  const surface = dayStateSurface(goalOutcome, ignored)
  const hasSleep =
    settings?.sleepEnabled === true && (entry?.sleep || []).length > 0

  return (
    <div
      role="button"
      tabIndex={0}
      // Both week and day cards open the editor directly on click — there is
      // no further drill-down below them, so the whole block is the button.
      onClick={onEdit}
      onKeyDown={(e) => e.key === "Enter" && onEdit()}
      // No outline: white (or goal-tinted) against the page tint is what
      // separates the card. Today is called out by colour and a badge instead
      // of a border, so a card never has two competing emphasis signals.
      className={`${btnBase} text-left w-full rounded-2xl hover:shadow-md flex flex-col cursor-pointer ${
        big ? "p-5 gap-4" : "p-3 gap-3"
      } ${ignored ? "grayscale opacity-60" : ""}`}
      // `outline` rather than a ring: it draws inside the box, follows the
      // radius, and leaves the hover shadow alone.
      style={{
        ...surface,
        ...(isToday
          ? { outline: `2px solid ${ACCENT}`, outlineOffset: "-2px" }
          : {}),
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className={`font-mono font-bold ${big ? "text-2xl" : "text-sm"}`}
            style={isToday ? { color: ACCENT } : undefined}
          >
            {date.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
            })}
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
            {date.toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
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
          {ignored && (
            <Tip text="Ignored in statistics">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-[#1E2A33]/60 bg-[#1E2A33]/10 px-1.5 py-0.5 rounded-full">
                <EyeOff size={10} />
              </span>
            </Tip>
          )}
          {entry?.exam && examsEnabled && (
            <span
              className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: EXAM_COLOR }}
            >
              <Award size={10} /> Exam
            </span>
          )}
          {(entry?.lessons ?? 0) > 0 && lessonsEnabled && (
            <Tip text="Lessons studied today">
              <span className="text-[9px] uppercase tracking-wide font-mono bg-[#1E2A33]/10 px-1.5 py-0.5 rounded-full">
                {entry?.lessons}L
              </span>
            </Tip>
          )}
          {/* Last in the row on purpose: the badges before it come and go, so
              anchoring the button to the right edge is the only way it lands in
              the same spot on every day of the week. */}
          {onQuickAdd && (
            <Tip text="Add an entry">
              <button
                // The card itself opens the editor, so this has to keep its
                // click from bubbling up to it.
                onClick={(ev) => {
                  ev.stopPropagation()
                  onQuickAdd()
                }}
                className={`${btnBase} p-1 rounded-lg text-[#1E2A33]/35 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
              >
                <Plus size={14} />
              </button>
            </Tip>
          )}
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
          </span>
        )}
      </div>

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
        wide={big}
        scrollable={!big}
        surface={surface}
        commentsOpen={commentsOpen}
      />

      {entry?.comment && (
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
  todayKey,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
  big,
  commentsOpen = true,
  onQuickAddDay,
  canFreezeDay,
  onFreezeDay,
}: {
  dates: Date[]
  days: Record<DayKey, Day>
  slots: Slot[]
  categories: Category[]
  settings: Settings
  todayKey: DayKey
  onEditDay: (key: DayKey) => void
  weekIgnore?: Record<DayKey, boolean>
  monthIgnore?: Record<DayKey, boolean>
  big?: boolean
  commentsOpen?: boolean
  onQuickAddDay?: (key: DayKey) => void
  canFreezeDay?: (key: DayKey) => boolean
  onFreezeDay?: (key: DayKey) => void
}) {
  const startDate = settings.startDate ? fromKey(settings.startDate) : null
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
        const entry = days[toKey(date)]
        const wk = toKey(startOfWeek(date))
        const mk = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
        const ignored = !!weekIgnore[wk] || !!monthIgnore[mk] || !!entry?.ignore
        return (
          <FullDayCard
            key={toKey(date)}
            date={date}
            entry={entry}
            slots={slots}
            categories={categories}
            settings={settings}
            goal={goalForDate(settings, date)}
            isToday={toKey(date) === todayKey}
            isBeforeStart={startDate ? date < startDate : false}
            ignored={ignored}
            todayKey={todayKey}
            canFreeze={canFreezeDay ? canFreezeDay(toKey(date)) : false}
            onFreeze={onFreezeDay ? () => onFreezeDay(toKey(date)) : undefined}
            onEdit={() => onEditDay(toKey(date))}
            onQuickAdd={
              onQuickAddDay ? () => onQuickAddDay(toKey(date)) : undefined
            }
            big={big}
            commentsOpen={commentsOpen}
          />
        )
      })}
    </div>
  )
}
