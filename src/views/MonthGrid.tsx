/* ---------------------------------------------------------------
   Month grid — one rounded block per week, its seven compact day cells
   below a summary strip.
--------------------------------------------------------------- */

import { Award, EyeOff, Moon, Snowflake } from "lucide-react"
import type { Category, Day, DayKey, Settings, Slot } from "../types/model"
import type { PeriodState } from "../lib/freezes"
import {
  fromKey,
  pad,
  startOfWeek,
  toKey,
  toRoman,
} from "../lib/date"
import { fmtHours } from "../lib/time"
import { dayState, periodState } from "../lib/freezes"
import {
  buildTooltip,
  dayBreakdown,
  goalForDate,
  makeIsIgnored,
  rangeStats,
} from "../lib/stats"
import {
  ACCENT,
  EXAM_COLOR,
  FREEZE_COLOR,
  GOAL_MET_COLOR,
  INK,
  SLEEP_COLOR,
  btnBase,
  cellSurface,
  dayStateSurface,
} from "../lib/theme"
import { Tip } from "../ui/Tip"

const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const STATE_COLOR: Record<"met" | "frozen" | "missed", string> = {
  met: GOAL_MET_COLOR,
  frozen: FREEZE_COLOR,
  missed: EXAM_COLOR,
}

const WEEK_DOT_TIP: Record<"met" | "frozen" | "missed", string> = {
  met: "Every day of this week hit its goal",
  frozen: "A day was missed, but a streak freeze covered it",
  missed: "A day was missed with no freeze on it",
}

/**
 * Caption above each week row. No fill of its own — the goal outcome reads as
 * a dot beside the hours, which leaves the rounded corners to the block of
 * days below where they belong.
 */
function WeekSummaryStrip({
  total,
  goal,
  ignored,
  state,
  ordinal,
}: {
  total: number
  goal: number
  ignored: boolean
  /** By days, not by summed hours — see lib/freezes. */
  state: PeriodState
  ordinal: number
}) {
  const met = !ignored && goal > 0 && total >= goal
  const goalOutcome = ignored || state === "pending" ? null : state
  return (
    <div
      className={`flex items-center gap-2 px-1 pb-1 text-[9px] font-mono uppercase tracking-widest ${
        ignored ? "opacity-60" : ""
      }`}
    >
      {/* Everything that describes the week sits on the left, so the eye finds
          the same information in the same place on every row; the rule fills
          whatever is left over. */}
      <span className="text-[#1E2A33]/45 flex items-center gap-1 shrink-0">
        Week {toRoman(ordinal)} {ignored && <EyeOff size={9} />}
      </span>
      <span
        className="font-bold shrink-0"
        style={met ? { color: GOAL_MET_COLOR } : undefined}
      >
        {total > 0 ? fmtHours(total) : "—"}
      </span>
      {goal > 0 && (
        <span className="text-[#1E2A33]/40 shrink-0">of {fmtHours(goal)}</span>
      )}
      {goalOutcome && (
        <Tip text={WEEK_DOT_TIP[goalOutcome]}>
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: STATE_COLOR[goalOutcome] }}
          />
        </Tip>
      )}
      <span className="flex-1 border-b border-dotted border-[#1E2A33]/15" />
    </div>
  )
}

function CompactDayCell({
  date,
  entry,
  slots,
  categories,
  settings,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  ignored,
  todayKey,
  onEdit,
}: {
  date: Date
  entry?: Day
  slots: Slot[]
  categories: Category[]
  settings: Settings
  goal: number
  isToday: boolean
  isFuture: boolean
  isBeforeStart: boolean
  ignored: boolean
  todayKey: DayKey
  onEdit: () => void
}) {
  if (isBeforeStart) {
    return (
      <div
        className="h-16 sm:h-28 flex items-start p-1 sm:p-2 sm:rounded-xl"
        style={cellSurface(`${INK}0A`)}
      >
        <span className="font-mono text-[10px] sm:text-xs text-[#1E2A33]/25">
          {date.getDate()}
        </span>
      </div>
    )
  }

  const { bySlot, total } = dayBreakdown(entry, slots)
  const tooltip = ignored
    ? `${buildTooltip(entry, slots, categories, settings)}\n\nIgnored in statistics`
    : buildTooltip(entry, slots, categories, settings)
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const metGoal = !ignored && goal > 0 && total >= goal
  const state = dayState(entry, date, settings, slots, todayKey)
  const goalOutcome = ignored || state === "pending" ? null : state

  return (
    <Tip text={tooltip} multiline className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => e.key === "Enter" && onEdit()}
        className={`${btnBase} text-left w-full p-1 sm:p-2 h-16 sm:h-28 flex flex-col justify-between sm:rounded-xl hover:brightness-95 sm:hover:shadow-md cursor-pointer ${
          ignored ? "grayscale opacity-60" : ""
        } ${isFuture ? "opacity-50" : ""}`}
        // The goal tint is translucent, so it needs an opaque base of its own.
        // Without one it picked up whatever sat behind the cell — the page on
        // desktop, the seam colour of the phone grid — and the same day came
        // out two different shades on the two layouts.
        style={{
          ...dayStateSurface(goalOutcome, ignored),
          ...(isToday
            ? { outline: `2px solid ${ACCENT}`, outlineOffset: "-2px" }
            : {}),
        }}
      >
        <div className="flex items-start justify-between">
          <span
            className={`font-mono text-xs ${isToday ? "font-extrabold" : ""}`}
            style={isToday ? { color: ACCENT } : undefined}
          >
            {date.getDate()}
          </span>
          <div className="flex items-center gap-1">
            {ignored && <EyeOff size={11} className="text-[#1E2A33]/35" />}
            {state === "frozen" && (
              <Tip text="Streak freeze used">
                <Snowflake size={11} style={{ color: FREEZE_COLOR }} />
              </Tip>
            )}
            {settings?.sleepEnabled === true &&
              (entry?.sleep || []).length > 0 && (
                <Tip text="Sleep logged">
                  <Moon size={11} style={{ color: SLEEP_COLOR }} />
                </Tip>
              )}
            {entry?.exam && examsEnabled && (
              <Tip text="Exam passed">
                <span
                  className="flex items-center justify-center w-4 h-4 rounded-full"
                  style={{ backgroundColor: EXAM_COLOR }}
                >
                  <Award size={10} className="text-white" />
                </span>
              </Tip>
            )}
          </div>
        </div>

        {/* Per-slot minutes need more room than a phone column has; on small
            screens the slots collapse to coloured dots and the hours below
            carry the number. */}
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          {slots.map((s) =>
            bySlot[s.id] > 0 ? (
              <span
                key={s.id}
                className="flex items-center gap-0.5 text-[8px] font-mono font-bold"
                style={{ color: s.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="hidden sm:inline">{bySlot[s.id]}</span>
              </span>
            ) : null,
          )}
          {total === 0 && (
            <span className="text-[8px] font-mono text-[#1E2A33]/25">—</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono text-[#1E2A33]/70">
          <span
            className="truncate"
            style={
              metGoal ? { color: GOAL_MET_COLOR, fontWeight: 700 } : undefined
            }
          >
            {total > 0 ? fmtHours(total) : ""}
            {goal > 0 && (
              <span className="hidden sm:inline text-[#1E2A33]/30">
                /{fmtHours(goal)}
              </span>
            )}
          </span>
          {(entry?.lessons ?? 0) > 0 && lessonsEnabled && (
            <span className="shrink-0">{entry?.lessons}L</span>
          )}
        </div>
      </div>
    </Tip>
  )
}

export function MonthGrid({
  cursor,
  days,
  slots,
  categories,
  settings,
  todayKey,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
}: {
  cursor: Date
  days: Record<DayKey, Day>
  slots: Slot[]
  categories: Category[]
  settings: Settings
  todayKey: DayKey
  onEditDay: (key: DayKey) => void
  weekIgnore?: Record<DayKey, boolean>
  monthIgnore?: Record<DayKey, boolean>
}) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${pad(month + 1)}`
  const monthIgnored = !!monthIgnore[monthKey]

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weekRows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7))

  const startDate = settings.startDate ? fromKey(settings.startDate) : null

  // Each week is its own rounded block — summary strip on top, its seven days
  // below — with breathing room between the weeks. The gaps sit *between*
  // weeks rather than around every cell: a per-cell gap plus inner padding on
  // all four sides is what left no room for seven columns on a phone, while
  // one gap per week costs almost nothing. Inside a week the days are still
  // separated by hairline seams (a 1px grid gap showing the tint through).
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 rounded-xl bg-[#1E2A33]/[0.04] text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/45 text-center">
        {WEEKDAY_HEADS.map((d) => (
          <div key={d} className="py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      {weekRows.map((row, ri) => {
        const { total: wTotal, goal: wGoal } = rangeStats(
          row.filter(Boolean) as Date[],
          days,
          slots,
          settings,
          makeIsIgnored(weekIgnore, monthIgnore),
        )
        const firstDate = row.find(Boolean)
        const weekKey = firstDate ? toKey(startOfWeek(firstDate)) : null
        const weekIgnored =
          monthIgnored || (weekKey ? !!weekIgnore[weekKey] : false)
        // Only the days of this month that fall in the row, so a row split
        // across two months is judged on what it actually shows.
        const weekState = periodState(
          row.filter(Boolean) as Date[],
          days,
          settings,
          slots,
          todayKey,
        )
        return (
          <div key={ri}>
            <WeekSummaryStrip
              total={wTotal}
              goal={wGoal}
              ignored={weekIgnored}
              state={weekState}
              ordinal={ri + 1}
            />
            {/* Phone: one rounded block, days separated by hairline seams —
                there is no width to spare for per-cell gaps. Desktop: real
                gaps and each day rounded on its own. */}
            <div className="grid grid-cols-7 gap-px sm:gap-2 rounded-xl overflow-hidden sm:overflow-visible sm:rounded-none bg-[#1E2A33]/10 sm:bg-transparent">
              {row.map((date, di) => {
                // Days outside the month read as absent on both layouts: on a
                // phone they take the page colour so they sit flush with the
                // background rather than showing as white tiles.
                if (!date)
                  return (
                    <div key={di} className="bg-[#F4F5F7] sm:bg-transparent" />
                  )
                const entry = days[toKey(date)]
                const dayIgnored = weekIgnored || !!entry?.ignore
                return (
                  <CompactDayCell
                    key={toKey(date)}
                    date={date}
                    entry={entry}
                    slots={slots}
                    categories={categories}
                    settings={settings}
                    goal={goalForDate(settings, date)}
                    isToday={toKey(date) === todayKey}
                    isFuture={date > new Date()}
                    isBeforeStart={startDate ? date < startDate : false}
                    ignored={dayIgnored}
                    todayKey={todayKey}
                    onEdit={() => onEditDay(toKey(date))}
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
