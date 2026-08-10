/* ---------------------------------------------------------------
   The log half of the page: the period's heading, its note, and whichever
   shape of day view the period calls for.
--------------------------------------------------------------- */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EyeOff, MessageSquare } from 'lucide-react'
import type { DateRange, PeriodId, Project } from '../types/model'
import {
  addDays,
  datesInRange,
  monthDates,
  pad,
  startOfWeek,
  toKey,
  weekDates,
} from '../lib/date'
import { fmtHours } from '../lib/time'
import { makeIsIgnored, rangeStats } from '../lib/stats'
import { WIDE_PERIODS, rangeLabel } from '../lib/period'
import { EXAM_COLOR, GOAL_MET_COLOR } from '../lib/theme'
import { PopoverMenu } from '../ui/PopoverMenu'
import { MenuToggle } from '../ui/toggles'
import { RenderIcon } from '../ui/icons'
import { Tip } from '../ui/Tip'
import { FullCardGrid } from './DayCards'
import { Heatmap } from './Heatmap'
import { MonthGrid } from './MonthGrid'
import { NoteCard } from './NoteCard'

export function LogView({
  data,
  period,
  range,
  cursor,
  onEditDay,
  onUpdateDayNote,
  onUpdateWeekNote,
  onUpdateMonthNote,
  onUpdateWeekIgnore,
  onUpdateMonthIgnore,
  onQuickAddDay,
  canFreezeDay,
  onFreezeDay,
  sleepSection,
}: {
  data: Project
  period: PeriodId
  range: DateRange
  cursor: Date
  onEditDay: (key: string) => void
  onUpdateDayNote: (key: string, text: string) => void
  onUpdateWeekNote: (key: string, text: string) => void
  onUpdateMonthNote: (key: string, text: string) => void
  onUpdateWeekIgnore: (key: string, next: boolean) => void
  onUpdateMonthIgnore: (key: string, next: boolean) => void
  onQuickAddDay: (key: string) => void
  canFreezeDay?: (key: string) => boolean
  onFreezeDay?: (key: string) => void
  /** The sleep panel, rendered by the shell so it can read the unfiltered
   *  project — sleep has no slots or categories for the filter to act on. */
  sleepSection?: ReactNode
}) {
  const granularity = period
  // Card-wide default for entry comments; each entry can still be folded on
  // its own button, and flipping this resets those.
  const [commentsOpen, setCommentsOpen] = useState(true)
  const {
    slots,
    categories,
    days,
    settings,
    weekNotes = {},
    monthNotes = {},
    weekIgnore = {},
    monthIgnore = {},
  } = data
  const todayKey = toKey(new Date())
  const dayKey = toKey(cursor)
  const weekKey = toKey(startOfWeek(cursor))
  const monthKey = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`

  const visibleDates = useMemo(
    () => datesInRange(range.start, range.end),
    [range.start, range.end],
  )

  const isIgnored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )

  const headerStats = useMemo(() => {
    if (granularity === "week")
      return rangeStats(weekDates(cursor), days, slots, settings, isIgnored)
    if (granularity === "month")
      return rangeStats(monthDates(cursor), days, slots, settings, isIgnored)
    return null
  }, [granularity, cursor, days, slots, settings, isIgnored])

  const monthPast =
    granularity === "month" &&
    toKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) < todayKey
  const weekPast =
    granularity === "week" && toKey(addDays(startOfWeek(cursor), 6)) < todayKey
  const periodIgnored =
    granularity === "week"
      ? !!weekIgnore[weekKey]
      : granularity === "month"
        ? !!monthIgnore[monthKey]
        : false
  const periodGoalOutcome =
    (monthPast || weekPast) &&
    !periodIgnored &&
    headerStats &&
    headerStats.goal > 0
      ? headerStats.total >= headerStats.goal
        ? "met"
        : "missed"
      : null

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {periodIgnored && (
            <Tip text={`This ${granularity} is excluded from every statistic`}>
              <EyeOff size={14} className="text-[#1E2A33]/45" />
            </Tip>
          )}
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-base">
            {rangeLabel(period, cursor, range)}
          </h2>
          {periodGoalOutcome && (
            <Tip
              text={
                periodGoalOutcome === "met"
                  ? `${granularity === "week" ? "Weekly" : "Monthly"} goal met`
                  : `${granularity === "week" ? "Weekly" : "Monthly"} goal missed`
              }
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{
                  backgroundColor:
                    periodGoalOutcome === "met" ? GOAL_MET_COLOR : EXAM_COLOR,
                }}
              />
            </Tip>
          )}
          {headerStats && (
            <span className="text-xs font-mono text-[#1E2A33]/50">
              {headerStats.total > 0 ? fmtHours(headerStats.total) : "0h"}{" "}
              studied
              {headerStats.goal > 0 && (
                <> · goal {fmtHours(headerStats.goal)}</>
              )}
            </span>
          )}
        </div>
        {/* Only weeks and months carry an ignore flag, so the menu appears
            only where there is something in it. */}
        {(granularity === "week" ||
          granularity === "month" ||
          granularity === "day") && (
          <PopoverMenu label={`${granularity} settings`}>
            {granularity !== "day" && (
              <MenuToggle
                label="Ignore in statistics"
                icon={EyeOff}
                hint="Every figure on this page skips it"
                checked={periodIgnored}
                onChange={(next) =>
                  granularity === "week"
                    ? onUpdateWeekIgnore(weekKey, next)
                    : onUpdateMonthIgnore(monthKey, next)
                }
              />
            )}
            <MenuToggle
              label="Show entry comments"
              icon={MessageSquare}
              hint="Each entry can still be folded on its own"
              checked={commentsOpen}
              onChange={setCommentsOpen}
            />
          </PopoverMenu>
        )}
      </div>

      {granularity === "day" && (
        <NoteCard
          key={dayKey}
          label="Day notes"
          icon={MessageSquare}
          value={days[dayKey]?.comment}
          onSave={(text) => onUpdateDayNote(dayKey, text)}
        />
      )}
      {granularity === "week" && (
        <NoteCard
          key={weekKey}
          label="Week notes"
          icon={MessageSquare}
          value={weekNotes[weekKey]}
          onSave={(text) => onUpdateWeekNote(weekKey, text)}
        />
      )}
      {granularity === "month" && (
        <NoteCard
          key={monthKey}
          label="Month notes"
          icon={MessageSquare}
          value={monthNotes[monthKey]}
          onSave={(text) => onUpdateMonthNote(monthKey, text)}
        />
      )}

      {sleepSection}

      {granularity === "month" && (
        <MonthGrid
          cursor={cursor}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
        />
      )}
      {(granularity === "week" || granularity === "day") && (
        <FullCardGrid
          dates={visibleDates}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
          big={granularity === "day"}
          commentsOpen={commentsOpen}
          onQuickAddDay={granularity === "week" ? onQuickAddDay : undefined}
          canFreezeDay={canFreezeDay}
          onFreezeDay={onFreezeDay}
        />
      )}
      {/* Anything longer than a month — including all-time and custom — is
          only legible as a heatmap. */}
      {WIDE_PERIODS.has(granularity) && (
        <Heatmap
          start={range.start}
          end={range.end}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onEditDay}
          isIgnored={isIgnored}
          showMonths
        />
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-wide text-[#1E2A33]/60">
        {slots.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <RenderIcon
              name={s.iconName}
              size={11}
              style={{ color: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
